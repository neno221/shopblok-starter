import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
import {
  connectionRefused,
  PUBLISHABLE_KEY,
  stubMedusaFetch,
} from "../../test-support/medusa-fetch";
import { wireCart } from "../../test-support/medusa-wire";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

const { consentMetadata, toCartDto } = await import("./cart");

describe("toCartDto", () => {
  it("keeps the lines, the totals and each code's discount, in major units", () => {
    const cart = toCartDto(wireCart);
    expect(cart).toMatchObject({
      id: "cart_1",
      regionId: "reg_eu",
      locale: "el-GR",
      itemCount: 3,
      subtotal: { amount: 112, currencyCode: "eur" },
      discountTotal: { amount: 4.9, currencyCode: "eur" },
      shippingTotal: null,
      total: { amount: 107.1, currencyCode: "eur" },
      promoCodes: [{ code: "WELCOME10", discount: { amount: 4.9, currencyCode: "eur" } }],
      completed: false,
    });
    expect(
      cart.lines.map((line) => [line.id, line.quantity, line.compareAtUnitPrice?.amount]),
    ).toEqual([
      ["cali_hoodie", 2, 59],
      ["cali_mug", 1, undefined],
    ]);
  });

  it("knows the shipping total once a method is chosen", () => {
    const cart = toCartDto({
      ...wireCart,
      shipping_total: 5,
      shipping_methods: [{ id: "casm_1", shipping_option_id: "so_standard" }],
    });
    expect(cart.shippingTotal).toEqual({ amount: 5, currencyCode: "eur" });
    expect(cart.shippingMethodIds).toEqual(["so_standard"]);
  });

  it("leaves out a line whose product or variant is gone", () => {
    const [first] = wireCart.items ?? [];
    const cart = toCartDto({ ...wireCart, items: [{ ...first!, variant_id: null }, null] });
    expect(cart.lines).toEqual([]);
    expect(cart.itemCount).toBe(0);
  });
});

describe("the cart through the SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    jar.reset();
    vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks Medusa nothing when there is no cart cookie", async () => {
    const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
    const { getCart } = await import("./cart");
    expect(await getCart("el-GR")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("reads the cookie's cart with the locale, and no authorization for a guest", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
    const { getCart } = await import("./cart");
    expect((await getCart("el-GR"))?.itemCount).toBe(3);
    expect(calls[0]?.url.pathname).toBe("/store/carts/cart_1");
    expect(calls[0]?.headers.get("x-medusa-locale")).toBe("el-GR");
    expect(calls[0]?.headers.has("authorization")).toBe(false);
  });

  it("sends the customer's token when one is signed in", async () => {
    jar.reset({ _medusa_cart_id: "cart_1", _medusa_jwt: "jwt" });
    const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
    const { getCart } = await import("./cart");
    await getCart();
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer jwt");
  });

  it("is null for a cart Medusa no longer has, or one already completed", async () => {
    jar.reset({ _medusa_cart_id: "cart_gone" });
    stubMedusaFetch(() => ({ status: 404, body: { message: "Cart not found" } }));
    const { getCart } = await import("./cart");
    expect(await getCart()).toBeNull();
    vi.unstubAllGlobals();
    stubMedusaFetch(() => ({
      body: { cart: { ...wireCart, completed_at: "2026-10-26T10:00:00Z" } },
    }));
    expect(await getCart()).toBeNull();
  });

  it("passes an outage on", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    stubMedusaFetch(() => connectionRefused());
    const { getCart } = await import("./cart");
    await expect(getCart()).rejects.toMatchObject({ kind: "unreachable" });
  });

  it("creates the cart on the first add, in the market's region and locale, and sets the cookie", async () => {
    const calls = stubMedusaFetch((call) =>
      call.url.pathname === "/store/carts"
        ? { body: { cart: { ...wireCart, items: [] } } }
        : { body: { cart: wireCart } },
    );
    const { addLine } = await import("./cart");
    const cart = await addLine({ regionId: "reg_eu", locale: "el-GR" }, "variant_black_m", 2);
    expect(calls.map((call) => [call.method, call.url.pathname])).toEqual([
      ["POST", "/store/carts"],
      ["POST", "/store/carts/cart_1/line-items"],
    ]);
    expect(calls[0]?.body).toEqual({ region_id: "reg_eu", locale: "el-GR" });
    expect(calls[1]?.body).toEqual({ variant_id: "variant_black_m", quantity: 2 });
    expect(jar.writes.map((write) => [write.name, write.value])).toEqual([
      ["_medusa_cart_id", "cart_1"],
    ]);
    expect(cart.itemCount).toBe(3);
  });

  it("moves a cart from another region to the market's, and keeps it (D65)", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = stubMedusaFetch((call) =>
      call.method === "GET"
        ? { body: { cart: wireCart } }
        : { body: { cart: { ...wireCart, region_id: "reg_us", locale: "en-US" } } },
    );
    const { getOrCreateCart } = await import("./cart");
    const cart = await getOrCreateCart({ regionId: "reg_us", locale: "en-US" });
    expect(calls.map((call) => [call.method, call.url.pathname])).toEqual([
      ["GET", "/store/carts/cart_1"],
      ["POST", "/store/carts/cart_1"],
    ]);
    expect(calls[1]?.body).toEqual({ region_id: "reg_us", locale: "en-US" });
    expect(cart.id).toBe("cart_1");
    expect(jar.writes).toEqual([]);
  });

  it("changes nothing for a cart already in the market's region and locale", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
    const { getOrCreateCart } = await import("./cart");
    await getOrCreateCart({ regionId: "reg_eu", locale: "el-GR" });
    expect(calls).toHaveLength(1);
  });

  it("removes a line at quantity 0", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = stubMedusaFetch(() => ({
      body: { id: "cali_mug", deleted: true, parent: wireCart },
    }));
    const { updateLine } = await import("./cart");
    await updateLine("cali_mug", 0);
    expect(calls.map((call) => [call.method, call.url.pathname])).toEqual([
      ["DELETE", "/store/carts/cart_1/line-items/cali_mug"],
    ]);
  });

  it("refuses a write when there is no cart cookie, without asking Medusa", async () => {
    const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
    const { applyPromoCode } = await import("./cart");
    await expect(applyPromoCode("X")).rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual([]);
  });

  it("clears the cookie when the order is placed", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    stubMedusaFetch((call) =>
      call.method === "GET"
        ? { body: { cart: { id: "cart_1", metadata: {} } } }
        : {
            body: {
              type: "order",
              order: { id: "order_1", shipping_address: { country_code: "CY" } },
            },
          },
    );
    const { completeCart } = await import("./cart");
    expect(await completeCart()).toEqual({ kind: "order", orderId: "order_1", countryCode: "cy" });
    expect(jar.writes.map((write) => [write.name, write.options.maxAge])).toEqual([
      ["_medusa_cart_id", 0],
    ]);
  });

  it("picks the provider's pending session, not the first one (SPEC §8.2)", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    stubMedusaFetch((call) =>
      call.method === "GET"
        ? { body: { cart: { id: "cart_1", payment_collection: { id: "pay_col" } } } }
        : {
            body: {
              payment_collection: {
                id: "pay_col",
                payment_sessions: [
                  { id: "ps_old", provider_id: "pp_stripe_stripe", status: "pending" },
                  { id: "ps_system", provider_id: "pp_system_default", status: "pending" },
                ],
              },
            },
          },
    );
    const { initiatePayment } = await import("./cart");
    expect(await initiatePayment("pp_system_default")).toEqual({
      sessionId: "ps_system",
      providerId: "pp_system_default",
      status: "pending",
    });
  });
});

describe("the analytics consent in the cart's metadata (T97, D124)", () => {
  const id = "019a0c2e-7f3b-7c1d-9a3e-123456789abc";
  const yes = { consent: true, distinctId: id };

  it("adds the consent and the id, keeping the other keys", () => {
    expect(consentMetadata({ market: "/cy", language: "el" }, yes)).toEqual({
      market: "/cy",
      language: "el",
      analytics_consent: true,
      posthog_distinct_id: id,
    });
    // Consent without an id (a build with no PostHog key): the consent alone.
    expect(consentMetadata({}, { consent: true, distinctId: null })).toEqual({
      analytics_consent: true,
    });
  });

  it("removes both when there is no consent, whatever the cart held before", () => {
    expect(
      consentMetadata(
        { market: "/cy", analytics_consent: true, posthog_distinct_id: id },
        { consent: false, distinctId: null },
      ),
    ).toEqual({ market: "/cy" });
  });

  it("answers null when the metadata says so already: no write", () => {
    expect(consentMetadata({ market: "/cy" }, { consent: false, distinctId: null })).toBeNull();
    expect(consentMetadata({ analytics_consent: true, posthog_distinct_id: id }, yes)).toBeNull();
  });

  describe("through the SDK", () => {
    const withdrawn = "v1.0.0.2026-11-12";
    const given = "v1.1.0.2026-11-12";
    beforeEach(() => {
      vi.resetModules();
      jar.reset();
      vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
      vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it("places the order only after taking a withdrawn consent out of the cart", async () => {
      jar.reset({ _medusa_cart_id: "cart_1", _shopblok_consent: withdrawn });
      const calls = stubMedusaFetch((call) =>
        call.method === "GET"
          ? {
              body: {
                cart: {
                  id: "cart_1",
                  metadata: { market: "/cy", analytics_consent: true, posthog_distinct_id: id },
                },
              },
            }
          : call.url.pathname.endsWith("/complete")
            ? { body: { type: "order", order: { id: "order_1" } } }
            : { body: { cart: { id: "cart_1" } } },
      );
      const { completeCart } = await import("./cart");
      await completeCart();
      expect(calls.map((call) => [call.method, call.url.pathname, call.body])).toEqual([
        ["GET", "/store/carts/cart_1", undefined],
        ["POST", "/store/carts/cart_1", { metadata: { market: "/cy" } }],
        ["POST", "/store/carts/cart_1/complete", undefined],
      ]);
    });

    it("writes the consent and PostHog's id after a cart write that left them out", async () => {
      jar.reset({
        _medusa_cart_id: "cart_1",
        _shopblok_consent: given,
        ph_phc_test_posthog: encodeURIComponent(JSON.stringify({ distinct_id: id })),
      });
      const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
      const { applyPromoCode } = await import("./cart");
      await applyPromoCode("WELCOME10");
      expect(calls.at(-1)?.body).toEqual({
        metadata: { analytics_consent: true, posthog_distinct_id: id },
      });
    });

    it("makes no extra write when the cart already says what the cookies say", async () => {
      jar.reset({ _medusa_cart_id: "cart_1", _shopblok_consent: withdrawn });
      const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
      const { applyPromoCode } = await import("./cart");
      await applyPromoCode("WELCOME10");
      expect(calls).toHaveLength(1);
    });
  });
});
