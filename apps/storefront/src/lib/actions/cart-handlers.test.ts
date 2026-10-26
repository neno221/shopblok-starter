import { Cart, CartLine } from "@shopblok/registry/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createCookieJar } from "../../test-support/cookie-jar";
import { PUBLISHABLE_KEY, stubMedusaFetch, type MedusaCall } from "../../test-support/medusa-fetch";
import { wireCart, wireHoodie, wireMug } from "../../test-support/medusa-wire";
import { seeded } from "../markets/test-maps";

const jar = createCookieJar();
const updateTag = vi.fn();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));

const regions = {
  regions: [
    {
      id: "reg_eu",
      name: "Europe",
      currency_code: "eur",
      countries: [{ iso_2: "cy" }, { iso_2: "de" }, { iso_2: "fr" }],
    },
    { id: "reg_us", name: "US", currency_code: "usd", countries: [{ iso_2: "us" }] },
  ],
  count: 2,
  offset: 0,
  limit: 100,
};

/** Medusa as the cart actions meet it: the regions, the products, and a cart that grows. */
function medusa(cart = wireCart) {
  return stubMedusaFetch((call: MedusaCall) => {
    const path = call.url.pathname;
    if (path === "/store/regions") return { body: regions };
    if (path === "/store/products")
      return { body: { products: [wireHoodie, wireMug], count: 2, offset: 0, limit: 2 } };
    if (path === "/store/carts" && call.method === "POST")
      return { body: { cart: { ...cart, items: [] } } };
    if (path.startsWith("/store/carts/cart_1/line-items/") && call.method === "DELETE")
      return { body: { id: "x", deleted: true, parent: cart } };
    if (path.startsWith("/store/carts/cart_1")) return { body: { cart } };
    return { status: 404, body: { message: `no route ${path}` } };
  });
}

// The answer of an action is plain data the contracts describe, nothing of Medusa's: parsing drops
// unknown keys, so an answer with an extra field (the SDK's cart) differs from its parse.
const AddAnswer = z.object({ count: z.int().nonnegative(), line: CartLine, cart: Cart });
const CartAnswer = z.object({ count: z.int().nonnegative(), cart: Cart });

beforeEach(() => {
  vi.resetModules();
  jar.reset();
  updateTag.mockClear();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("addToCart (D61)", () => {
  it("creates the cart in the market's region, answers the count and the line as view models, and updates the tag", async () => {
    const calls = medusa();
    const { addToCartAction } = await import("./cart-handlers");
    const result = await addToCartAction({
      market: "el-cy",
      variantId: "variant_black_m",
      quantity: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(AddAnswer.parse(result.data)).toEqual(result.data);
    expect(result.data.count).toBe(3);
    expect(result.data.line).toMatchObject({
      variantId: "variant_black_m",
      href: "/products/demo-heritage-hoodie",
    });
    expect(calls.find((call) => call.url.pathname === "/store/carts")?.body).toEqual({
      region_id: "reg_eu",
      locale: "el-GR",
    });
    expect(jar.values.get("_medusa_cart_id")).toBe("cart_1");
    expect(updateTag).toHaveBeenCalledWith("cart");
  });

  it("builds the market's own URLs: /us/products/… for the US", async () => {
    medusa({ ...wireCart, region_id: "reg_us", locale: "en-US", currency_code: "usd" });
    jar.reset({ _medusa_cart_id: "cart_1" });
    const { addToCartAction } = await import("./cart-handlers");
    const result = await addToCartAction({ market: "en-us", variantId: "variant_mug" });
    expect(result.ok && result.data.line.href).toBe("/us/products/demo-ceramic-mug");
  });

  it("refuses a market that is not open, a missing variant and a quantity of 1000, before Medusa", async () => {
    const calls = medusa();
    const { addToCartAction } = await import("./cart-handlers");
    expect(await addToCartAction({ market: "xx-zz", variantId: "v" })).toMatchObject({
      ok: false,
      form: "not-found",
    });
    expect(await addToCartAction({ market: "el-cy", quantity: 1000 })).toEqual({
      ok: false,
      errors: { variantId: "required", quantity: "invalid" },
    });
    expect(calls.filter((call) => call.url.pathname.startsWith("/store/carts"))).toEqual([]);
  });
});

describe("the line's limit (PR 73 review: Medusa adds a repeated variant to its line)", () => {
  it("refuses an add that takes the line past 99, and sends Medusa no write", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = medusa();
    const { addToCartAction, MAX_LINE_QUANTITY } = await import("./cart-handlers");
    // wireCart holds 2 of variant_black_m.
    expect(
      await addToCartAction({
        market: "el-cy",
        variantId: "variant_black_m",
        quantity: MAX_LINE_QUANTITY - 1,
      }),
    ).toMatchObject({ ok: false, form: "rejected" });
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
    const fits = await addToCartAction({
      market: "el-cy",
      variantId: "variant_black_m",
      quantity: MAX_LINE_QUANTITY - 2,
    });
    expect(fits.ok).toBe(true);
  });
});

describe("updateCartLine and removeCartLine (SPEC §11.1: ownership by id)", () => {
  it("changes a line of the visitor's own cart", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = medusa();
    const { updateLineAction, removeLineAction } = await import("./cart-handlers");
    const updated = await updateLineAction({ market: "el-cy", lineId: "cali_mug", quantity: "3" });
    expect(updated.ok && CartAnswer.parse(updated.data)).toEqual(updated.ok && updated.data);
    const removed = await removeLineAction({ market: "el-cy", lineId: "cali_mug" });
    expect(removed.ok).toBe(true);
    expect(
      calls.filter((call) => call.method !== "GET").map((call) => [call.method, call.url.pathname]),
    ).toEqual([
      ["POST", "/store/carts/cart_1/line-items/cali_mug"],
      ["DELETE", "/store/carts/cart_1/line-items/cali_mug"],
    ]);
  });

  it("removes a line the view leaves out (no variant), so it cannot be stuck in the cart", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const items = wireCart.items ?? [];
    const orphan = { ...items[0]!, id: "cali_orphan", variant_id: null, product_id: null };
    const calls = medusa({ ...wireCart, items: [...items, orphan] });
    const { removeLineAction } = await import("./cart-handlers");
    expect((await removeLineAction({ market: "el-cy", lineId: "cali_orphan" })).ok).toBe(true);
    expect(
      calls.filter((call) => call.method === "DELETE").map((call) => call.url.pathname),
    ).toEqual(["/store/carts/cart_1/line-items/cali_orphan"]);
  });

  it("refuses a line id that is not in the visitor's cart, and sends Medusa no write", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    const calls = medusa();
    const { updateLineAction } = await import("./cart-handlers");
    expect(
      await updateLineAction({ market: "el-cy", lineId: "cali_someone_else", quantity: 1 }),
    ).toEqual({
      ok: false,
      errors: {},
      form: "not-found",
    });
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });
});

describe("applyPromo", () => {
  it("is rejected when Medusa applied nothing", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    medusa({ ...wireCart, promotions: [] });
    const { applyPromoAction } = await import("./cart-handlers");
    expect(await applyPromoAction({ market: "el-cy", code: " NOPE " })).toMatchObject({
      ok: false,
      form: "rejected",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("answers the cart with the code", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    medusa();
    const { applyPromoAction } = await import("./cart-handlers");
    const result = await applyPromoAction({ market: "el-cy", code: "WELCOME10" });
    expect(result.ok && result.data.cart.promoCodes.map((promo) => promo.code)).toEqual([
      "WELCOME10",
    ]);
  });

  it("is rejected for a code in another case: Medusa compares exactly (PR 73 review)", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    medusa();
    const { applyPromoAction } = await import("./cart-handlers");
    expect(await applyPromoAction({ market: "el-cy", code: "welcome10" })).toMatchObject({
      ok: false,
      form: "rejected",
    });
  });
});

describe("rememberMarket (D66)", () => {
  it("keeps an open market's key in the cookie, for a year", async () => {
    const { rememberMarketAction } = await import("./market-handlers");
    expect(await rememberMarketAction({ market: "en-us" })).toEqual({
      ok: true,
      data: { market: "en-us" },
    });
    expect(jar.writes).toMatchObject([
      { name: "_shopblok_market", value: "en-us", options: { maxAge: 31_536_000 } },
    ]);
  });

  it("refuses a key the map has no open market for", async () => {
    const { rememberMarketAction } = await import("./market-handlers");
    expect(await rememberMarketAction({ market: "en-zz" })).toMatchObject({
      ok: false,
      form: "not-found",
    });
    expect(jar.writes).toEqual([]);
  });
});
