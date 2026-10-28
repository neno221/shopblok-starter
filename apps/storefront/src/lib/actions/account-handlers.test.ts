// The account's actions (D64, T53): what each checks before it writes (the customer's own address
// ids and orders, the region's countries, the return's quantities and reason) and what it writes
// to Medusa. The Medusa modules (`customer`, `orders`) are `vi.fn()` stand-ins, the market context
// is a fixed one with the countries de and sg, and `getCustomer` is what `action()` reads the
// signed-in customer with: `null` is a visitor. Nothing here touches the network or cookies.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketContext } from "../market-context";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto, OrderLineDto } from "../medusa/orders";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }));

// The Medusa modules and the market are stand-ins: these tests are about what the account's
// actions check before they write, and what they write, not about the SDK (the data layer's own
// tests cover that). `getCustomer` is what `action({ auth: "customer" })` reads the customer
// with; `MedusaRequestError` and `returnableOf` are the real ones.
const getCustomer = vi.fn();
const addAddress = vi.fn();
const updateAddress = vi.fn();
const deleteAddress = vi.fn();
const updateCustomer = vi.fn();
vi.mock("../medusa/customer", () => ({
  getCustomer,
  addAddress,
  updateAddress,
  deleteAddress,
  updateCustomer,
}));
const getOrder = vi.fn();
const listReturnReasons = vi.fn();
const createCustomerReturn = vi.fn();
const claimOrder = vi.fn();
const acceptOrderTransfer = vi.fn();
const declineOrderTransfer = vi.fn();
vi.mock("../medusa/orders", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("../medusa/orders")),
  getOrder,
  listReturnReasons,
  createCustomerReturn,
  claimOrder,
  acceptOrderTransfer,
  declineOrderTransfer,
}));
const getMarketContext = vi.fn();
vi.mock("../market-context", () => ({ getMarketContext }));
const MAIL = vi.hoisted(() => ({ market: "/de", language: "en" }));
vi.mock("../markets", () => ({ mailTarget: () => MAIL }));

const { MedusaRequestError } = await import("../medusa/sdk");
const {
  claimOrderAction,
  defaultAddressAction,
  removeAddressAction,
  requestReturnAction,
  saveAddressAction,
  saveProfileAction,
  transferAction,
} = await import("./account-handlers");

const context = {
  market: { key: "en-de", htmlLang: "en", medusaLocale: "en-US" },
  map: {},
  region: { id: "reg_eu", name: "Europe", currencyCode: "eur", countries: ["de", "sg"] },
} as unknown as MarketContext;

const saved: CustomerAddressDto = {
  id: "addr_1",
  firstName: "Anna",
  lastName: "Papas",
  company: "Papas GmbH",
  address1: "1 Main St",
  address2: "Floor 2",
  city: "Berlin",
  province: null,
  postalCode: "10115",
  countryCode: "de",
  phone: "+49 30 1234",
  isDefaultShipping: false,
  isDefaultBilling: false,
};
const customer: CustomerDto = {
  id: "cus_1",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Papas",
  phone: null,
  addresses: [saved],
};

const money = { amount: 0, currencyCode: "eur" };
/** A line of 3 bought, 2 packed and none asked back: 2 may go back. */
const line = (id: string, fields: Partial<OrderLineDto> = {}): OrderLineDto => ({
  id,
  productHandle: null,
  variantId: null,
  title: id,
  thumbnail: null,
  quantity: 3,
  unitPrice: money,
  total: money,
  fulfilled: 2,
  shipped: 2,
  delivered: 2,
  returnRequested: 0,
  returnReceived: 0,
  ...fields,
});
const order = {
  id: "order_1",
  displayId: 7,
  customerId: "cus_1",
  status: "completed",
  lines: [line("item_1"), line("item_2")],
} as unknown as OrderDto;

const form = {
  market: "en-de",
  countryCode: "de",
  firstName: "Anna",
  lastName: "Papas",
  address1: "1 Main St",
  city: "Berlin",
  postalCode: "10115",
};

beforeEach(() => {
  vi.clearAllMocks();
  getMarketContext.mockResolvedValue(context);
  getCustomer.mockResolvedValue(customer);
  getOrder.mockResolvedValue(order);
  listReturnReasons.mockResolvedValue([
    { id: "rr_damaged", label: "Damaged" },
    { id: "rr_other", label: "Other" },
  ]);
  acceptOrderTransfer.mockResolvedValue(true);
  declineOrderTransfer.mockResolvedValue(true);
});

describe("saveProfileAction", () => {
  const profile = { market: "en-de", firstName: "Anna", lastName: "Papas", phone: "+49 30 1" };

  it("needs both names and writes nothing without them", async () => {
    expect(await saveProfileAction({ ...profile, firstName: " " })).toEqual({
      ok: false,
      errors: { firstName: "required" },
    });
    expect(await saveProfileAction({ ...profile, lastName: "" })).toEqual({
      ok: false,
      errors: { lastName: "required" },
    });
    expect(updateCustomer).not.toHaveBeenCalled();
  });

  it("saves the names and the phone", async () => {
    expect(await saveProfileAction(profile)).toEqual({ ok: true, data: { saved: true } });
    expect(updateCustomer).toHaveBeenCalledWith({
      first_name: "Anna",
      last_name: "Papas",
      phone: "+49 30 1",
    });
  });

  it("sends an empty phone as an empty string, which clears it", async () => {
    await saveProfileAction({ ...profile, phone: "  " });
    expect(updateCustomer).toHaveBeenCalledWith({
      first_name: "Anna",
      last_name: "Papas",
      phone: "",
    });
  });
});

describe("saveAddressAction", () => {
  it("refuses an address id that is not the customer's, and writes nothing", async () => {
    expect(await saveAddressAction({ ...form, addressId: "addr_other" })).toMatchObject({
      ok: false,
      errors: {},
      form: "not-found",
    });
    expect(addAddress).not.toHaveBeenCalled();
    expect(updateAddress).not.toHaveBeenCalled();
  });

  it("refuses a country outside the region's", async () => {
    expect(await saveAddressAction({ ...form, countryCode: "fr" })).toEqual({
      ok: false,
      errors: { countryCode: "invalid" },
    });
    expect(addAddress).not.toHaveBeenCalled();
  });

  it("refuses an address missing a field its country needs", async () => {
    expect(await saveAddressAction({ ...form, city: "" })).toEqual({
      ok: false,
      errors: { city: "required" },
    });
    expect(addAddress).not.toHaveBeenCalled();
  });

  it("adds a new address that is not the default for shipping", async () => {
    expect(await saveAddressAction(form)).toEqual({ ok: true, data: { saved: true } });
    expect(addAddress).toHaveBeenCalledTimes(1);
    expect(addAddress).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: "Anna", city: "Berlin", country_code: "de" }),
    );
    expect(addAddress.mock.calls[0]?.[0]).not.toHaveProperty("is_default_shipping");
    expect(updateAddress).not.toHaveBeenCalled();
  });

  it('makes a new address the default for shipping only when isDefaultShipping is "true"', async () => {
    await saveAddressAction({ ...form, isDefaultShipping: "true" });
    expect(addAddress).toHaveBeenCalledWith(expect.objectContaining({ is_default_shipping: true }));

    addAddress.mockClear();
    expect(await saveAddressAction({ ...form, isDefaultShipping: "on" })).toMatchObject({
      ok: false,
    });
    expect(addAddress).not.toHaveBeenCalled();
  });

  it("changes one of the customer's, sending the fields the form cleared as empty strings", async () => {
    expect(await saveAddressAction({ ...form, addressId: "addr_1" })).toEqual({
      ok: true,
      data: { saved: true },
    });
    expect(addAddress).not.toHaveBeenCalled();
    const [id, sent] = updateAddress.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe("addr_1");
    expect(sent).toMatchObject({ first_name: "Anna", city: "Berlin", postal_code: "10115" });
    // The form left company, address 2 and the phone out: Medusa would keep them if not told.
    expect(sent).toMatchObject({ company: "", address_2: "", province: "", phone: "" });
    // The box was not ticked (an unticked box is not posted): no longer the default.
    expect(sent).toMatchObject({ is_default_shipping: false });
  });

  it("keeps a changed address the default when the box is ticked", async () => {
    await saveAddressAction({ ...form, addressId: "addr_1", isDefaultShipping: "true" });
    expect(updateAddress.mock.calls[0]?.[1]).toMatchObject({ is_default_shipping: true });
  });
});

describe("removeAddressAction and defaultAddressAction (ownership)", () => {
  it("removes one of the customer's addresses", async () => {
    expect(await removeAddressAction({ market: "en-de", addressId: "addr_1" })).toEqual({
      ok: true,
      data: { removed: true },
    });
    expect(deleteAddress).toHaveBeenCalledWith("addr_1");
  });

  it("makes one of the customer's addresses the default for shipping", async () => {
    expect(await defaultAddressAction({ market: "en-de", addressId: "addr_1" })).toEqual({
      ok: true,
      data: { saved: true },
    });
    expect(updateAddress).toHaveBeenCalledWith("addr_1", { is_default_shipping: true });
  });

  it("answers not-found for another customer's id, and writes nothing", async () => {
    const other = { market: "en-de", addressId: "addr_other" };
    expect(await removeAddressAction(other)).toMatchObject({ ok: false, form: "not-found" });
    expect(await defaultAddressAction(other)).toMatchObject({ ok: false, form: "not-found" });
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(updateAddress).not.toHaveBeenCalled();
  });

  it("answers unauthorized when nobody is signed in, and writes nothing", async () => {
    getCustomer.mockResolvedValue(null);
    const own = { market: "en-de", addressId: "addr_1" };
    expect(await removeAddressAction(own)).toEqual({ ok: false, errors: {}, form: "unauthorized" });
    expect(await defaultAddressAction(own)).toEqual({
      ok: false,
      errors: {},
      form: "unauthorized",
    });
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(updateAddress).not.toHaveBeenCalled();
  });
});

describe("requestReturnAction", () => {
  const request = {
    market: "en-de",
    orderId: "order_1",
    reason: "rr_damaged",
    note: "Broke in the post",
    "items.item_1": "1",
    "items.item_2": "0",
  };

  it("answers not-found for an order that is not the customer's (getOrder: null)", async () => {
    getOrder.mockResolvedValue(null);
    expect(await requestReturnAction(request)).toMatchObject({ ok: false, form: "not-found" });
    expect(createCustomerReturn).not.toHaveBeenCalled();
  });

  it("needs a quantity above zero on some line", async () => {
    expect(await requestReturnAction({ ...request, "items.item_1": "0" })).toEqual({
      ok: false,
      errors: { items: "required" },
    });
    expect(createCustomerReturn).not.toHaveBeenCalled();
  });

  it("needs a reason the store has", async () => {
    expect(await requestReturnAction({ ...request, reason: "rr_unknown" })).toEqual({
      ok: false,
      errors: { reason: "required" },
    });
    expect(createCustomerReturn).not.toHaveBeenCalled();
  });

  it("refuses more than may still go back, and a line the order does not have", async () => {
    // 2 were packed, 1 is asked back already: 1 may go.
    getOrder.mockResolvedValue({
      ...order,
      lines: [line("item_1", { returnRequested: 1 }), line("item_2")],
    });
    expect(await requestReturnAction({ ...request, "items.item_1": "2" })).toEqual({
      ok: false,
      errors: { items: "required" },
    });
    expect(await requestReturnAction({ ...request, "items.item_9": "1" })).toEqual({
      ok: false,
      errors: { items: "required" },
    });
    expect(createCustomerReturn).not.toHaveBeenCalled();
  });

  it("refuses a quantity that is not a whole number", async () => {
    expect(await requestReturnAction({ ...request, "items.item_1": "1.5" })).toEqual({
      ok: false,
      errors: { items: "invalid" },
    });
    expect(createCustomerReturn).not.toHaveBeenCalled();
  });

  it("sends the chosen lines only, with the reason and the note", async () => {
    expect(await requestReturnAction({ ...request, "items.item_2": "2" })).toEqual({
      ok: true,
      data: { sent: true },
    });
    expect(createCustomerReturn).toHaveBeenCalledWith({
      orderId: "order_1",
      items: [
        { id: "item_1", quantity: 1 },
        { id: "item_2", quantity: 2 },
      ],
      reasonId: "rr_damaged",
      note: "Broke in the post",
    });
    expect(getOrder).toHaveBeenCalledWith("order_1", "en-US");
  });

  it("leaves the note out when there is none", async () => {
    await requestReturnAction({ ...request, note: "" });
    expect(createCustomerReturn).toHaveBeenCalledWith({
      orderId: "order_1",
      items: [{ id: "item_1", quantity: 1 }],
      reasonId: "rr_damaged",
    });
  });
});

describe("claimOrderAction", () => {
  const claim = { market: "en-de", number: "#1042", email: " Anna@Example.COM " };

  it("claims the number without its #, with the lower-case e-mail and the market's prefix", async () => {
    expect(await claimOrderAction(claim)).toEqual({ ok: true, data: { sent: true } });
    expect(claimOrder).toHaveBeenCalledWith(1042, "anna@example.com", MAIL);
  });

  it("refuses a number that is not one", async () => {
    expect(await claimOrderAction({ ...claim, number: "10x" })).toMatchObject({
      ok: false,
      errors: { number: "pattern" },
    });
    expect(claimOrder).not.toHaveBeenCalled();
  });

  it("answers sent when Medusa knows no such order (404), so it tells nobody which exist", async () => {
    claimOrder.mockRejectedValue(new MedusaRequestError("no order", "rejected", 404));
    expect(await claimOrderAction(claim)).toEqual({ ok: true, data: { sent: true } });
  });

  it("answers sent for any other refusal too (a transfer already open, another account's order)", async () => {
    for (const status of [400, 403, 409]) {
      claimOrder.mockRejectedValue(new MedusaRequestError("refused", "rejected", status));
      expect(await claimOrderAction(claim)).toEqual({ ok: true, data: { sent: true } });
    }
  });

  it("answers unauthorized when the session ended (401), not sent", async () => {
    claimOrder.mockRejectedValue(new MedusaRequestError("no session", "rejected", 401));
    expect(await claimOrderAction(claim)).toMatchObject({ ok: false, form: "unauthorized" });
  });

  it('answers rejected with the reason "mine" for an order that is the customer\'s already (422)', async () => {
    claimOrder.mockRejectedValue(new MedusaRequestError("already yours", "rejected", 422));
    expect(await claimOrderAction(claim)).toEqual({
      ok: false,
      errors: {},
      form: "rejected",
      reason: "mine",
    });
  });

  it("answers unavailable when Medusa does not answer", async () => {
    claimOrder.mockRejectedValue(new MedusaRequestError("down", "unreachable"));
    expect(await claimOrderAction(claim)).toMatchObject({ ok: false, form: "unavailable" });
  });
});

describe("transferAction", () => {
  const transfer = { market: "en-de", orderId: "order_1", token: "tok" };

  it("maps accept to accepted and decline to declined", async () => {
    expect(await transferAction({ ...transfer, decision: "accept" })).toEqual({
      ok: true,
      data: { outcome: "accepted" },
    });
    expect(acceptOrderTransfer).toHaveBeenCalledWith("order_1", "tok");
    expect(declineOrderTransfer).not.toHaveBeenCalled();
    expect(await transferAction({ ...transfer, decision: "decline" })).toEqual({
      ok: true,
      data: { outcome: "declined" },
    });
    expect(declineOrderTransfer).toHaveBeenCalledWith("order_1", "tok");
  });

  it("answers failed when Medusa does not take the answer", async () => {
    acceptOrderTransfer.mockResolvedValue(false);
    declineOrderTransfer.mockResolvedValue(false);
    expect(await transferAction({ ...transfer, decision: "accept" })).toEqual({
      ok: true,
      data: { outcome: "failed" },
    });
    expect(await transferAction({ ...transfer, decision: "decline" })).toEqual({
      ok: true,
      data: { outcome: "failed" },
    });
  });

  it("needs a decision it knows", async () => {
    expect(await transferAction({ ...transfer, decision: "maybe" })).toMatchObject({
      ok: false,
      errors: { decision: "invalid" },
    });
  });
});
