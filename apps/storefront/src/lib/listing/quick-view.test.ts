// The quick view's endpoint (D101, D102, T83): `/next/quick-view`, its statuses, its cache header and
// what it reads: the market's region and language from the market's key alone, never from the
// query (PR 113's review), and a 404 for anything that is not a product the market sells.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  stubMedusaFetch,
  connectionRefused,
  PUBLISHABLE_KEY,
} from "../../test-support/medusa-fetch";
import { wireHoodie } from "../../test-support/medusa-wire";
import { seeded } from "../markets/test-maps";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));

const regions = {
  regions: [
    { id: "reg_us", name: "US", currency_code: "usd", countries: [{ iso_2: "us" }] },
    { id: "reg_eu", name: "EU", currency_code: "eur", countries: [{ iso_2: "cy" }] },
  ],
  count: 2,
  offset: 0,
  limit: 100,
};

/** Medusa with the hoodie under its handle, and nothing under any other. */
function stub(product = wireHoodie) {
  return stubMedusaFetch((call) => {
    const path = call.url.pathname;
    if (path === "/store/regions") return { body: regions };
    if (path === "/store/products") {
      const products = call.url.searchParams.get("handle") === product.handle ? [product] : [];
      return { body: { products, count: products.length, offset: 0, limit: 1 } };
    }
    return { status: 404, body: { message: `no route ${path}` } };
  });
}

const get = (query: string) => new Request(`http://localhost:8000/next/quick-view?${query}`);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /next/quick-view (T83)", () => {
  it("answers the product's buy box, its words and the market's language, cached a minute", async () => {
    const calls = stub();
    const { quickViewResponse } = await import("./quick-view");
    const response = await quickViewResponse(
      get(`market=en-us&handle=${wireHoodie.handle}&region_id=reg_eu&locale=el`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const body = await response.json();
    expect(body.box.product.handle).toBe(wireHoodie.handle);
    expect(body.box.product.href).toBe(`/us/products/${wireHoodie.handle}`);
    expect(body.box.quantity).toBe(1);
    expect(body.locale).toBe("en-US");
    expect(body.copy.quickViewDialog.details).toBe("View full details");
    // The product was read in the market's region, whatever the query said.
    const reads = calls.filter((call) => call.url.pathname === "/store/products");
    expect(reads.map((call) => call.url.searchParams.get("region_id"))).toEqual(["reg_us"]);
  });

  it("answers 404 for a market, a handle or a product the market does not sell", async () => {
    // A product with no price in the region is one the market does not sell: its page is a 404.
    const unpriced = {
      ...wireHoodie,
      variants: (wireHoodie.variants ?? []).map((variant) => ({
        ...variant,
        calculated_price: null,
      })),
    };
    for (const [query, product] of [
      [`market=xx-zz&handle=${wireHoodie.handle}`, wireHoodie],
      [`handle=${wireHoodie.handle}`, wireHoodie],
      ["market=en-us&handle=no-such-product", wireHoodie],
      ["market=en-us", wireHoodie],
      [`market=en-us&handle=${wireHoodie.handle}`, unpriced],
    ] as const) {
      vi.resetModules();
      stub(product as typeof wireHoodie);
      const { quickViewResponse } = await import("./quick-view");
      const response = await quickViewResponse(get(query));
      expect(response.status, query).toBe(404);
      expect(response.headers.get("cache-control"), query).toBe("no-store");
    }
  });

  it("answers 503 while Medusa is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(connectionRefused())),
    );
    const { quickViewResponse } = await import("./quick-view");
    const response = await quickViewResponse(get(`market=en-us&handle=${wireHoodie.handle}`));
    expect(response.status).toBe(503);
  });
});
