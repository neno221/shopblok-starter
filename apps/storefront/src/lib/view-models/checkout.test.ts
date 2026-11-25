import { OrderConfirmationPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import type { CartAddressDto, CartDto } from "../medusa/cart";
import type { CustomerAddressDto, CustomerDto } from "../medusa/customer";
import type { OrderDto } from "../medusa/orders";
import {
  savedAddressFor,
  canOpen,
  firstOpenStep,
  ownsKeptPayment,
  stepsDone,
  toAddressFormState,
  toOrderConfirmation,
  toPaymentStep,
  toReviewStep,
  toSavedPaymentMethods,
  withoutKeptPayment,
} from "./checkout";
import type { SavedMethodDto } from "../medusa/payment-methods";

const names = { system: "Pay later", stripe: "Pay online" };
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
  paymentToken: null,
  paymentPreview: null,
  savedMethod: null,
  paymentSave: false,
  customerId: null,
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

  it("counts a kept Stripe token as the payment once Medusa deleted the session (M6 D117)", () => {
    const moved = { ...deliveryDone, paymentProviderId: null };
    expect(stepsDone(moved).delivery).toBe(false);
    expect(stepsDone({ ...moved, paymentToken: "ctoken_1" }).delivery).toBe(true);
    expect(stepsDone({ ...moved, savedMethod: "pm_card1" }).delivery).toBe(true);
  });

  it("keeps a saved method, or saving, for the cart's own signed-in customer only (PR 142 review, item 2)", () => {
    const saved: CartDto = {
      ...deliveryDone,
      paymentProviderId: "pp_stripe_stripe",
      savedMethod: "pm_card1",
      customerId: "cus_1",
    };
    const saving: CartDto = {
      ...saved,
      savedMethod: null,
      paymentToken: "ctoken_1",
      paymentSave: true,
    };
    for (const cart of [saved, saving]) {
      expect(ownsKeptPayment(cart, "cus_1")).toBe(true);
      expect(ownsKeptPayment(cart, "cus_2")).toBe(false);
      expect(ownsKeptPayment(cart, null)).toBe(false);
      expect(ownsKeptPayment({ ...cart, customerId: null }, null)).toBe(false);
      // Drawn as if no payment was kept: the review is closed, the payment step opens.
      const shown = withoutKeptPayment(cart);
      expect(firstOpenStep(shown)).toBe("delivery");
      expect(shown).toMatchObject({ savedMethod: null, paymentSave: false, paymentToken: null });
    }
    // A plain token, or the system payment, is whoever holds the cart's.
    const token: CartDto = { ...saved, savedMethod: null, paymentToken: "ctoken_1" };
    expect(ownsKeptPayment(token, null)).toBe(true);
    expect(ownsKeptPayment(deliveryDone, null)).toBe(true);
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

describe("the saved payment methods (M6 D119, T101)", () => {
  const card: SavedMethodDto = {
    id: "pm_visa",
    type: "card",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2030,
    wallet: null,
  };
  const revolut: SavedMethodDto = {
    id: "pm_revolut",
    type: "revolut_pay",
    brand: null,
    last4: null,
    expiryMonth: null,
    expiryYear: null,
    wallet: null,
  };

  it("draws every saved card (another brand as a plain card) and Revolut Pay by its name", () => {
    expect(
      toSavedPaymentMethods([
        card,
        { ...card, id: "pm_amex", brand: "amex" },
        { ...card, id: "pm_discover", brand: "discover", last4: "1117" },
        { ...card, id: "pm_nobrand", brand: null },
        { ...card, id: "pm_nodigits", last4: null },
        revolut,
      ]),
    ).toEqual([
      {
        id: "pm_visa",
        brand: "visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: false,
      },
      {
        id: "pm_amex",
        brand: "americanexpress",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: false,
      },
      {
        id: "pm_discover",
        brand: "card",
        last4: "1117",
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: false,
      },
      {
        id: "pm_nobrand",
        brand: "card",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: false,
      },
      { kind: "revolut_pay", id: "pm_revolut", isDefault: false },
    ]);
  });

  it("offers saved methods and saving only when given, choosing the Element otherwise", () => {
    expect(toPaymentStep()).toMatchObject({
      saved: [],
      methods: [],
      selected: "pp_system_default",
      canSave: false,
    });
    expect(toPaymentStep("Pay online")).toMatchObject({
      saved: [],
      selected: "pp_stripe_stripe",
      canSave: false,
      saveForLater: false,
    });
    const saved = toSavedPaymentMethods([card]);
    expect(
      toPaymentStep("Pay online", {
        saved,
        canSave: true,
        saveForLater: true,
        selected: "pm_visa",
      }),
    ).toMatchObject({ saved, selected: "pm_visa", canSave: true, saveForLater: true });
    // A choice that is not one of the customer's methods falls back on the Element.
    expect(
      toPaymentStep("Pay online", {
        saved,
        canSave: true,
        saveForLater: false,
        selected: "pm_other",
      }),
    ).toMatchObject({ selected: "pp_stripe_stripe" });
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
      expect(toReviewStep(cart, names, editHrefs)).toBeNull();
  });

  it("is the review of a cart whose steps are done, with the system payment by its name", () => {
    expect(toReviewStep(deliveryDone, names, editHrefs)).toMatchObject({
      kind: "review",
      email: "anna@example.com",
      // The contract writes the currency in upper case.
      shippingMethod: { name: "Standard", price: { amount: 5, currencyCode: "EUR" } },
      payment: { name: names.system },
      editHrefs,
    });
  });

  it("shows the kept token's card when Medusa deleted the Stripe session (PR 140 review, item 2)", () => {
    const refreshed: CartDto = {
      ...deliveryDone,
      paymentProviderId: null,
      paymentToken: "ctoken_1",
      paymentPreview: { type: "card", brand: "visa", last4: "4242" },
    };
    expect(toReviewStep(refreshed, names, editHrefs)?.payment).toEqual({
      brand: "visa",
      last4: "4242",
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
    paymentPreview: null,
  };
  const hrefs = { product: (handle: string) => `/products/${handle}` };

  it("is the receipt page, which parses with the registry's schema", () => {
    const page = toOrderConfirmation(order, hrefs, names, "/");
    expect(OrderConfirmationPage.safeParse(page).error?.issues ?? []).toEqual([]);
    expect(page).toMatchObject({
      order: { id: "order_1", payment: { name: names.system } },
      summary: { itemCount: 2 },
      continueHref: "/",
    });
    expect(page?.order.lines[0]?.href).toBe("/products/demo-ceramic-mug");
  });

  it("is null for an order without an address", () => {
    expect(toOrderConfirmation({ ...order, shippingAddress: null }, hrefs, names, "/")).toBeNull();
  });
});
