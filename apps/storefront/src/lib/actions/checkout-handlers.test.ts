import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketContext } from "../market-context";
import type { CartAddressDto, CartDto, CompletedCart } from "../medusa/cart";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag }));

// The Medusa modules and the market are stand-ins: these tests are about what the actions check
// and what they write, not about the SDK (the cart's own tests cover that).
const getCart = vi.fn();
const moveCart = vi.fn();
const setEmail = vi.fn();
const setAddresses = vi.fn();
const setShippingMethod = vi.fn();
const initiatePayment = vi.fn();
const completeCart = vi.fn();
const keepPaymentToken = vi.fn();
const keepSavedMethod = vi.fn();
const ensurePaymentSession = vi.fn();
const prepareCompletion = vi.fn();
const forgetKeptPayment = vi.fn();
vi.mock("../medusa/cart", () => ({
  prepareCompletion,
  forgetKeptPayment,
  keepPaymentToken,
  keepSavedMethod,
  ensurePaymentSession,
  // The real rule: the kept saved method, or saving, is what the session asks for (D119).
  sessionDataOf: (cart: CartDto) =>
    cart.savedMethod !== null
      ? { payment_method: cart.savedMethod }
      : cart.paymentSave
        ? { setup_future_usage: "off_session" }
        : {},
  getCart,
  moveCart,
  setEmail,
  setAddresses,
  setShippingMethod,
  initiatePayment,
  completeCart,
}));
const setReceipt = vi.fn();
vi.mock("../medusa/cookies", () => ({ setReceipt }));
// The signed-in customer, if any (PR 142 review, item 2: a saved method is only theirs to pay with).
const getCustomer = vi.fn();
vi.mock("../medusa/customer", () => ({ getCustomer }));
const listShippingOptions = vi.fn();
vi.mock("../medusa/fulfillment", () => ({ listShippingOptions }));
const listPaymentProviders = vi.fn();
vi.mock("../medusa/payment", () => ({
  listPaymentProviders,
  SYSTEM_PAYMENT_PROVIDER: "pp_system_default",
  STRIPE_PAYMENT_PROVIDER: "pp_stripe_stripe",
  // The real rule without the publishable key: the region offers Stripe and there is a total.
  paysWithStripe: (providers: readonly string[], total: number) =>
    providers.includes("pp_stripe_stripe") && total > 0,
}));
const getMarketContext = vi.fn();
vi.mock("../market-context", () => ({ getMarketContext }));
// The market's prefix and language for the order's e-mails (T99): the URL module's own tests cover it.
const mailTarget = vi.fn(() => ({ market: "/de/en", language: "en" }));
vi.mock("../markets", () => ({ mailTarget }));

const {
  addressErrors,
  contactAction,
  contactSchema,
  deliveryAction,
  keepFormatFields,
  placeOrderAction,
  preparePaymentAction,
} = await import("./checkout-handlers");

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
  paymentToken: null,
  paymentPreview: null,
  savedMethod: null,
  paymentSave: false,
  customerId: null,
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
  moveCart.mockResolvedValue(emptyCart);
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

describe("keepFormatFields", () => {
  it("upper-cases the postal code, which the pattern matched in any case (PR 80 review, item 2)", () => {
    const kept = keepFormatFields(
      { countryCode: "gb", address1: "1 High St", city: "London", postalCode: "ec1y 8sy" },
      "en-GB",
    );
    expect(kept.postalCode).toBe("EC1Y 8SY");
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
    moveCart.mockResolvedValue(contactDone);
    expect(await deliveryAction({ ...delivery, shippingOption: "so_other" })).toEqual({
      ok: false,
      errors: { shippingOption: "invalid" },
    });
    expect(await deliveryAction({ ...delivery, paymentMethod: "pp_stripe_stripe" })).toEqual({
      ok: false,
      errors: { paymentMethod: "invalid" },
    });
    expect(setShippingMethod).not.toHaveBeenCalled();
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("sets the method, starts the payment and updates the cart tag", async () => {
    moveCart.mockResolvedValue(contactDone);
    setShippingMethod.mockResolvedValue(contactDone);
    expect(await deliveryAction(delivery)).toEqual({ ok: true, data: { step: "review" } });
    expect(setShippingMethod).toHaveBeenCalledWith("so_standard", "en-US");
    expect(initiatePayment).toHaveBeenCalledWith("pp_system_default", "en-US");
    expect(keepPaymentToken).not.toHaveBeenCalled();
    expect(updateTag).toHaveBeenCalledWith("cart");
  });

  describe("with Stripe (M6 D117)", () => {
    const owed = { ...contactDone, total: { amount: 25, currencyCode: "eur" } };
    const stripe = {
      ...delivery,
      paymentMethod: "pp_stripe_stripe",
      confirmationToken: "ctoken_1",
    };
    beforeEach(() => {
      listPaymentProviders.mockResolvedValue(["pp_stripe_stripe", "pp_system_default"]);
      moveCart.mockResolvedValue(owed);
      setShippingMethod.mockResolvedValue(owed);
      keepPaymentToken.mockResolvedValue({ preview: null, save: false });
    });

    it("keeps the token, then initiates the Stripe session last, after the shipping", async () => {
      expect(await deliveryAction(stripe)).toEqual({ ok: true, data: { step: "review" } });
      expect(keepPaymentToken).toHaveBeenCalledWith("ctoken_1", "en-US");
      expect(initiatePayment).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {});
      const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
        fn.mock.invocationCallOrder[0] ?? 0;
      expect(order(setShippingMethod)).toBeLessThan(order(keepPaymentToken));
      expect(order(keepPaymentToken)).toBeLessThan(order(initiatePayment));
    });

    it("starts a session that saves the method when the token saves it (D119)", async () => {
      keepPaymentToken.mockResolvedValue({ preview: null, save: true });
      expect(await deliveryAction(stripe)).toEqual({ ok: true, data: { step: "review" } });
      expect(initiatePayment).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {
        setup_future_usage: "off_session",
      });
    });

    it("keeps a saved method instead of a token, and starts its session with it (D119)", async () => {
      const saved = { ...delivery, paymentMethod: "pm_card1" };
      expect(await deliveryAction(saved)).toEqual({ ok: true, data: { step: "review" } });
      expect(keepSavedMethod).toHaveBeenCalledWith("pm_card1", "en-US");
      expect(keepPaymentToken).not.toHaveBeenCalled();
      expect(initiatePayment).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {
        payment_method: "pm_card1",
      });
    });

    it("refuses a saved method when nothing is left to pay, and one that is not a pm_ id", async () => {
      setShippingMethod.mockResolvedValue(contactDone);
      expect(await deliveryAction({ ...delivery, paymentMethod: "pm_card1" })).toEqual({
        ok: false,
        errors: { paymentMethod: "invalid" },
      });
      expect(await deliveryAction({ ...delivery, paymentMethod: "pm_bad-id" })).toEqual({
        ok: false,
        errors: { paymentMethod: "invalid" },
      });
      expect(keepSavedMethod).not.toHaveBeenCalled();
    });

    it("needs a token, and refuses Pay later on a total to pay", async () => {
      expect(await deliveryAction({ ...stripe, confirmationToken: undefined })).toEqual({
        ok: false,
        errors: { paymentMethod: "required" },
      });
      expect(await deliveryAction(delivery)).toEqual({
        ok: false,
        errors: { paymentMethod: "invalid" },
      });
      expect(initiatePayment).not.toHaveBeenCalled();
    });

    it("takes Pay later when the shipping leaves nothing to pay", async () => {
      setShippingMethod.mockResolvedValue(contactDone);
      expect(await deliveryAction(delivery)).toEqual({ ok: true, data: { step: "review" } });
      expect(initiatePayment).toHaveBeenCalledWith("pp_system_default", "en-US");
      expect(await deliveryAction(stripe)).toEqual({
        ok: false,
        errors: { paymentMethod: "invalid" },
      });
    });
  });
});

describe("preparePaymentAction (step 3, M6 D117)", () => {
  const ready: CartDto = {
    ...deliveryDone,
    total: { amount: 25, currencyCode: "eur" },
    paymentProviderId: "pp_stripe_stripe",
    paymentToken: "ctoken_1",
    customerId: "cus_1",
  };
  beforeEach(() => {
    getCustomer.mockResolvedValue({ id: "cus_1" });
    listPaymentProviders.mockResolvedValue(["pp_stripe_stripe", "pp_system_default"]);
    ensurePaymentSession.mockResolvedValue({
      clientSecret: "pi_1_secret_x",
      intentId: "pi_1",
      amount: 25,
    });
  });

  it("answers the session for the current total and the kept token", async () => {
    moveCart.mockResolvedValue(ready);
    expect(await preparePaymentAction({ market: "en-de" })).toEqual({
      ok: true,
      data: { clientSecret: "pi_1_secret_x", intentId: "pi_1", confirmationToken: "ctoken_1" },
    });
    expect(ensurePaymentSession).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {});
    expect(prepareCompletion).toHaveBeenCalledWith("en-US", {
      market: "/de/en",
      language: "en",
      key: "en-de",
    });
    const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
      fn.mock.invocationCallOrder[0] ?? 0;
    expect(order(prepareCompletion)).toBeLessThan(order(ensurePaymentSession));
  });

  it("asks the session for the saved method and answers no token for it (D119)", async () => {
    moveCart.mockResolvedValue({ ...ready, paymentToken: null, savedMethod: "pm_card1" });
    expect(await preparePaymentAction({ market: "en-de" })).toEqual({
      ok: true,
      data: { clientSecret: "pi_1_secret_x", intentId: "pi_1", confirmationToken: null },
    });
    expect(ensurePaymentSession).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {
      payment_method: "pm_card1",
    });
  });

  it("asks the session to save the method when the kept token saves it (D119)", async () => {
    moveCart.mockResolvedValue({ ...ready, paymentSave: true });
    await preparePaymentAction({ market: "en-de" });
    expect(ensurePaymentSession).toHaveBeenCalledWith("pp_stripe_stripe", "en-US", {
      setup_future_usage: "off_session",
    });
  });

  it.each([
    ["signed out (the session lapsed)", null],
    ["another customer", { id: "cus_2" }],
  ])(
    "forgets a saved method, or saving, and goes back to the payment when %s (PR 142 review, item 2)",
    async (_who, customer) => {
      getCustomer.mockResolvedValue(customer);
      for (const cart of [
        { ...ready, paymentToken: null, savedMethod: "pm_card1" },
        { ...ready, paymentSave: true },
      ]) {
        moveCart.mockResolvedValue(cart);
        expect(await preparePaymentAction({ market: "en-de" })).toEqual({
          ok: false,
          errors: {},
          form: "incomplete",
        });
      }
      expect(forgetKeptPayment).toHaveBeenCalledTimes(2);
      expect(forgetKeptPayment).toHaveBeenCalledWith("en-US");
      expect(ensurePaymentSession).not.toHaveBeenCalled();
      expect(prepareCompletion).not.toHaveBeenCalled();
    },
  );

  it("takes a plain token from whoever holds the cart, without asking who is signed in", async () => {
    getCustomer.mockResolvedValue(null);
    moveCart.mockResolvedValue({ ...ready, customerId: null });
    expect(await preparePaymentAction({ market: "en-de" })).toMatchObject({ ok: true });
    expect(getCustomer).not.toHaveBeenCalled();
    expect(forgetKeptPayment).not.toHaveBeenCalled();
  });

  it("is incomplete without a kept token, or with nothing to pay", async () => {
    for (const cart of [
      { ...ready, paymentToken: null },
      { ...ready, total: money },
    ]) {
      moveCart.mockResolvedValue(cart);
      expect(await preparePaymentAction({ market: "en-de" })).toEqual({
        ok: false,
        errors: {},
        form: "incomplete",
      });
    }
    expect(ensurePaymentSession).not.toHaveBeenCalled();
  });
});

describe("placeOrderAction (step 3)", () => {
  it("is incomplete without a shipping method or a payment, and does not complete the cart", async () => {
    for (const cart of [
      contactDone,
      { ...deliveryDone, shippingMethod: null },
      { ...deliveryDone, paymentProviderId: null },
    ]) {
      moveCart.mockResolvedValue(cart);
      expect(await placeOrderAction({ market: "en-de" })).toEqual({
        ok: false,
        errors: {},
        form: "incomplete",
      });
    }
    expect(completeCart).not.toHaveBeenCalled();
    expect(setReceipt).not.toHaveBeenCalled();
  });

  it("stores the market and language of the order's e-mails on the cart before placing it (T99)", async () => {
    moveCart.mockResolvedValue(deliveryDone);
    completeCart.mockResolvedValue({ kind: "order", orderId: "order_1", countryCode: "de" });
    await placeOrderAction({ market: "en-de" });
    expect(completeCart).toHaveBeenCalledWith("en-US", {
      market: "/de/en",
      language: "en",
      key: "en-de",
    });
  });

  it("keeps the receipt for the order Medusa placed", async () => {
    moveCart.mockResolvedValue(deliveryDone);
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
    moveCart.mockResolvedValue(deliveryDone);
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
