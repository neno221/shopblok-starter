import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLISHABLE_KEY, stubMedusaFetch } from "../../test-support/medusa-fetch";
import { wireHoodie, wireMug } from "../../test-support/medusa-wire";
import type { WireProduct } from "../medusa/products";

// M7 D147 (T110): the products a market's sitemap lists are the ones its region sells, by the
// product page's own rule: a product with no variant priced in the region is a 404 there, so it is
// left out. `seo.spec.ts` checks the same against the Store API, where the demo's regions all sell
// all eight products; this one has a product the region does not sell.

const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag, cacheLife: vi.fn() }));

/** The mug with no price in the region (Medusa sends `calculated_price: null`). */
const unpricedMug: WireProduct = {
  ...wireMug,
  id: "prod_unpriced",
  handle: "demo-unpriced-mug",
  variants: (wireMug.variants ?? []).map((variant) => ({ ...variant, calculated_price: null })),
};

const dated = (product: WireProduct, updatedAt: string) => ({ ...product, updated_at: updatedAt });

beforeEach(() => {
  vi.resetModules();
  cacheTag.mockClear();
  vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("listSoldProducts", () => {
  it("lists what the region sells, page by page, with each product's date", async () => {
    const pages = [
      [dated(wireHoodie, "2026-11-01T10:00:00.000Z"), dated(unpricedMug, "2026-11-02T10:00:00.000Z")],
      [dated(wireMug, "2026-11-03T10:00:00.000Z")],
    ];
    const calls = stubMedusaFetch((call) => {
      const offset = Number(call.url.searchParams.get("offset") ?? 0);
      const page = offset === 0 ? pages[0] : offset === 2 ? pages[1] : [];
      return { body: { products: page, count: 3, offset, limit: 100 } };
    });
    const { listSoldProducts } = await import("./sitemap-data");
    expect(await listSoldProducts("reg_eu")).toEqual([
      { handle: "demo-heritage-hoodie", updatedAt: "2026-11-01T10:00:00.000Z" },
      { handle: "demo-ceramic-mug", updatedAt: "2026-11-03T10:00:00.000Z" },
    ]);
    expect(calls).toHaveLength(2);
    for (const { url } of calls) {
      expect(url.pathname).toBe("/store/products");
      expect(url.searchParams.get("region_id")).toBe("reg_eu");
      expect(url.searchParams.get("fields")).toMatch(/\*variants\.calculated_price/);
      expect(url.searchParams.get("fields")).toMatch(/updated_at/);
    }
    expect(calls.map(({ url }) => url.searchParams.get("offset"))).toEqual(["0", "2"]);
    expect(cacheTag).toHaveBeenCalledWith("medusa:products");
  });

  it("leaves out a product the region does not sell", async () => {
    stubMedusaFetch(() => ({ body: { products: [unpricedMug], count: 1, offset: 0, limit: 100 } }));
    const { listSoldProducts } = await import("./sitemap-data");
    expect(await listSoldProducts("reg_us")).toEqual([]);
  });
});
