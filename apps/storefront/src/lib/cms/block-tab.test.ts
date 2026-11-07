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
import { documentRef } from "./catalog-sections";
import type { CmsPage } from "./pages";
import { tabVersion } from "./resolve/tabs";

const readPageById = vi.hoisted(() => vi.fn());
const readProductSections = vi.hoisted(() => vi.fn());
const readTemplateSections = vi.hoisted(() => vi.fn());
vi.mock("./pages", () => ({ readPageById }));
vi.mock("./catalog", () => ({
  OWN_SECTIONS: { products: readProductSections, categories: vi.fn(), collections: vi.fn() },
}));
vi.mock("./templates", () => ({ readTemplateSections }));
vi.mock("../market-context", () => ({ getMarketContext: vi.fn() }));
vi.mock("./resolve/market", () => ({ catalogReads: vi.fn() }));

const { blockTabResponse } = await import("./block-tab");

const tabs = [
  { label: "Basics", productSource: { mode: "collection", collection: synced("col_basics") } },
  { label: "On sale", productSource: { mode: "onSale", limit: 2 } },
  { label: "Lamps", productSource: { mode: "handpicked", products: [synced("prod_lamp")] } },
];

/** Stored tab `index`'s fingerprint, as the page's endpoint carries it. */
const v = (index: number) => tabVersion(tabs[index] ?? {});

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
  const seen: { region: string; market: string; document?: string }[] = [];
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
    readBlocks: async (market, document) => {
      seen.push({ region: "", market: market.key, document: documentRef(document) });
      return document.kind === "page" && document.id === 7 ? (found?.layout ?? null) : null;
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
    const { response, body } = await answer(`market=en-us&doc=7&block=b1&tab=1&v=${v(1)}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(body?.products.map((p) => p.id)).toEqual(["prod_tee"]);
    expect(JSON.stringify(body)).toContain("USD");
    const cy = await answer(`market=el-cy&doc=7&block=b1&tab=2&v=${v(2)}`);
    expect(cy.body?.products.map((p) => p.id)).toEqual(["prod_lamp"]);
    expect(JSON.stringify(cy.body)).toContain("EUR");
  });

  it("takes the region from the market alone, whatever the query adds", async () => {
    const { shop, seen } = deps();
    const forged = await answer(
      `market=en-us&doc=7&block=b1&tab=1&v=${v(1)}&region=reg_eur&currency=eur&limit=24&source=newest&mode=newest&sort=price-desc`,
      shop,
    );
    const plain = await answer(`market=en-us&doc=7&block=b1&tab=1&v=${v(1)}`);
    expect(forged.body).toEqual(plain.body);
    expect(seen.filter((each) => each.region !== "")).toEqual([{ region: "usd", market: "en-us" }]);
  });

  it("answers 404, never cached, for anything but a published tabs block's stored tab", async () => {
    for (const query of [
      "doc=7&block=b1&tab=0",
      "market=xx-zz&doc=7&block=b1&tab=0",
      `market=en-us&doc=8&block=b1&tab=0&v=${v(0)}`,
      "market=en-us&doc=07&block=b1&tab=0",
      "market=en-us&doc=-7&block=b1&tab=0",
      "market=en-us&doc=7.0&block=b1&tab=0",
      `market=en-us&doc=7&block=draft-only&tab=0&v=${v(0)}`,
      `market=en-us&doc=7&block=b2&tab=0&v=${v(0)}`,
      `market=en-us&doc=7&block=b3&tab=0&v=${v(0)}`,
      "market=en-us&doc=7&block=b1&tab=3",
      "market=en-us&doc=7&block=b1&tab=4",
      "market=en-us&doc=7&block=b1&tab=-1",
      "market=en-us&doc=7&block=b1&tab=1.0",
      "market=en-us&doc=7&block=b1&tab=%201",
      "market=en-us&doc=7&block=b1&tab=",
      "market=en-us&doc=7&block=b%20b&tab=0",
      // The lamp is not sold in the US: its tab has nothing there.
      `market=en-us&doc=7&block=b1&tab=2&v=${v(2)}`,
      // No fingerprint, a forged one, another tab's: the stored tab is not the one asked for.
      "market=en-us&doc=7&block=b1&tab=1",
      "market=en-us&doc=7&block=b1&tab=1&v=forged",
      `market=en-us&doc=7&block=b1&tab=1&v=${v(0)}`,
    ]) {
      const { response } = await answer(query);
      expect(response.status, query).toBe(404);
      expect(response.headers.get("cache-control"), query).toBe("no-store");
    }
  });

  it("answers 404 for a tab moved or edited since the page was drawn, never another tab's products", async () => {
    // The editor swapped "On sale" and "Lamps", then renamed "Basics" and republished.
    const [basics, onSale, lamps] = tabs;
    const swapped = page([
      {
        id: "b1",
        blockType: "productCollection",
        variant: "tabs",
        heading: "Edit",
        tabs: [{ ...basics, label: "Everyday" }, lamps, onSale],
      },
    ]);
    const { shop } = deps(swapped);
    // The old page's "On sale" URL names stored place 1, now the lamps: a 404, not the lamps.
    const moved = await answer(`market=el-cy&doc=7&block=b1&tab=1&v=${v(1)}`, shop);
    expect(moved.response.status).toBe(404);
    expect(moved.response.headers.get("cache-control")).toBe("no-store");
    const renamed = await answer(`market=en-us&doc=7&block=b1&tab=0&v=${v(0)}`, shop);
    expect(renamed.response.status).toBe(404);
    // The republished page's URL for "On sale" (its new place, the same fingerprint) answers.
    const now = await answer(`market=en-us&doc=7&block=b1&tab=2&v=${v(1)}`, shop);
    expect(now.body?.products.map((p) => p.id)).toEqual(["prod_tee"]);
  });

  it("fingerprints a tab by its label and source, its references by their Payload ids", () => {
    expect(v(1)).toMatch(/^[\w-]{12}$/);
    expect(new Set([v(0), v(1), v(2)]).size).toBe(3);
    // A populated reference and its id alone are the same tab; a synced field changing is too.
    const byId = { label: "Lamps", productSource: { mode: "handpicked", products: [{ id: 3 }] } };
    const populated = {
      label: "Lamps",
      productSource: {
        mode: "handpicked",
        products: [{ id: 3, medusaId: "prod_lamp", updatedAt: "later" }],
      },
    };
    expect(tabVersion(populated)).toBe(tabVersion(byId));
    expect(tabVersion({ ...byId, productSource: { mode: "handpicked", products: [3] } })).toBe(
      tabVersion(byId),
    );
    expect(tabVersion({ ...byId, productSource: { ...byId.productSource, limit: 4 } })).not.toBe(
      tabVersion(byId),
    );
  });

  it("answers 503 when Medusa does not, and leaves other errors to the route", async () => {
    const { shop } = deps();
    const down: BlockTabDeps = {
      ...shop,
      reads: () => {
        throw new MedusaRequestError("down", "unreachable");
      },
    };
    const { response } = await answer(`market=en-us&doc=7&block=b1&tab=0&v=${v(0)}`, down);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const broken: BlockTabDeps = { ...shop, readBlocks: () => Promise.reject(new Error("db")) };
    await expect(
      blockTabResponse(get(`market=en-us&doc=7&block=b1&tab=0&v=${v(0)}`), broken),
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
    const response = await blockTabResponse(get(`market=en-us&doc=7&block=b1&tab=1&v=${v(1)}`));
    expect(response.status).toBe(200);
    expect(readPageById).toHaveBeenCalledWith({ market: context?.market, draft: false }, 7);
  });

  it("reads a product's own sections only while its mode is own, published only (T87, D104)", async () => {
    const { getMarketContext } = await import("../market-context");
    const { catalogReads } = await import("./resolve/market");
    const { shop } = deps();
    const context = await shop.marketContext("en-us");
    vi.mocked(getMarketContext).mockResolvedValue(context as never);
    vi.mocked(catalogReads).mockReturnValue(fakeCatalog(unitedStates).reads);
    const sections = published.layout;
    readProductSections.mockResolvedValue({ mode: "own", sections });
    const own = await blockTabResponse(
      get(`market=en-us&doc=product:demo-tee&block=b1&tab=1&v=${v(1)}`),
    );
    expect(own.status).toBe(200);
    expect(readProductSections).toHaveBeenCalledWith(
      { market: context?.market, draft: false },
      "demo-tee",
    );
    // Stored, but the product shows the default sections or none: its page draws no such block.
    for (const mode of ["default", "none"]) {
      readProductSections.mockResolvedValue({ mode, sections });
      const hidden = await blockTabResponse(
        get(`market=en-us&doc=product:demo-tee&block=b1&tab=1&v=${v(1)}`),
      );
      expect(hidden.status, mode).toBe(404);
    }
  });

  it("reads the templates global's default sections, published only (T87, D104)", async () => {
    const { getMarketContext } = await import("../market-context");
    const { catalogReads } = await import("./resolve/market");
    const { shop } = deps();
    const context = await shop.marketContext("en-us");
    vi.mocked(getMarketContext).mockResolvedValue(context as never);
    vi.mocked(catalogReads).mockReturnValue(fakeCatalog(unitedStates).reads);
    readTemplateSections.mockResolvedValue(published.layout);
    const response = await blockTabResponse(
      get(`market=en-us&doc=templates:listing&block=b1&tab=1&v=${v(1)}`),
    );
    expect(response.status).toBe(200);
    expect(readTemplateSections).toHaveBeenCalledWith(
      { market: context?.market, draft: false },
      "listing",
    );
  });

  it("answers 404 for a document it does not name", async () => {
    for (const doc of [
      "templates:cart",
      "templates:",
      "product:",
      "product:a b",
      "products:demo-tee",
      "page:7",
      "brand:demo",
      `product:${"a".repeat(129)}`,
    ]) {
      const { response } = await answer(
        `market=en-us&doc=${encodeURIComponent(doc)}&block=b1&tab=1&v=${v(1)}`,
      );
      expect(response.status, doc).toBe(404);
    }
  });
});
