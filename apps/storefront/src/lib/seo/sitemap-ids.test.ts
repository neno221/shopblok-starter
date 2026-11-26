import { afterEach, describe, expect, it, vi } from "vitest";
import { seeded } from "../markets/test-maps";
import { listMarkets } from "../markets/market";

// M7 D147 (T110), PR 155's review: one market whose reads fail keeps one sitemap, and the other
// markets keep theirs, so `robots.txt` and `generateSitemaps` never answer 500 for one outage (a
// crawler takes a 5xx `robots.txt` as "crawl nothing").

const reads = vi.hoisted(() => ({ failing: new Set<string>() }));

vi.mock("server-only", () => ({}));
vi.mock("../prerender", () => ({ buildReadsMedusa: () => true }));
vi.mock("../cache", () => ({
  CATALOG_LIFE: "hours",
  cached: (load: (...args: unknown[]) => Promise<unknown>) => load,
}));
vi.mock("../cms/read", () => ({ cmsRead: () => async () => ({}) }));
vi.mock("../cms/pages", () => ({
  readPagePaths: async () => ({ byId: {} }),
  readHomepageId: async () => undefined,
}));
vi.mock("../cms/posts", () => ({ readPostSlugs: async () => ({ byId: {} }) }));
vi.mock("../medusa/regions", () => ({
  getRegionForCountry: async (country: string) => {
    if (reads.failing.has(country)) throw new Error("connect ECONNREFUSED medusa:9000");
    return undefined;
  },
}));
vi.mock("../medusa/sdk", () => ({
  medusaRequest: async () => ({ product_categories: [], collections: [], products: [], count: 0 }),
}));

const { sitemapIds } = await import("./sitemap-data");

afterEach(() => {
  reads.failing.clear();
  vi.restoreAllMocks();
});

describe("sitemapIds when a read fails", () => {
  it("gives every open market one sitemap when its reads answer", async () => {
    const ids = await sitemapIds(seeded);
    expect(ids).toEqual(Object.fromEntries(listMarkets(seeded).map((m) => [m.key, [m.key]])));
  });

  it("keeps one sitemap for a market whose read throws, with a warning, and the others' as they are", async () => {
    reads.failing.add("us");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ids = await sitemapIds(seeded);
    expect(ids["en-us"]).toEqual(["en-us"]);
    expect(ids["en-gb"]).toEqual(["en-gb"]);
    expect(Object.keys(ids)).toEqual(listMarkets(seeded).map((m) => m.key));
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^sitemap: en-us's addresses could not be read/),
    );
  });
});
