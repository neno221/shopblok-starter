// The account's view models (T53, D64): the order's state and history, the return form, the
// address book and the address form, from DTO fixtures. Each result is parsed with the registry's
// contract where the contract exists, so a mapper that drifts from it fails here.

import {
  AccountPage,
  AddressBook,
  AddressFormState,
  OrderTable,
  ReturnRequest,
} from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto, OrderLineDto, ReturnReasonDto } from "../medusa/orders";
import {
  canReturn,
  latestKind,
  orderEvents,
  toAccountAddressForm,
  toAccountNav,
  toAccountOrder,
  toAddressBook,
  toOrderTable,
  toReturnRequest,
} from "./account";

const eur = (amount: number) => ({ amount, currencyCode: "eur" });
const url = (path: string) => `/us${path}`;

/** A line of 3 bought, with nothing done to it; each test sets what its state has. */
const line = (id: string, fields: Partial<OrderLineDto> = {}): OrderLineDto => ({
  id,
  productHandle: "demo-ceramic-mug",
  variantId: "variant_mug",
  title: "Mug",
  thumbnail: null,
  quantity: 3,
  unitPrice: eur(14),
  total: eur(42),
  fulfilled: 0,
  shipped: 0,
  delivered: 0,
  returnRequested: 0,
  returnReceived: 0,
  ...fields,
});

const address = {
  firstName: "Anna",
  lastName: "Papas",
  company: null,
  address1: "1 Main St",
  address2: null,
  city: "Berlin",
  province: null,
  postalCode: "10115",
  countryCode: "de",
  phone: null,
};

const order = (fields: Partial<OrderDto> = {}): OrderDto => ({
  id: "order_1",
  displayId: 7,
  email: "anna@example.com",
  customerId: "cus_1",
  createdAt: "2026-10-26T10:00:00.000Z",
  updatedAt: "2026-10-26T10:00:00.000Z",
  status: "pending",
  currencyCode: "eur",
  lines: [line("item_1")],
  subtotal: eur(42),
  discountTotal: eur(0),
  shippingTotal: eur(5),
  taxTotal: eur(0),
  total: eur(47),
  shippingAddress: address,
  shippingMethod: { name: "Standard", amount: eur(5) },
  paymentProviderId: "pp_system_default",
  ...fields,
});

/** An order whose one line has `fields` done to it. */
const doing = (fields: Partial<OrderLineDto>, status = "pending") =>
  order({ status, lines: [line("item_1", fields)] });

describe("latestKind (where an order is, as the customer reads it)", () => {
  it("is placed before anything is done", () => {
    expect(latestKind(order())).toBe("placed");
  });

  it("is fulfilled once something is packed, shipped once something is on its way", () => {
    expect(latestKind(doing({ fulfilled: 1 }))).toBe("fulfilled");
    expect(latestKind(doing({ fulfilled: 3, shipped: 1 }))).toBe("shipped");
  });

  it("is delivered only when all of it is, else still shipped", () => {
    expect(latestKind(doing({ fulfilled: 3, shipped: 3, delivered: 3 }))).toBe("delivered");
    expect(latestKind(doing({ fulfilled: 3, shipped: 3, delivered: 2 }))).toBe("shipped");
  });

  it("is return-requested once something is asked back, and returned once something came back", () => {
    expect(latestKind(doing({ fulfilled: 3, delivered: 3, returnRequested: 1 }))).toBe(
      "return-requested",
    );
    expect(latestKind(doing({ fulfilled: 3, delivered: 3, returnReceived: 1 }))).toBe("returned");
    // Returned wins over a return still asked for on another line.
    expect(
      latestKind(
        order({
          lines: [line("item_1", { returnRequested: 1 }), line("item_2", { returnReceived: 1 })],
        }),
      ),
    ).toBe("returned");
  });

  it("is canceled for a canceled order, whatever was done", () => {
    expect(latestKind(doing({ fulfilled: 3, delivered: 3 }, "canceled"))).toBe("canceled");
  });

  it("is placed for an order with no lines", () => {
    expect(latestKind(order({ lines: [] }))).toBe("placed");
  });
});

describe("orderEvents", () => {
  it("is placed alone for an order that is placed", () => {
    expect(orderEvents(order())).toEqual([{ kind: "placed", at: "2026-10-26T10:00:00.000Z" }]);
  });

  it("adds where the order is now, at its last change", () => {
    expect(
      orderEvents({ ...doing({ fulfilled: 1 }), updatedAt: "2026-10-27T09:00:00.000Z" }),
    ).toEqual([
      { kind: "placed", at: "2026-10-26T10:00:00.000Z" },
      { kind: "fulfilled", at: "2026-10-27T09:00:00.000Z" },
    ]);
  });

  it("dates the event at the order's creation when its last change is earlier", () => {
    expect(
      orderEvents({ ...doing({ fulfilled: 1 }), updatedAt: "2026-10-25T09:00:00.000Z" })[1],
    ).toEqual({ kind: "fulfilled", at: "2026-10-26T10:00:00.000Z" });
  });
});

describe("toOrderTable", () => {
  const hrefOf = (each: OrderDto) => `/us/account/orders/${each.id}`;

  it("lists the orders newest first, which parses with the registry's schema", () => {
    const table = toOrderTable(
      [
        order({ id: "order_2", displayId: 8, createdAt: "2026-10-27T10:00:00.000Z" }),
        order({ lines: [line("a", { quantity: 2 }), line("b", { quantity: 1 })] }),
      ],
      hrefOf,
      "/us",
    );
    expect(OrderTable.safeParse(table).error?.issues ?? []).toEqual([]);
    expect(table).toMatchObject({
      shopHref: "/us",
      orders: [
        { id: "order_2", displayId: 8, status: "placed", href: "/us/account/orders/order_2" },
        { id: "order_1", displayId: 7, itemCount: 3, total: { amount: 47, currencyCode: "EUR" } },
      ],
    });
  });

  it("skips an order with no lines", () => {
    const table = toOrderTable([order({ id: "order_2", lines: [] }), order()], hrefOf, "/us");
    expect(table.orders.map((each) => each.id)).toEqual(["order_1"]);
  });
});

describe("canReturn", () => {
  it("is true when some line has something packed that is not asked back", () => {
    expect(canReturn(doing({ fulfilled: 1 }))).toBe(true);
  });

  it("is false before anything is packed, and when all packed is asked back or received back", () => {
    expect(canReturn(order())).toBe(false);
    expect(canReturn(doing({ fulfilled: 2, returnRequested: 1, returnReceived: 1 }))).toBe(false);
  });

  it("is false for a canceled order", () => {
    expect(canReturn(doing({ fulfilled: 3 }, "canceled"))).toBe(false);
  });
});

describe("toAccountOrder", () => {
  const hrefs = { product: (handle: string) => `/us/products/${handle}` };
  const nav = toAccountNav(
    {
      overview: "Overview",
      orders: "Orders",
      addresses: "Addresses",
      paymentMethods: "Payment methods",
      returns: "Returns",
      profile: "Profile",
    } as unknown as Parameters<typeof toAccountNav>[0],
    url,
    "orders",
  );
  const page = (screen: unknown) => AccountPage.safeParse({ variant: "default", nav, screen });

  it("gives the return's href only when something can go back", () => {
    const sent = toAccountOrder(
      doing({ fulfilled: 3, shipped: 3 }),
      hrefs,
      "Pay later",
      "/us/account/orders",
      "/us/account/returns/order_1",
    );
    expect(sent).toMatchObject({ kind: "order", returnHref: "/us/account/returns/order_1" });
    expect(page(sent).error?.issues ?? []).toEqual([]);

    const placed = toAccountOrder(order(), hrefs, "Pay later", "/us/account/orders", "/r");
    expect(placed).not.toBeNull();
    expect(placed).not.toHaveProperty("returnHref");
    expect(page(placed).error?.issues ?? []).toEqual([]);
  });

  it("carries the order's real history", () => {
    const screen = toAccountOrder(
      {
        ...doing({ fulfilled: 3, shipped: 3, delivered: 3 }),
        updatedAt: "2026-10-28T10:00:00.000Z",
      },
      hrefs,
      "Pay later",
      "/us/account/orders",
      "/r",
    );
    expect(screen?.order.events).toEqual([
      { kind: "placed", at: "2026-10-26T10:00:00.000Z" },
      { kind: "delivered", at: "2026-10-28T10:00:00.000Z" },
    ]);
  });

  it("is null for an order without an address", () => {
    expect(
      toAccountOrder(order({ shippingAddress: null }), hrefs, "Pay later", "/b", "/r"),
    ).toBeNull();
  });
});

describe("toReturnRequest", () => {
  const reasons: ReturnReasonDto[] = [
    { id: "rr_damaged", label: "Damaged" },
    { id: "rr_other", label: "Other" },
  ];
  /** Two lines of 3 bought: item_1 has 2 that may go back, item_2 has 1 (one asked back). */
  const shipped = order({
    lines: [
      line("item_1", { fulfilled: 2, shipped: 2 }),
      line("item_2", { fulfilled: 2, shipped: 2, returnRequested: 1 }),
    ],
  });

  it("is the form of an order with something to return, which parses with the registry's schema", () => {
    const request = toReturnRequest(shipped, reasons);
    expect(ReturnRequest.safeParse(request).error?.issues ?? []).toEqual([]);
    expect(request).toMatchObject({
      orderId: "order_1",
      displayId: 7,
      items: [
        { id: "item_1", quantity: 3, returnable: 2, quantityChosen: 0 },
        { id: "item_2", quantity: 3, returnable: 1, quantityChosen: 0 },
      ],
      reasons,
      note: "",
    });
    expect(request).not.toHaveProperty("reason");
  });

  it("is null when nothing may go back, and when the store has no reasons", () => {
    expect(toReturnRequest(order(), reasons)).toBeNull();
    expect(toReturnRequest(doing({ fulfilled: 3 }, "canceled"), reasons)).toBeNull();
    expect(toReturnRequest(shipped, [])).toBeNull();
  });

  it("gives back what a failed submit typed, clamping each quantity to what may go back", () => {
    const request = toReturnRequest(shipped, reasons, {
      reason: "rr_other",
      note: "x".repeat(600),
      quantities: { item_1: 9, item_2: -4 },
    });
    expect(ReturnRequest.safeParse(request).error?.issues ?? []).toEqual([]);
    expect(request?.items.map((each) => each.quantityChosen)).toEqual([2, 0]);
    expect(request?.reason).toBe("rr_other");
    expect(request?.note).toHaveLength(500);
  });

  it("drops a typed reason the store does not have", () => {
    const request = toReturnRequest(shipped, reasons, { reason: "rr_gone", note: "Broke" });
    expect(ReturnRequest.safeParse(request).error?.issues ?? []).toEqual([]);
    expect(request).not.toHaveProperty("reason");
    expect(request?.note).toBe("Broke");
  });
});

describe("toAddressBook", () => {
  const saved = (id: string, fields: Partial<CustomerAddressDto> = {}): CustomerAddressDto => ({
    id,
    ...address,
    isDefaultShipping: false,
    isDefaultBilling: false,
    ...fields,
  });
  const customer = (addresses: CustomerAddressDto[]): CustomerDto => ({
    id: "cus_1",
    email: "anna@example.com",
    firstName: "Anna",
    lastName: "Papas",
    phone: null,
    addresses,
  });

  it("lists each address with the page that edits it, and the page that adds one", () => {
    const book = toAddressBook(customer([saved("addr/1", { isDefaultShipping: true })]), url);
    expect(AddressBook.safeParse(book).error?.issues ?? []).toEqual([]);
    expect(book.addHref).toBe("/us/account/addresses/new");
    expect(book.entries[0]).toMatchObject({
      address: { id: "addr/1", isDefaultShipping: true },
      editHref: "/us/account/addresses/addr%2F1",
    });
    expect(book.entries[0]?.address).not.toHaveProperty("isDefaultBilling");
  });

  it("keeps only one default for shipping and one for billing: the first", () => {
    const book = toAddressBook(
      customer([
        saved("addr_1", { isDefaultShipping: true }),
        saved("addr_2", { isDefaultShipping: true, isDefaultBilling: true }),
        saved("addr_3", { isDefaultBilling: true }),
      ]),
      url,
    );
    expect(AddressBook.safeParse(book).error?.issues ?? []).toEqual([]);
    expect(book.entries.map((entry) => entry.address.isDefaultShipping)).toEqual([
      true,
      undefined,
      undefined,
    ]);
    expect(book.entries.map((entry) => entry.address.isDefaultBilling)).toEqual([
      undefined,
      true,
      undefined,
    ]);
  });
});

describe("toAccountAddressForm", () => {
  const countries = ["cy", "de"];
  const saved: CustomerAddressDto = {
    id: "addr_1",
    ...address,
    isDefaultShipping: true,
    isDefaultBilling: false,
  };

  it("prefers what was typed, over the saved address", () => {
    const state = toAccountAddressForm(countries, saved, { firstName: "Μαρία", countryCode: "cy" });
    expect(AddressFormState.safeParse(state).error?.issues ?? []).toEqual([]);
    expect(state).toEqual({ countries, values: { countryCode: "cy", firstName: "Μαρία" } });
  });

  it("falls back to the saved address, without its defaults", () => {
    const state = toAccountAddressForm(countries, saved, undefined);
    expect(AddressFormState.safeParse(state).error?.issues ?? []).toEqual([]);
    expect(state.values).toMatchObject({ countryCode: "de", firstName: "Anna", city: "Berlin" });
    expect(state.values).not.toHaveProperty("isDefaultShipping");
  });

  it("offers a saved address in a country outside the list in the list's first country", () => {
    const state = toAccountAddressForm(["cy"], saved, undefined);
    expect(AddressFormState.safeParse(state).error?.issues ?? []).toEqual([]);
    expect(state.values).toMatchObject({ countryCode: "cy", firstName: "Anna", city: "Berlin" });
  });

  it("is the market's country for a new address", () => {
    expect(toAccountAddressForm(countries, null, undefined)).toEqual({
      countries,
      values: { countryCode: "cy" },
    });
  });
});
