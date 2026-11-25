import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketContext } from "../market-context";
import type { CartDto } from "../medusa/cart";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag }));

// M6 T102 (D120): the express rail's actions. The Medusa modules and the market are stand-ins, as
// in `checkout-handlers.test.ts`: these tests are about what each wallet event checks and what it
// writes to the cart, in which order. Stripe's own part is the live spec's (`stripe-express.spec.ts`).
const getCart = vi.fn();
const moveCart = vi.fn();
const setEmail = vi.fn();
const setAddresses = vi.fn();
const setShippingMethod = vi.fn();
const keepPaymentToken = vi.fn();
const ensurePaymentSession = vi.fn();
const prepareCompletion = vi.fn();
const keepExpressBefore = vi.fn();
const restoreExpressBefore = vi.fn();
vi.mock("../medusa/cart", () => ({
  keepExpressBefore,
  restoreExpressBefore,
  getCart,
  moveCart,
  setEmail,
  setAddresses,
  setShippingMethod,
  keepPaymentToken,
  ensurePaymentSession,
  prepareCompletion,
  initiatePayment: vi.fn(),
  completeCart: vi.fn(),
}));
vi.mock("../medusa/cookies", () => ({ setReceipt: vi.fn() }));
const listShippingOptions = vi.fn();
vi.mock("../medusa/fulfillment", () => ({ listShippingOptions }));
const listPaymentProviders = vi.fn();
vi.mock("../medusa/payment", () => ({
  listPaymentProviders,
  SYSTEM_PAYMENT_PROVIDER: "pp_system_default",
  STRIPE_PAYMENT_PROVIDER: "pp_stripe_stripe",
  paysWithStripe: (providers: readonly string[], total: number) =>
    providers.includes("pp_stripe_stripe") && total > 0,
}));
const getMarketContext = vi.fn();
vi.mock("../market-context", () => ({ getMarketContext }));
vi.mock("../markets", () => ({ mailTarget: () => ({ market: "/de/en", language: "en" }) }));

const {
  expressAddressAction,
  expressConfirmAction,
  expressRateAction,
  expressRestoreAction,
  expressTotalAction,
  splitName,
} = await import("./checkout-express");

const eur = (amount: number) => ({ amount, currencyCode: "eur" });
const cart: CartDto = {
  id: "cart_1",
  regionId: "reg_eu",
  locale: "en-US",
  currencyCode: "eur",
  email: null,
  lines: [{ id: "cali_mug" } as CartDto["lines"][number]],
  itemCount: 1,
  subtotal: eur(20),
  discountTotal: eur(0),
  shippingTotal: null,
  taxTotal: eur(0),
  total: eur(20),
  promoCodes: [],
  shippingMethodIds: [],
  hasShippingAddress: false,
  shippingAddress: null,
  shippingMethod: null,
  paymentProviderId: null,
  paymentToken: null,
  paymentPreview: null,
  completed: false,
};
/** The cart once an option is set: its price in the total. */
const shipped = (option: string, price: number): CartDto => ({
  ...cart,
  shippingMethod: { optionId: option, name: option, amount: eur(price) },
  total: eur(20 + price),
});

const context = {
  market: { key: "en-de", htmlLang: "en", medusaLocale: "en-US" },
  region: { id: "reg_eu", name: "Europe", currencyCode: "eur", countries: ["de", "fr"] },
} as unknown as MarketContext;

const OPTIONS = [
  { id: "so_pickup", name: "Pickup", price: eur(0), pickup: true },
  { id: "so_standard", name: "Standard", price: eur(5), pickup: false },
  { id: "so_express", name: "Express", price: eur(12), pickup: false },
  { id: "so_calculated", name: "Courier", price: null, pickup: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  getMarketContext.mockResolvedValue(context);
  getCart.mockResolvedValue(cart);
  moveCart.mockResolvedValue(cart);
  listShippingOptions.mockResolvedValue(OPTIONS);
  listPaymentProviders.mockResolvedValue(["pp_stripe_stripe", "pp_system_default"]);
  setShippingMethod.mockImplementation(async (id: string) =>
    shipped(id, id === "so_express" ? 12 : 5),
  );
  ensurePaymentSession.mockResolvedValue({ clientSecret: "pi_1_secret_x", intentId: "pi_1" });
});

describe("expressAddressAction (the wallet's address)", () => {
  const address = { market: "en-de", countryCode: "DE", postalCode: "10115", city: "Berlin" };

  it("refuses a country outside the region and writes nothing to the cart", async () => {
    expect(await expressAddressAction({ ...address, countryCode: "US" })).toEqual({
      ok: false,
      errors: { countryCode: "invalid" },
    });
    expect(keepExpressBefore).not.toHaveBeenCalled();
    expect(setAddresses).not.toHaveBeenCalled();
    expect(setShippingMethod).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("keeps the cart's own address and option before the wallet's: fresh on the sheet's first event", async () => {
    const order: string[] = [];
    keepExpressBefore.mockImplementation(async () => void order.push("keepExpressBefore"));
    setAddresses.mockImplementation(async () => void order.push("setAddresses"));
    await expressAddressAction({ ...address, fresh: true });
    expect(keepExpressBefore).toHaveBeenCalledWith(true, "en-US");
    expect(order).toEqual(["keepExpressBefore", "setAddresses"]);
    await expressAddressAction(address);
    expect(keepExpressBefore).toHaveBeenLastCalledWith(false, "en-US");
  });

  it("keeps the partial address without a name or a street, and answers the deliverable options", async () => {
    const answer = await expressAddressAction(address);
    expect(setAddresses).toHaveBeenCalledWith(
      {
        first_name: "",
        last_name: "",
        address_1: "",
        city: "Berlin",
        postal_code: "10115",
        country_code: "de",
      },
      undefined,
      "en-US",
    );
    // A pickup point and an option without a price are not a wallet's; the first is set.
    expect(answer).toEqual({
      ok: true,
      data: {
        rates: [
          { id: "so_standard", name: "Standard", amount: 5 },
          { id: "so_express", name: "Express", amount: 12 },
        ],
        total: 25,
        currency: "eur",
      },
    });
    expect(setShippingMethod).toHaveBeenCalledWith("so_standard", "en-US");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });

  it("puts the cart's own option first and keeps it", async () => {
    moveCart.mockResolvedValue(shipped("so_express", 12));
    const answer = await expressAddressAction(address);
    expect(answer.ok && answer.data.rates.map((rate) => rate.id)).toEqual([
      "so_express",
      "so_standard",
    ]);
    expect(setShippingMethod).toHaveBeenCalledWith("so_express", "en-US");
  });

  it("refuses an address no option delivers to", async () => {
    listShippingOptions.mockResolvedValue([OPTIONS[0]]);
    expect(await expressAddressAction(address)).toEqual({
      ok: false,
      errors: { shippingOption: "invalid" },
    });
    expect(setShippingMethod).not.toHaveBeenCalled();
  });

  it("answers not-found without a cart", async () => {
    getCart.mockResolvedValue(null);
    expect(await expressAddressAction(address)).toMatchObject({ ok: false, form: "not-found" });
  });
});

describe("expressRateAction (the wallet's shipping option)", () => {
  it("sets one of the cart's options and answers the total", async () => {
    expect(await expressRateAction({ market: "en-de", shippingOption: "so_express" })).toEqual({
      ok: true,
      data: { total: 32, currency: "eur" },
    });
    expect(setShippingMethod).toHaveBeenCalledWith("so_express", "en-US");
  });

  it("refuses an option that is not the cart's, or a pickup point", async () => {
    for (const shippingOption of ["so_other", "so_pickup"])
      expect(await expressRateAction({ market: "en-de", shippingOption })).toEqual({
        ok: false,
        errors: { shippingOption: "invalid" },
      });
    expect(setShippingMethod).not.toHaveBeenCalled();
  });
});

describe("splitName", () => {
  it("takes the last word as the last name", () => {
    expect(splitName("  Anna Maria  Papas ")).toEqual({
      firstName: "Anna Maria",
      lastName: "Papas",
    });
  });

  it("uses a one-word name for both", () => {
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "Cher" });
  });
});

describe("expressConfirmAction (the wallet's payment)", () => {
  const payment = {
    market: "en-de",
    email: "Probe@Example.com",
    name: "Anna Papas",
    countryCode: "DE",
    address1: "1 Main St",
    city: "Berlin",
    postalCode: "10115",
    shippingOption: "so_standard",
    confirmationToken: "ctoken_1",
    amount: 2500,
  };

  it("writes the e-mail, the address and the option, keeps the token last and answers the session", async () => {
    const order: string[] = [];
    for (const [name, mock] of Object.entries({
      setEmail,
      setAddresses,
      setShippingMethod,
      keepPaymentToken,
      prepareCompletion,
      ensurePaymentSession,
    }))
      mock.mockImplementationOnce(async (...args: unknown[]) => {
        order.push(name);
        if (name === "setShippingMethod") return shipped(args[0] as string, 5);
        if (name === "ensurePaymentSession")
          return { clientSecret: "pi_1_secret_x", intentId: "pi_1" };
        return undefined;
      });
    expect(await expressConfirmAction(payment)).toEqual({
      ok: true,
      data: { clientSecret: "pi_1_secret_x", intentId: "pi_1" },
    });
    expect(order).toEqual([
      "setEmail",
      "setAddresses",
      "setShippingMethod",
      "keepPaymentToken",
      "prepareCompletion",
      "ensurePaymentSession",
    ]);
    expect(setEmail).toHaveBeenCalledWith("probe@example.com", "en-US");
    expect(setAddresses).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Anna",
        last_name: "Papas",
        address_1: "1 Main St",
        country_code: "de",
      }),
      undefined,
      "en-US",
    );
    expect(keepPaymentToken).toHaveBeenCalledWith("ctoken_1", "en-US");
    expect(ensurePaymentSession).toHaveBeenCalledWith("pp_stripe_stripe", "en-US");
    expect(prepareCompletion).toHaveBeenCalledWith("en-US", {
      market: "/de/en",
      language: "en",
      key: "en-de",
    });
  });

  it("refuses an address outside the region and writes nothing", async () => {
    expect(await expressConfirmAction({ ...payment, countryCode: "US" })).toEqual({
      ok: false,
      errors: { countryCode: "invalid" },
    });
    expect(setEmail).not.toHaveBeenCalled();
    expect(setAddresses).not.toHaveBeenCalled();
    expect(keepPaymentToken).not.toHaveBeenCalled();
  });

  it("refuses an address its country's format refuses (no street)", async () => {
    const { address1: _street, ...noStreet } = payment;
    expect(await expressConfirmAction(noStreet)).toEqual({
      ok: false,
      errors: { address1: "required" },
    });
    expect(keepPaymentToken).not.toHaveBeenCalled();
  });

  it("refuses an option that is not the cart's", async () => {
    expect(await expressConfirmAction({ ...payment, shippingOption: "so_other" })).toEqual({
      ok: false,
      errors: { shippingOption: "invalid" },
    });
    expect(keepPaymentToken).not.toHaveBeenCalled();
  });

  it("answers `changed` when the cart's total is not what the wallet showed, and keeps no token", async () => {
    expect(await expressConfirmAction({ ...payment, amount: 2000 })).toEqual({
      ok: false,
      errors: {},
      form: "rejected",
      reason: "changed",
    });
    expect(keepPaymentToken).not.toHaveBeenCalled();
    expect(ensurePaymentSession).not.toHaveBeenCalled();
  });

  it("refuses when the region does not offer Stripe, and writes nothing", async () => {
    listPaymentProviders.mockResolvedValue(["pp_system_default"]);
    expect(await expressConfirmAction(payment)).toMatchObject({ ok: false, form: "incomplete" });
    expect(setEmail).not.toHaveBeenCalled();
    expect(setAddresses).not.toHaveBeenCalled();
    expect(setShippingMethod).not.toHaveBeenCalled();
    expect(keepPaymentToken).not.toHaveBeenCalled();
  });

  it("refuses a token that is not a ConfirmationToken's id", async () => {
    expect(
      await expressConfirmAction({ ...payment, confirmationToken: "pm_card_visa" }),
    ).toMatchObject({ ok: false, errors: { confirmationToken: "pattern" } });
  });
});

describe("expressTotalAction", () => {
  it("answers the cart's total", async () => {
    expect(await expressTotalAction({ market: "en-de" })).toEqual({
      ok: true,
      data: { total: 20, currency: "eur" },
    });
  });
});

describe("expressRestoreAction (the sheet closed without a payment)", () => {
  it("writes back what the cart had, with only one of its options, and answers the total", async () => {
    restoreExpressBefore.mockImplementation(async (canShip: (id: string) => Promise<boolean>) => {
      expect(await canShip("so_pickup")).toBe(true);
      expect(await canShip("so_other")).toBe(false);
      return shipped("so_pickup", 0);
    });
    expect(await expressRestoreAction({ market: "en-de" })).toEqual({
      ok: true,
      data: { total: 20, currency: "eur" },
    });
    expect(restoreExpressBefore).toHaveBeenCalledWith(expect.any(Function), "en-US");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });
});
