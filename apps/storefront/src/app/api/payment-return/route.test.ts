import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as IntentModule from "../../../lib/stripe/intent";

// M6 D117 (T100): the return from Stripe. The cart, the flash, the cookies and Stripe's answer are
// stand-ins: these tests are about what the route completes and where it sends the shopper.
const getMarketContext = vi.fn();
vi.mock("../../../lib/market-context", () => ({ getMarketContext }));
vi.mock("../../../lib/markets", () => ({
  mailTarget: () => ({ market: "/de/en", language: "en" }),
}));
const completeCart = vi.fn();
const readCartPayment = vi.fn();
vi.mock("../../../lib/medusa/cart", () => ({ completeCart, readCartPayment }));
const setReceipt = vi.fn();
vi.mock("../../../lib/medusa/cookies", () => ({ setReceipt }));
const leaveFlash = vi.fn(async () => "key1");
vi.mock("../../../lib/flash", () => ({ leaveFlash }));
const stripePublishableKey = vi.fn(() => "pk_test_x" as string | null);
vi.mock("../../../lib/medusa/payment", () => ({
  STRIPE_PAYMENT_PROVIDER: "pp_stripe_stripe",
  stripePublishableKey,
}));
const readIntent = vi.fn();
vi.mock("../../../lib/stripe/intent", async (actual) => ({
  ...(await actual<typeof IntentModule>()),
  readIntent,
}));

const { GET } = await import("./route");

const context = {
  market: { key: "en-de", htmlLang: "en", medusaLocale: "en-US" },
  map: {},
  url: (path: string) => `/de/en${path}`,
};

const back = (query: string) =>
  GET(new Request(`http://shop.test/api/payment-return?market=en-de${query}`));
const intent = "&payment_intent=pi_1&payment_intent_client_secret=pi_1_secret_abc";

beforeEach(() => {
  vi.clearAllMocks();
  getMarketContext.mockResolvedValue(context);
  readCartPayment.mockResolvedValue({ cartId: "cart_1", completed: false, intentId: "pi_1" });
  readIntent.mockResolvedValue({ status: "requires_capture", reason: null });
  completeCart.mockResolvedValue({ kind: "order", orderId: "order_1", countryCode: "de" });
});

describe("/api/payment-return", () => {
  it("completes the cart for its own authorised intent and goes to the receipt", async () => {
    const response = await back(intent);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/de/en/order/order_1/confirmed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(readIntent).toHaveBeenCalledWith("pk_test_x", "pi_1", "pi_1_secret_abc", "en");
    expect(completeCart).toHaveBeenCalledWith("en-US", {
      market: "/de/en",
      language: "en",
      key: "en-de",
    });
    expect(setReceipt).toHaveBeenCalledWith("order_1");
  });

  it("completes nothing for another cart's intent", async () => {
    readCartPayment.mockResolvedValue({ cartId: "cart_1", completed: false, intentId: "pi_2" });
    const response = await back(intent);
    expect(response.headers.get("location")).toBe(
      "/de/en/checkout/delivery?f=key1#main-payment-error",
    );
    expect(leaveFlash).toHaveBeenCalledWith("/de/en/checkout/delivery", {
      errors: { paymentMethod: "unpaid" },
    });
    expect(readIntent).not.toHaveBeenCalled();
    expect(completeCart).not.toHaveBeenCalled();
  });

  it("completes nothing for a secret that is not the intent's", async () => {
    await back("&payment_intent=pi_1&payment_intent_client_secret=pi_2_secret_abc");
    expect(readCartPayment).not.toHaveBeenCalled();
    expect(completeCart).not.toHaveBeenCalled();
  });

  it("brings a refused payment back to the delivery step with the browser's reason", async () => {
    readIntent.mockResolvedValue({ status: "requires_payment_method", reason: "Card declined." });
    const response = await back(`${intent}&reason=${encodeURIComponent("Karte abgelehnt.")}`);
    expect(response.headers.get("location")).toBe(
      "/de/en/checkout/delivery?f=key1#main-payment-error",
    );
    expect(leaveFlash).toHaveBeenCalledWith("/de/en/checkout/delivery", {
      errors: { paymentMethod: "declined" },
      values: { paymentReason: "Karte abgelehnt." },
    });
    expect(completeCart).not.toHaveBeenCalled();
  });

  it("shows no reason Stripe did not give, even when the URL has one", async () => {
    readIntent.mockResolvedValue({ status: "requires_payment_method", reason: null });
    await back(`${intent}&reason=anything`);
    expect(leaveFlash).toHaveBeenCalledWith("/de/en/checkout/delivery", {
      errors: { paymentMethod: "unpaid" },
    });
  });

  it("sends a visitor without a cart to the cart page", async () => {
    readCartPayment.mockResolvedValue(null);
    expect((await back(intent)).headers.get("location")).toBe("/de/en/cart");
  });

  it("answers 404 without a market or without Stripe", async () => {
    getMarketContext.mockResolvedValue(null);
    expect((await back(intent)).status).toBe(404);
    getMarketContext.mockResolvedValue(context);
    stripePublishableKey.mockReturnValueOnce(null);
    expect((await back(intent)).status).toBe(404);
  });

  it("is rejected on the review page when Medusa refuses the order", async () => {
    completeCart.mockResolvedValue({ kind: "cart", error: "out of stock", cart: {} });
    expect((await back(intent)).headers.get("location")).toBe("/de/en/checkout/review?f=key1");
    expect(setReceipt).not.toHaveBeenCalled();
  });
});
