import { OrderConfirmationPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import type { CartAddressDto, CartDto } from "../medusa/cart";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto } from "../medusa/orders";
import {
  savedAddressFor,
  canOpen,
  firstOpenStep,
  stepsDone,
  toAddressFormState,
  toOrderConfirmation,
  toReviewStep,
} from "./checkout";

const money = { amount: 0, currencyCode: "eur" };
const address: CartAddressDto = {
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

const empty: CartDto = {
  id: "cart_1",
  regionId: "reg_eu",
  locale: "en-US",
  currencyCode: "eur",
  email: null,
  lines: [],
  itemCount: 0,
  subtotal: money,
  discountTotal: money,
  shippingTotal: null,
  taxTotal: money,
  total: money,
  promoCodes: [],
  shippingMethodIds: [],
  hasShippingAddress: false,
  shippingAddress: null,
  shippingMethod: null,
  paymentProviderId: null,
  completed: false,
};
const contactDone: CartDto = { ...empty, email: "anna@example.com", shippingAddress: address };
const deliveryDone: CartDto = {
  ...contactDone,
  shippingMethod: {
    optionId: "so_standard",
    name: "Standard",
    amount: { amount: 5, currencyCode: "eur" },
  },
  paymentProviderId: "pp_system_default",
};

describe("the steps a cart has done", () => {
  it("knows nothing done on an empty cart, the contact on one with an e-mail and an address, the delivery on one with a method and a payment", () => {
    expect(stepsDone(empty)).toEqual({ contact: false, delivery: false, review: false });
    expect(stepsDone(contactDone)).toEqual({ contact: true, delivery: false, review: false });
    expect(stepsDone(deliveryDone)).toEqual({ contact: true, delivery: true, review: false });
  });

  it("does not count an e-mail alone, nor a delivery without a contact", () => {
    expect(stepsDone({ ...empty, email: "anna@example.com" }).contact).toBe(false);
    expect(
      stepsDone({ ...empty, shippingMethod: deliveryDone.shippingMethod, paymentProviderId: "pp" })
        .delivery,
    ).toBe(false);
  });

  it("sends a shopper to the first step not done", () => {
    expect(firstOpenStep(empty)).toBe("contact");
    expect(firstOpenStep(contactDone)).toBe("delivery");
    expect(firstOpenStep(deliveryDone)).toBe("review");
  });

  it("lets a shopper open a step when every step before it is done", () => {
    expect(
      ["contact", "delivery", "review"].map((step) => canOpen(empty, step as "contact")),
    ).toEqual([true, false, false]);
    expect(
      ["contact", "delivery", "review"].map((step) => canOpen(contactDone, step as "contact")),
    ).toEqual([true, true, false]);
    expect(
      ["contact", "delivery", "review"].map((step) => canOpen(deliveryDone, step as "contact")),
    ).toEqual([true, true, true]);
  });
});

describe("toAddressFormState", () => {
  const countries = ["cy", "de"];

  it("prefers what was typed, over the saved address", () => {
    const state = toAddressFormState(countries, address, {
      firstName: " Μαρία ",
      countryCode: "cy",
      city: "",
    });
    expect(state).toEqual({ countries, values: { countryCode: "cy", firstName: "Μαρία" } });
  });

  it("takes the market's country for a typed country outside the form's", () => {
    expect(toAddressFormState(countries, null, { countryCode: "us", city: "X" }).values).toEqual({
      countryCode: "cy",
      city: "X",
    });
  });

  it("falls back to the saved address, then to the market's country", () => {
    expect(toAddressFormState(countries, address, undefined).values).toMatchObject({
      countryCode: "de",
      firstName: "Anna",
      postalCode: "10115",
    });
    // Nothing typed (an empty record) is the same as undefined.
    expect(toAddressFormState(countries, address, {}).values.city).toBe("Berlin");
    expect(toAddressFormState(countries, null, undefined)).toEqual({
      countries,
      values: { countryCode: "cy" },
    });
    // A saved address in a country the region does not serve is not offered.
    expect(toAddressFormState(["cy"], address, undefined).values).toEqual({ countryCode: "cy" });
  });
});

describe("savedAddressFor (T53)", () => {
  const address = (
    id: string,
    countryCode: string,
    isDefaultShipping = false,
  ): CustomerAddressDto => ({
    id,
    firstName: "Ada",
    lastName: "Lovelace",
    company: null,
    address1: "1 Main Street",
    address2: null,
    city: "Springfield",
    province: null,
    postalCode: null,
    countryCode,
    phone: null,
    isDefaultShipping,
    isDefaultBilling: false,
  });
  const customer = (addresses: CustomerAddressDto[]): CustomerDto => ({
    id: "cus_1",
    email: "ada@example.com",
    firstName: null,
    lastName: null,
    phone: null,
    addresses,
  });

  it("takes the default when the region ships there", () => {
    const book = [address("a", "us"), address("b", "us", true)];
    expect(savedAddressFor(customer(book), ["us"])?.id).toBe("b");
  });

  it("takes the first address the region ships to when the default is elsewhere", () => {
    const book = [address("de", "de", true), address("us", "us")];
    expect(savedAddressFor(customer(book), ["us", "ca"])?.id).toBe("us");
  });

  it("is null when no saved address is in the region", () => {
    expect(savedAddressFor(customer([address("de", "de", true)]), ["us"])).toBeNull();
    expect(savedAddressFor(customer([]), ["us"])).toBeNull();
  });
});

describe("toReviewStep", () => {
  const editHrefs = { contact: "/checkout", delivery: "/checkout/delivery" };

  it("is null while a step before it is not done", () => {
    for (const cart of [
      empty,
      { ...contactDone },
      { ...empty, shippingMethod: deliveryDone.shippingMethod },
    ])
      expect(toReviewStep(cart, "Pay later", editHrefs)).toBeNull();
  });

  it("is the review of a cart whose steps are done, with the system payment by its name", () => {
    expect(toReviewStep(deliveryDone, "Pay later", editHrefs)).toMatchObject({
      kind: "review",
      email: "anna@example.com",
      // The contract writes the currency in upper case.
      shippingMethod: { name: "Standard", price: { amount: 5, currencyCode: "EUR" } },
      payment: { name: "Pay later" },
      editHrefs,
    });
  });
});

describe("toOrderConfirmation", () => {
  const order: OrderDto = {
    id: "order_1",
    displayId: 7,
    email: "anna@example.com",
    customerId: null,
    createdAt: "2026-10-26T10:00:00.000Z",
    updatedAt: "2026-10-26T10:00:00.000Z",
    status: "pending",
    currencyCode: "eur",
    lines: [
      {
        id: "item_1",
        productHandle: "demo-ceramic-mug",
        variantId: "variant_mug",
        title: "Mug",
        thumbnail: null,
        quantity: 2,
        unitPrice: { amount: 14, currencyCode: "eur" },
        total: { amount: 28, currencyCode: "eur" },
        fulfilled: 0,
        shipped: 0,
        delivered: 0,
        returnRequested: 0,
        returnReceived: 0,
      },
    ],
    subtotal: { amount: 28, currencyCode: "eur" },
    discountTotal: money,
    shippingTotal: { amount: 5, currencyCode: "eur" },
    taxTotal: money,
    total: { amount: 33, currencyCode: "eur" },
    shippingAddress: address,
    shippingMethod: { name: "Standard", amount: { amount: 5, currencyCode: "eur" } },
    paymentProviderId: "pp_system_default",
  };
  const hrefs = { product: (handle: string) => `/products/${handle}` };

  it("is the receipt page, which parses with the registry's schema", () => {
    const page = toOrderConfirmation(order, hrefs, "Pay later", "/");
    expect(OrderConfirmationPage.safeParse(page).error?.issues ?? []).toEqual([]);
    expect(page).toMatchObject({
      order: { id: "order_1", payment: { name: "Pay later" } },
      summary: { itemCount: 2 },
      continueHref: "/",
    });
    expect(page?.order.lines[0]?.href).toBe("/products/demo-ceramic-mug");
  });

  it("is null for an order without an address", () => {
    expect(
      toOrderConfirmation({ ...order, shippingAddress: null }, hrefs, "Pay later", "/"),
    ).toBeNull();
  });
});
