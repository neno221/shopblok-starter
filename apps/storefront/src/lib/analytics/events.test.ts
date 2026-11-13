// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M6 D124 (T97): what an add sends, and the sign-up's one-time mark.
const line = {
  id: "cali_1",
  productId: "prod_1",
  variantId: "variant_1",
  title: "Hoodie",
  href: "/products/hoodie",
  options: [],
  quantity: 3,
  unitPrice: { amount: 59, currencyCode: "eur" },
  total: { amount: 177, currencyCode: "eur" },
  stock: { status: "in-stock" },
} as never;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  document.cookie = "_shopblok_consent=v1.1.0.2026-11-12; Path=/";
});
afterEach(() => {
  vi.unstubAllEnvs();
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
  document.cookie = "_shopblok_signed_up=; Path=/; Max-Age=0";
});

describe("the shop's events (D124)", () => {
  it("sends the product, the variant, how many were added and the price", async () => {
    const { attachSink } = await import("./track");
    const { trackAdded } = await import("./events");
    const sink = vi.fn();
    attachSink(sink);
    trackAdded(line, "2", "product_page");
    trackAdded(line, "x", "quick_view");
    expect(sink.mock.calls).toEqual([
      [
        "product_added_to_cart",
        {
          product_id: "prod_1",
          variant_id: "variant_1",
          quantity: 2,
          price: 59,
          currency: "eur",
          source: "product_page",
        },
      ],
      [
        "product_added_to_cart",
        {
          product_id: "prod_1",
          variant_id: "variant_1",
          quantity: 1,
          price: 59,
          currency: "eur",
          source: "quick_view",
        },
      ],
    ]);
  });

  it("sends signed_up once, when the register action left its mark", async () => {
    const { attachSink } = await import("./track");
    const { trackSignedUp } = await import("./events");
    const sink = vi.fn();
    attachSink(sink);
    trackSignedUp();
    expect(sink).not.toHaveBeenCalled();
    document.cookie = "_shopblok_signed_up=1; Path=/";
    trackSignedUp();
    trackSignedUp();
    expect(sink.mock.calls).toEqual([["signed_up", {}]]);
    expect(document.cookie).not.toContain("_shopblok_signed_up=1");
  });
});
