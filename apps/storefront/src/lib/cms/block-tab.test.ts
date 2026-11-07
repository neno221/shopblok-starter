// `GET /next/block-tab` (T81): one tab's products of a published `tabs` product collection, in the
// market's region. What it trusts is the published page's stored tab: the region, the source and the
// limit come from nowhere else, a block only a draft holds is a 404, and so is anything malformed.
import { describe, expect, it, vi } from "vitest";
import {
  cyprus,
  fakeCatalog,
  synced,
  unitedStates,
  type FakeMarket,
} from "../../test-support/fake-catalog";
import { MedusaRequestError } from "../medusa/sdk";
import type { BlockTabDeps } from "./block-tab";
import type { CmsPage } from "./pages";

const readPageById = vi.hoisted(() => vi.fn());
vi.mock("./pages", () => ({ readPageById }));
vi.mock("../market-context", () => ({ getMarketContext: vi.fn() }));
vi.mock("./resolve/market", () => ({ catalogReads: vi.fn() }));

const { blockTabResponse } = await import("./block-tab");

const tabs = [
  { label: "Basics", productSource: { mode: "collection", collection: synced("col_basics") } },
  { label: "On sale", productSource: { mode: "onSale", limit: 2 } },
  { label: "Lamps", productSource: { mode: "handpicked", products: [synced("prod_lamp")] } },
];

const page = (layout: unknown[]): CmsPage =>
  ({ id: 7, title: "Edit", slug: "edit", parent: null, layout, meta: {} }) as unknown as CmsPage;

const published = page([
  { id: "b1", blockType: "productCollection", variant: "tabs", heading: "Edit", tabs },
  { id: "b2", blockType: "productCollection", variant: "standard", heading: "All", tabs },
  { id: "b3", blockType: "richText", content: null },
]);

/** The markets the fake knows: their key, their region's currency and their store's prefix. */
const markets: Record<string, { fake: FakeMarket; prefix: string; language: string }> = {
  "en-us": { fake: unitedStates, prefix: "/us", language: "en" },
  "el-cy": { fake: cyprus, prefix: "/cy", language: "el" },
};

function deps(found: CmsPage | null = published) {
  const seen: { region: string; market: string; page?: number }[] = [];
  const shop: BlockTabDeps = {
    marketContext: async (key) => {
      const market = markets[key];
      if (market === undefined) return null;
      const { prefix } = market;
      return {
        market: { key, language: market.language },
        region: {
          id: `reg_${market.fake.currency}`,
          name: key,
          currencyCode: market.fake.currency,
          countries: [],
        },
        hrefs: {
          product: (handle: string) => `${prefix}/products/${handle}`,
          category: (path: string) => `${prefix}/categories/${path}`,
          collection: (handle: string) => `${prefix}/collections/${handle}`,
        },
        url: (path: string) => `${prefix}${path}`,
      } as never;
    },
    readPage: async (market, id) => {
      seen.push({ region: "", market: market.key, page: id });
      return id === 7 ? found : null;
    },
    reads: (context) => {
      const currency = context.region.currencyCode;
      seen.push({ region: currency, market: context.market.key });
      return fakeCatalog(currency === "eur" ? cyprus : unitedStates).reads;
    },
  };
  return { shop, seen };
}

const get = (query: string) => new Request(`http://localhost:8000/next/block-tab?${query}`);

async function answer(query: string, shop = deps().shop) {
  const response = await blockTabResponse(get(query), shop);
  const body = (await response.json()) as { products: { id: string; price: unknown }[] } | null;
  return { response, body };
}

describe("GET /next/block-tab (T81)", () => {
  it("answers a tab's products in the market's region, cached a minute like the listing's", async () => {
    const { response, body } = await answer("market=en-us&doc=7&block=b1&tab=1");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(body?.products.map((p) => p.id)).toEqual(["prod_tee"]);
    expect(JSON.stringify(body)).toContain("USD");
    const cy = await answer("market=el-cy&doc=7&block=b1&tab=2");
    expect(cy.body?.products.map((p) => p.id)).toEqual(["prod_lamp"]);
    expect(JSON.stringify(cy.body)).toContain("EUR");
  });

  it("takes the region from the market alone, whatever the query adds", async () => {
    const { shop, seen } = deps();
    const forged = await answer(
      "market=en-us&doc=7&block=b1&tab=1&region=reg_eur&currency=eur&limit=24&source=newest&mode=newest&sort=price-desc",
      shop,
    );
    const plain = await answer("market=en-us&doc=7&block=b1&tab=1");
    expect(forged.body).toEqual(plain.body);
    expect(seen.filter((each) => each.region !== "")).toEqual([{ region: "usd", market: "en-us" }]);
  });

  it("answers 404, never cached, for anything but a published tabs block's stored tab", async () => {
    for (const query of [
      "doc=7&block=b1&tab=0",
      "market=xx-zz&doc=7&block=b1&tab=0",
      "market=en-us&doc=8&block=b1&tab=0",
      "market=en-us&doc=07&block=b1&tab=0",
      "market=en-us&doc=-7&block=b1&tab=0",
      "market=en-us&doc=7.0&block=b1&tab=0",
      "market=en-us&doc=7&block=draft-only&tab=0",
      "market=en-us&doc=7&block=b2&tab=0",
      "market=en-us&doc=7&block=b3&tab=0",
      "market=en-us&doc=7&block=b1&tab=3",
      "market=en-us&doc=7&block=b1&tab=4",
      "market=en-us&doc=7&block=b1&tab=-1",
      "market=en-us&doc=7&block=b1&tab=1.0",
      "market=en-us&doc=7&block=b1&tab=%201",
      "market=en-us&doc=7&block=b1&tab=",
      "market=en-us&doc=7&block=b%20b&tab=0",
      // The lamp is not sold in the US: its tab has nothing there.
      "market=en-us&doc=7&block=b1&tab=2",
    ]) {
      const { response } = await answer(query);
      expect(response.status, query).toBe(404);
      expect(response.headers.get("cache-control"), query).toBe("no-store");
    }
  });

  it("answers 503 when Medusa does not, and leaves other errors to the route", async () => {
    const { shop } = deps();
    const down: BlockTabDeps = {
      ...shop,
      reads: () => {
        throw new MedusaRequestError("down", "unreachable");
      },
    };
    const { response } = await answer("market=en-us&doc=7&block=b1&tab=0", down);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const broken: BlockTabDeps = { ...shop, readPage: () => Promise.reject(new Error("db")) };
    await expect(
      blockTabResponse(get("market=en-us&doc=7&block=b1&tab=0"), broken),
    ).rejects.toThrow("db");
  });

  it("reads the page published only, never as a draft (no cookie is read)", async () => {
    const { getMarketContext } = await import("../market-context");
    const { catalogReads } = await import("./resolve/market");
    const { shop } = deps();
    const context = await shop.marketContext("en-us");
    vi.mocked(getMarketContext).mockResolvedValue(context as never);
    vi.mocked(catalogReads).mockReturnValue(fakeCatalog(unitedStates).reads);
    readPageById.mockResolvedValue(published);
    const response = await blockTabResponse(get("market=en-us&doc=7&block=b1&tab=1"));
    expect(response.status).toBe(200);
    expect(readPageById).toHaveBeenCalledWith({ market: context?.market, draft: false }, 7);
  });
});
