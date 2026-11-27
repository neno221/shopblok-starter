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

const { consentKeys, consentMetadata, sessionDataOf, sessionMatches, toCartDto } =
  await import("./cart");

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

describe("the saved payment method on the cart (M6 D119, T101)", () => {
  it("reads the kept saved method, the saving and the customer, and none of them by default", () => {
    expect(toCartDto(wireCart)).toMatchObject({
      savedMethod: null,
      paymentSave: false,
      customerId: null,
      access: "guest",
    });
    const cart = toCartDto({
      ...wireCart,
      customer: { id: "cus_1" },
      metadata: { stripe_payment_method: "pm_card1", stripe_setup_future_usage: "off_session" },
    });
    expect(cart).toMatchObject({ savedMethod: "pm_card1", paymentSave: true, customerId: "cus_1" });
    // Medusa deletes a key written as "": an emptied one reads as none.
    expect(
      toCartDto({ ...wireCart, metadata: { stripe_payment_method: "" } }).savedMethod,
    ).toBeNull();
  });

  it("asks the session for the saved method first, then for saving, else for nothing", () => {
    expect(sessionDataOf({ savedMethod: "pm_1", paymentSave: true })).toEqual({
      payment_method: "pm_1",
    });
    expect(sessionDataOf({ savedMethod: null, paymentSave: true })).toEqual({
      setup_future_usage: "off_session",
    });
    expect(sessionDataOf({ savedMethod: null, paymentSave: false })).toEqual({});
  });

  it("takes an existing session only when it asks for the same saving and method", () => {
    expect(sessionMatches({ data: {} }, {})).toBe(true);
    expect(sessionMatches({ data: { setup_future_usage: "off_session" } }, {})).toBe(false);
    expect(sessionMatches({ data: {} }, { setup_future_usage: "off_session" })).toBe(false);
    expect(
      sessionMatches(
        { data: { setup_future_usage: "off_session" } },
        { setup_future_usage: "off_session" },
      ),
    ).toBe(true);
    expect(sessionMatches({ data: { payment_method: "pm_1" } }, { payment_method: "pm_1" })).toBe(
      true,
    );
    expect(
      sessionMatches({ data: { payment_method: { id: "pm_1" } } }, { payment_method: "pm_1" }),
    ).toBe(true);
    expect(sessionMatches({ data: { payment_method: "pm_2" } }, { payment_method: "pm_1" })).toBe(
      false,
    );
    // A session that holds a saved method is not one for a payment that asks for none (item 7).
    expect(sessionMatches({ data: { payment_method: "pm_1" } }, {})).toBe(false);
    expect(sessionMatches({ data: { payment_method: { id: "pm_1" } } }, {})).toBe(false);
    expect(sessionMatches({ data: { payment_method: null } }, {})).toBe(true);
    expect(sessionMatches({ data: {} }, { payment_method: "pm_1" })).toBe(false);
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

  it("holds back a customer's cart this visitor is not signed in as (M7 D144), keeping the cookie", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    stubMedusaFetch(() => ({ body: { cart: { ...wireCart, shopblok_access: "other" } } }));
    const { getCart, readCart } = await import("./cart");
    expect(await getCart()).toBeNull();
    expect(await readCart()).toEqual({ cart: null, held: true });
    expect(jar.values.get("_medusa_cart_id")).toBe("cart_1");
    // Its lines count for nothing in the actions' checks: the next add goes to a new cart.
    const { getCartItems } = await import("./cart");
    expect(await getCartItems()).toBeNull();
    vi.unstubAllGlobals();
    for (const access of ["owner", "guest", undefined, "nonsense"]) {
      stubMedusaFetch(() => ({ body: { cart: { ...wireCart, shopblok_access: access } } }));
      const read = await readCart();
      expect([access, read.held, read.cart?.access]).toEqual([
        access,
        false,
        access === "owner" ? "owner" : "guest",
      ]);
      vi.unstubAllGlobals();
    }
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

  it("adds the consent and the id, and only those keys (Medusa merges metadata)", () => {
    expect(consentMetadata({ market: "/cy", language: "el" }, yes)).toEqual({
      analytics_consent: true,
      posthog_distinct_id: id,
    });
    // Consent without an id (a build with no PostHog key): the consent, and no id.
    expect(consentMetadata({}, { consent: true, distinctId: null })).toEqual({
      analytics_consent: true,
      posthog_distinct_id: "",
    });
  });

  it('removes both when there is no consent: `""` is Medusa\'s delete', () => {
    expect(
      consentMetadata(
        { market: "/cy", analytics_consent: true, posthog_distinct_id: id },
        { consent: false, distinctId: null },
      ),
    ).toEqual({ analytics_consent: "", posthog_distinct_id: "" });
  });

  it("gives a new cart the keys alone, with nothing to delete", () => {
    expect(consentKeys(yes)).toEqual({ analytics_consent: true, posthog_distinct_id: id });
    expect(consentKeys({ consent: true, distinctId: null })).toEqual({ analytics_consent: true });
    expect(consentKeys({ consent: false, distinctId: id })).toEqual({});
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
        [
          "POST",
          "/store/carts/cart_1",
          { metadata: { analytics_consent: "", posthog_distinct_id: "" } },
        ],
        ["POST", "/store/carts/cart_1/complete", undefined],
      ]);
    });

    it("writes the e-mails' target and the consent in one update before the order (T99, D124)", async () => {
      jar.reset({ _medusa_cart_id: "cart_1", _shopblok_consent: withdrawn });
      const calls = stubMedusaFetch((call) =>
        call.method === "GET"
          ? {
              body: {
                cart: {
                  id: "cart_1",
                  metadata: { market: "/cy", language: "el", analytics_consent: true },
                },
              },
            }
          : call.url.pathname.endsWith("/complete")
            ? { body: { type: "order", order: { id: "order_1" } } }
            : { body: { cart: { id: "cart_1" } } },
      );
      const { completeCart } = await import("./cart");
      await completeCart("en-US", { market: "/us", language: "en", key: "en-us" });
      expect(calls.map((call) => [call.method, call.body])).toEqual([
        ["GET", undefined],
        [
          "POST",
          {
            metadata: {
              analytics_consent: "",
              posthog_distinct_id: "",
              market: "/us",
              language: "en",
              market_key: "en-us",
            },
          },
        ],
        ["POST", undefined],
      ]);
    });

    it("writes the consent and PostHog's id after a cart write that left them out", async () => {
      jar.reset({
        _medusa_cart_id: "cart_1",
        _shopblok_consent: given,
        // As Next's `cookies()` hands it: decoded once, with the first URL PostHog keeps, whose
        // quoted search (`%22`) a second decode would break.
        ph_phc_test_posthog: JSON.stringify({
          distinct_id: id,
          $initial_person_info: { u: "https://shop.test/us/search?q=%22shirt%22%5C" },
        }),
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

describe("the cart before a wallet opened (T102, D120)", () => {
  const saved = {
    id: "caaddr_1",
    first_name: "Maria",
    last_name: "Georgiou",
    company: null,
    address_1: "Leoforos Makariou 10",
    address_2: "",
    city: "Nicosia",
    province: null,
    postal_code: "1065",
    country_code: "cy",
    phone: null,
  };
  const kept = {
    first_name: "Maria",
    last_name: "Georgiou",
    address_1: "Leoforos Makariou 10",
    city: "Nicosia",
    postal_code: "1065",
    country_code: "cy",
  };

  it("keeps an address's own fields, and `{}` for Medusa's empty one", async () => {
    const { addressInputOf, expressBeforeOf } = await import("./cart");
    expect(addressInputOf(saved)).toEqual(kept);
    expect(addressInputOf({ id: "caaddr_2", city: null, country_code: null })).toEqual({});
    expect(addressInputOf(null)).toEqual({});
    expect(expressBeforeOf({ address: kept, option: "so_pickup" })).toEqual({
      address: kept,
      option: "so_pickup",
    });
    expect(expressBeforeOf("")).toBeNull();
    expect(expressBeforeOf(undefined)).toBeNull();
  });

  describe("through the SDK", () => {
    beforeEach(() => {
      vi.resetModules();
      jar.reset({ _medusa_cart_id: "cart_1" });
      vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
      vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    const cartWith = (metadata: Record<string, unknown>) => ({
      ...wireCart,
      shipping_address: saved,
      shipping_methods: [{ id: "casm_1", shipping_option_id: "so_pickup" }],
      metadata,
    });

    it("keeps the cart's address and option on the sheet's first address event", async () => {
      const calls = stubMedusaFetch(() => ({
        body: { cart: cartWith({ express_before: { address: {}, option: null } }) },
      }));
      const { keepExpressBefore } = await import("./cart");
      await keepExpressBefore(true);
      expect(calls.at(-1)?.body).toEqual({
        metadata: { express_before: { address: kept, option: "so_pickup" } },
      });
    });

    it("keeps nothing on a later event when a copy is kept already", async () => {
      const calls = stubMedusaFetch(() => ({
        body: { cart: cartWith({ express_before: { address: {}, option: null } }) },
      }));
      const { keepExpressBefore } = await import("./cart");
      await keepExpressBefore(false);
      expect(calls.map((call) => call.method)).toEqual(["GET"]);
    });

    it("writes the kept address back with the copy removed, then the kept option", async () => {
      const calls = stubMedusaFetch(() => ({
        body: {
          cart: {
            ...wireCart,
            metadata: { express_before: { address: kept, option: "so_pickup" } },
          },
        },
      }));
      const canShip = vi.fn(async () => true);
      const { restoreExpressBefore } = await import("./cart");
      await restoreExpressBefore(canShip);
      expect(calls.map((call) => [call.method, call.url.pathname, call.body])).toEqual([
        ["GET", "/store/carts/cart_1", undefined],
        [
          "POST",
          "/store/carts/cart_1",
          { shipping_address: kept, billing_address: kept, metadata: { express_before: "" } },
        ],
        ["POST", "/store/carts/cart_1/shipping-methods", { option_id: "so_pickup" }],
      ]);
      expect(canShip).toHaveBeenCalledWith("so_pickup");
    });

    it("writes nothing back when nothing is kept", async () => {
      const calls = stubMedusaFetch(() => ({ body: { cart: wireCart } }));
      const { restoreExpressBefore } = await import("./cart");
      await restoreExpressBefore(async () => true);
      expect(calls.map((call) => call.method)).toEqual(["GET"]);
    });

    it("removes the copy before an order, with the e-mails' target", async () => {
      const calls = stubMedusaFetch((call) =>
        call.method === "GET"
          ? { body: { cart: { id: "cart_1", metadata: { express_before: { address: {} } } } } }
          : { body: { cart: { id: "cart_1" } } },
      );
      const { prepareCompletion } = await import("./cart");
      await prepareCompletion("en-US", { market: "/us", language: "en", key: "en-us" });
      expect(calls.at(-1)?.body).toEqual({
        metadata: { market: "/us", language: "en", market_key: "en-us", express_before: "" },
      });
    });
  });
});

describe("the analytics keys agree with the backend's (D124)", () => {
  it("names the same metadata keys and the same distinct-id pattern as Medusa's subscribers", async () => {
    const { readFileSync } = await import("node:fs");
    const backend = readFileSync(
      new URL("../../../../backend/src/lib/analytics.ts", import.meta.url),
      "utf8",
    );
    const { ANALYTICS_CONSENT_KEY, DISTINCT_ID_KEY } = await import("./cart");
    const { DISTINCT_ID } = await import("./cookies");
    expect(backend).toContain(`ANALYTICS_CONSENT_KEY = "${ANALYTICS_CONSENT_KEY}"`);
    expect(backend).toContain(`DISTINCT_ID_KEY = "${DISTINCT_ID_KEY}"`);
    expect(backend).toContain(`DISTINCT_ID = ${String(DISTINCT_ID)}`);
  });
});
