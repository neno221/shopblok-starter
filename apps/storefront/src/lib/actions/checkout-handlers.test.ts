import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketContext } from "../market-context";
import type { CartAddressDto, CartDto, CompletedCart } from "../medusa/cart";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag }));

// The Medusa modules and the market are stand-ins: these tests are about what the actions check
// and what they write, not about the SDK (the cart's own tests cover that).
const getCart = vi.fn();
const getOrCreateCart = vi.fn();
const setEmail = vi.fn();
const setAddresses = vi.fn();
const setShippingMethod = vi.fn();
const initiatePayment = vi.fn();
const completeCart = vi.fn();
vi.mock("../medusa/cart", () => ({
  getCart,
  getOrCreateCart,
  setEmail,
  setAddresses,
  setShippingMethod,
  initiatePayment,
  completeCart,
}));
const setReceipt = vi.fn();
vi.mock("../medusa/cookies", () => ({ setReceipt }));
const listShippingOptions = vi.fn();
vi.mock("../medusa/fulfillment", () => ({ listShippingOptions }));
const listPaymentProviders = vi.fn();
vi.mock("../medusa/payment", () => ({
  listPaymentProviders,
  SYSTEM_PAYMENT_PROVIDER: "pp_system_default",
}));
const getMarketContext = vi.fn();
vi.mock("../market-context", () => ({ getMarketContext }));

const { addressErrors, contactAction, contactSchema, deliveryAction, placeOrderAction } =
  await import("./checkout-handlers");

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

/** A cart with one line and nothing of the checkout done; each test adds what its step has. */
const emptyCart: CartDto = {
  id: "cart_1",
  regionId: "reg_eu",
  locale: "en-US",
  currencyCode: "eur",
  email: null,
  lines: [{ id: "cali_mug" } as CartDto["lines"][number]],
  itemCount: 1,
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
const contactDone: CartDto = { ...emptyCart, email: "a@example.com", shippingAddress: address };
const deliveryDone: CartDto = {
  ...contactDone,
  shippingMethod: { optionId: "so_standard", name: "Standard", amount: money },
  paymentProviderId: "pp_system_default",
};

const context = {
  market: { key: "en-de", htmlLang: "en", medusaLocale: "en-US" },
  region: { id: "reg_eu", name: "Europe", currencyCode: "eur", countries: ["de", "sg"] },
} as unknown as MarketContext;

const contact = {
  market: "en-de",
  email: "Probe@Example.com",
  countryCode: "de",
  firstName: "Anna",
  lastName: "Papas",
  address1: "1 Main St",
  city: "Berlin",
  postalCode: "10115",
};

/** The address as the handler holds it after the schema: names and street, the rest optional. */
const typed = (fields: Record<string, string>) => contactSchema.parse({ ...contact, ...fields });

beforeEach(() => {
  vi.clearAllMocks();
  getMarketContext.mockResolvedValue(context);
  getCart.mockResolvedValue(emptyCart);
  getOrCreateCart.mockResolvedValue(emptyCart);
  listPaymentProviders.mockResolvedValue(["pp_system_default"]);
  listShippingOptions.mockResolvedValue([{ id: "so_standard", name: "Standard", price: money }]);
});

describe("addressErrors (T34: the country's own format)", () => {
  it("accepts a Singapore address without a city: SG has none", () => {
    const sg = typed({ countryCode: "sg", postalCode: "238858", city: "" });
    expect(addressErrors(sg, ["de", "sg"], "en")).toEqual({});
  });

  it("refuses a German address without a city", () => {
    const de = typed({ city: "" });
    expect(addressErrors(de, ["de", "sg"], "de")).toEqual({ city: "required" });
  });

  it("refuses a postal code that is not the country's pattern", () => {
    const de = typed({ postalCode: "1011" });
    expect(addressErrors(de, ["de", "sg"], "de")).toEqual({ postalCode: "pattern" });
  });

  it("refuses a country outside the region's, before looking at its format", () => {
    const fr = typed({ countryCode: "fr" });
    expect(addressErrors(fr, ["de", "sg"], "en")).toEqual({ countryCode: "invalid" });
  });
});

describe("contactSchema", () => {
  it("keeps the e-mail in lower case, as Medusa stores it", () => {
    expect(contactSchema.parse(contact).email).toBe("probe@example.com");
  });
});

describe("contactAction (step 1)", () => {
  it("answers the field's error and writes nothing to Medusa", async () => {
    expect(await contactAction({ ...contact, city: "" })).toEqual({
      ok: false,
      errors: { city: "required" },
    });
    expect(setEmail).not.toHaveBeenCalled();
    expect(setAddresses).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("writes the lower-case e-mail and the address, and updates the cart tag", async () => {
    expect(await contactAction(contact)).toEqual({ ok: true, data: { step: "delivery" } });
    expect(setEmail).toHaveBeenCalledWith("probe@example.com", "en-US");
    expect(setAddresses).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: "Anna", city: "Berlin", country_code: "de" }),
      undefined,
      "en-US",
    );
    expect(updateTag).toHaveBeenCalledWith("cart");
  });
});

describe("deliveryAction (step 2)", () => {
  const delivery = {
    market: "en-de",
    shippingOption: "so_standard",
    paymentMethod: "pp_system_default",
  };

  it("is incomplete on a cart without an e-mail and an address", async () => {
    expect(await deliveryAction(delivery)).toEqual({ ok: false, errors: {}, form: "incomplete" });
    expect(setShippingMethod).not.toHaveBeenCalled();
  });

  it("refuses an option the cart does not offer, and a payment that is not the system's", async () => {
    getOrCreateCart.mockResolvedValue(contactDone);
    expect(await deliveryAction({ ...delivery, shippingOption: "so_other" })).toEqual({
      ok: false,
      errors: { shippingOption: "invalid" },
    });
    expect(await deliveryAction({ ...delivery, paymentMethod: "pp_stripe" })).toEqual({
      ok: false,
      errors: { paymentMethod: "invalid" },
    });
    expect(setShippingMethod).not.toHaveBeenCalled();
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("sets the method, starts the payment and updates the cart tag", async () => {
    getOrCreateCart.mockResolvedValue(contactDone);
    expect(await deliveryAction(delivery)).toEqual({ ok: true, data: { step: "review" } });
    expect(setShippingMethod).toHaveBeenCalledWith("so_standard", "en-US");
    expect(initiatePayment).toHaveBeenCalledWith("pp_system_default", "en-US");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });
});

describe("placeOrderAction (step 3)", () => {
  it("is incomplete without a shipping method or a payment, and does not complete the cart", async () => {
    for (const cart of [
      contactDone,
      { ...deliveryDone, shippingMethod: null },
      { ...deliveryDone, paymentProviderId: null },
    ]) {
      getOrCreateCart.mockResolvedValue(cart);
      expect(await placeOrderAction({ market: "en-de" })).toEqual({
        ok: false,
        errors: {},
        form: "incomplete",
      });
    }
    expect(completeCart).not.toHaveBeenCalled();
    expect(setReceipt).not.toHaveBeenCalled();
  });

  it("keeps the receipt for the order Medusa placed", async () => {
    getOrCreateCart.mockResolvedValue(deliveryDone);
    completeCart.mockResolvedValue({
      kind: "order",
      orderId: "order_1",
      countryCode: "de",
    } satisfies CompletedCart);
    expect(await placeOrderAction({ market: "en-de" })).toEqual({
      ok: true,
      data: { orderId: "order_1" },
    });
    expect(setReceipt).toHaveBeenCalledWith("order_1");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });

  it("is rejected when Medusa answers with the cart, and keeps no receipt", async () => {
    getOrCreateCart.mockResolvedValue(deliveryDone);
    completeCart.mockResolvedValue({
      kind: "cart",
      error: "out of stock",
      cart: deliveryDone,
    } satisfies CompletedCart);
    expect(await placeOrderAction({ market: "en-de" })).toEqual({
      ok: false,
      errors: {},
      form: "rejected",
    });
    expect(setReceipt).not.toHaveBeenCalled();
  });
});
