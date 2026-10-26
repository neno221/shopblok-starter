import { Cart } from "@shopblok/registry/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../../test-support/cookie-jar";
import {
  connectionRefused,
  PUBLISHABLE_KEY,
  stubMedusaFetch,
} from "../../test-support/medusa-fetch";
import { wireCart, wireHoodie, wireMug } from "../../test-support/medusa-wire";
import { seeded } from "../markets/test-maps";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
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
    { id: "reg_ch", name: "CH", currency_code: "chf", countries: [{ iso_2: "ch" }] },
  ],
  count: 3,
  offset: 0,
  limit: 100,
};

function medusa(options: { customer?: object } = {}) {
  return stubMedusaFetch((call) => {
    const path = call.url.pathname;
    if (path === "/store/regions") return { body: regions };
    if (path === "/store/products")
      return { body: { products: [wireHoodie, wireMug], count: 2, offset: 0, limit: 2 } };
    if (path === "/store/carts/cart_1") return { body: { cart: wireCart } };
    if (path === "/store/customers/me")
      return options.customer === undefined
        ? { status: 401, body: { message: "Unauthorized" } }
        : { body: { customer: options.customer } };
    return { status: 404, body: { message: `no route ${path}` } };
  });
}

const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost:8000${path}`, { headers: { host: "localhost:8000", ...headers } });

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

describe("GET /next/visitor (D60)", () => {
  it("is private and never stored, whatever it answers", async () => {
    medusa();
    const { visitorResponse } = await import("./handlers");
    for (const path of [
      "/next/visitor?market=el-cy",
      "/next/visitor",
      "/next/visitor?market=xx-zz",
    ]) {
      const response = await visitorResponse(get(path));
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("answers a guest with no cart: count 0, no customer, and no suggestion without a country", async () => {
    const calls = medusa();
    const { visitorResponse } = await import("./handlers");
    const response = await visitorResponse(get("/next/visitor?market=el-cy"));
    expect(await response.json()).toEqual({ cartCount: 0, customer: null, suggestion: null });
    // No cookie, no token: neither the cart nor the customer is asked for.
    expect(calls.filter((call) => call.url.pathname !== "/store/regions")).toEqual([]);
  });

  it("follows the cart cookie, and names the signed-in customer", async () => {
    jar.reset({ _medusa_cart_id: "cart_1", _medusa_jwt: "jwt" });
    medusa({
      customer: { id: "cus_1", email: "a@example.com", first_name: "Άννα", addresses: [] },
    });
    const { visitorResponse } = await import("./handlers");
    const body = await (await visitorResponse(get("/next/visitor?market=el-cy"))).json();
    expect(body).toMatchObject({ cartCount: 3, customer: { firstName: "Άννα" } });
  });

  it("suggests the visitor's country on the same page, in their language among its own (SPEC §8.5)", async () => {
    medusa();
    const { visitorResponse } = await import("./handlers");
    const response = await visitorResponse(
      get("/next/visitor?market=el-cy&path=%2Fproducts%2Ftee", {
        "x-vercel-ip-country": "CH",
        "accept-language": "fr-CH,fr;q=0.9,de;q=0.5",
      }),
    );
    expect((await response.json()).suggestion).toEqual({
      market: "fr-ch",
      current: { country: "cy" },
      suggested: {
        country: "ch",
        language: "fr",
        htmlLang: "fr-CH",
        currencyCode: "CHF",
        href: "/ch/fr/products/tee",
      },
    });
  });

  it("suggests nothing once the visitor chose a market, or for the market they are on", async () => {
    medusa();
    const { visitorResponse } = await import("./handlers");
    jar.reset({ _shopblok_market: "el-cy" });
    const chosen = await visitorResponse(
      get("/next/visitor?market=el-cy", { "x-vercel-ip-country": "US" }),
    );
    expect((await chosen.json()).suggestion).toBeNull();
    jar.reset();
    const here = await visitorResponse(
      get("/next/visitor?market=en-us", { "x-vercel-ip-country": "US" }),
    );
    expect((await here.json()).suggestion).toBeNull();
  });

  it("suggests again when the chosen market has closed since (PR 73 review)", async () => {
    medusa();
    const { visitorResponse } = await import("./handlers");
    jar.reset({ _shopblok_market: "en-zz" });
    const response = await visitorResponse(
      get("/next/visitor?market=el-cy", { "x-vercel-ip-country": "US" }),
    );
    expect((await response.json()).suggestion).toMatchObject({ market: "en-us" });
  });

  it("answers 503 when Medusa is down, so the island keeps its placeholder", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    stubMedusaFetch(() => connectionRefused());
    const { visitorResponse } = await import("./handlers");
    expect((await visitorResponse(get("/next/visitor"))).status).toBe(503);
  });
});

describe("GET /next/cart (D60)", () => {
  it("answers the Cart view model, private", async () => {
    jar.reset({ _medusa_cart_id: "cart_1" });
    medusa();
    const { cartResponse } = await import("./handlers");
    const response = await cartResponse(get("/next/cart?market=el-cy"));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body: unknown = await response.json();
    expect(Cart.parse(body)).toEqual(body);
  });

  it("answers null without a cart, and 404 for a market that is not open", async () => {
    medusa();
    const { cartResponse } = await import("./handlers");
    expect(await (await cartResponse(get("/next/cart?market=el-cy"))).json()).toBeNull();
    expect((await cartResponse(get("/next/cart?market=xx-zz"))).status).toBe(404);
    expect((await cartResponse(get("/next/cart"))).status).toBe(404);
  });
});
