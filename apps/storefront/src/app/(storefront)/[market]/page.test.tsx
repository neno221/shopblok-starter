import { catalogs, formatMoney } from "@shopblok/i18n";
import { prerender } from "react-dom/static";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Categories from "../../../lib/medusa/categories";
import type { CategoryNode } from "../../../lib/medusa/categories";
import type { ProductDto } from "../../../lib/medusa/products";
import type { SearchInput } from "../../../lib/medusa/search";
import type { MarketMap } from "../../../lib/markets/types";
import type * as Prerender from "../../../lib/prerender";
import { mongolia, seeded } from "../../../lib/markets/test-maps";
import { siteText } from "../../../lib/site";

// T51: the home from Medusa's data, through the page's own reads. Medusa's answers are stand-ins;
// the market map, the catalogs, the view model and the template are the real ones.

const state = vi.hoisted(() => ({
  key: "",
  map: undefined as unknown as MarketMap,
  regions: true,
  tree: [] as CategoryNode[],
  /** Product ids per category id; the new arrivals are every product, newest first. */
  byCategory: {} as Record<string, string[]>,
  products: [] as ProductDto[],
}));
vi.mock("next/root-params", () => ({ market: async () => state.key }));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: false }) }));
vi.mock("../../../lib/markets/cached-market-map", () => ({
  getRenderMarketMap: async () => state.map,
}));
vi.mock("../../../lib/prerender", async (original) => ({
  ...(await original<typeof Prerender>()),
  buildReadsMedusa: () => true,
}));
vi.mock("../../../lib/medusa/regions", () => ({
  getRegionForCountry: async (country: string) =>
    state.regions
      ? {
          id: "reg_1",
          name: `Region of ${country}`,
          currencyCode: country === "mn" ? "mnt" : "eur",
          countries: [country],
        }
      : undefined,
}));
vi.mock("../../../lib/medusa/categories", async (original) => ({
  ...(await original<typeof Categories>()),
  listCategories: async () => state.tree,
}));
vi.mock("../../../lib/medusa/search", () => ({
  searchProducts: async ({ filters, pageSize }: SearchInput) => {
    const ids =
      filters.categoryIds === undefined
        ? state.products.map((each) => each.id)
        : [...new Set(filters.categoryIds.flatMap((id) => state.byCategory[id] ?? []))];
    return { ids: ids.slice(0, pageSize), total: ids.length, page: 1, pageCount: 1 };
  },
}));
vi.mock("../../../lib/medusa/products", () => ({
  listProductsByIds: async (ids: string[]) =>
    ids.flatMap((id) => state.products.find((each) => each.id === id) ?? []),
}));

import MarketHome, { generateMetadata } from "./page";

afterEach(() => {
  state.key = "";
  state.regions = true;
  state.tree = [];
  state.byCategory = {};
  state.products = [];
});

function product(id: string, amount: number, image: string | null): ProductDto {
  return {
    id,
    handle: id,
    title: `Product ${id}`,
    subtitle: null,
    description: "",
    thumbnail: image,
    images: image === null ? [] : [{ id: `img_${id}`, url: image }],
    options: [],
    variants: [
      {
        id: `var_${id}`,
        title: "Default",
        sku: null,
        options: {},
        price: { amount, currencyCode: "eur" },
        compareAt: null,
        stock: { status: "in-stock" },
        available: true,
        thumbnail: null,
      },
    ],
    categories: [],
    collectionId: null,
    tagIds: [],
  };
}

const node = (id: string, name: string, children: CategoryNode[] = []): CategoryNode => ({
  id,
  handle: id,
  name,
  children,
});

function shop() {
  state.tree = [
    node("apparel", "Ρούχα", [node("tops", "Μπλούζες")]),
    node("home", "Σπίτι"),
    node("empty", "Άδεια"),
  ];
  // Apparel's only product is in its child category: a parent shows its children's pictures.
  state.byCategory = { tops: ["tee"], home: ["vase"] };
  state.products = [product("tee", 25, "https://cdn.example/tee.jpg"), product("vase", 40, null)];
}

/** The page's HTML for a market (`prerender` waits for every read). */
async function render(map: MarketMap, key: string): Promise<string> {
  state.map = map;
  state.key = key;
  const { prelude } = await prerender(await MarketHome());
  return new Response(prelude).text();
}

const decode = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

/** The `href`s of the elements of one `data-slot`, in order. */
const hrefsOf = (html: string, slot: string) =>
  [...html.matchAll(new RegExp(`<a[^>]*data-slot="${slot}"[^>]*>`, "g"))].map(
    ([tag]) => /href="([^"]*)"/.exec(tag)?.[1],
  );

const jsonLd = (html: string) => {
  const found = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  return JSON.parse(found?.[1] ?? "null") as { "@graph": Record<string, unknown>[] };
};

describe("the home page (T51)", () => {
  it("is the Greek market's home in Greek: hero, categories, new arrivals and every product", async () => {
    shop();
    const html = decode(await render(seeded, "el-cy"));
    const words = catalogs.el.templates.home;
    const hero = siteText("el").hero;
    expect(html).toContain(`>${hero.title}</h1>`);
    expect(html).toContain(hero.text);
    expect(hrefsOf(html, "home-hero-action")).toEqual(["/store"]);
    expect(html).toContain(`>${words.categories}</h2>`);
    expect(html).toContain(`>${words.newArrivals}</h2>`);
    expect(hrefsOf(html, "home-shop-all")).toEqual(["/store"]);
    expect(html).toContain(words.shopAll);
    // The money in the market's currency, written the Greek way.
    expect(html).toContain(formatMoney(25, "eur", "el-CY"));
  });

  it("draws the top-level categories, each with its first product's picture when it has one", async () => {
    shop();
    const html = decode(await render(seeded, "el-cy"));
    expect(hrefsOf(html, "home-category")).toEqual([
      "/categories/apparel",
      "/categories/home",
      "/categories/empty",
    ]);
    const tiles = html.split('data-slot="home-category"').slice(1);
    expect(tiles[0]).toContain("tee.jpg");
    // The vase has no picture and the empty category no product: no picture, not the placeholder.
    expect(tiles[1]?.split("</a>")[0]).not.toContain("<img");
    expect(tiles[2]?.split("</a>")[0]).not.toContain("<img");
    // The tiles' pictures are decoration: the link's name is the category's.
    expect(tiles[0]?.split("</a>")[0]).toContain('alt=""');
  });

  it("looks past a product the channel does not sell and a first image it cannot use", async () => {
    shop();
    // Home's newest is not sold here (the search has it, the product read drops it); the next one's
    // first image is not a URL the page can use, so its thumbnail is the picture.
    state.byCategory.home = ["unsold", "bowl", "vase"];
    state.products.push({
      ...product("bowl", 30, "https://cdn.example/bowl-thumb.jpg"),
      images: [{ id: "img_bowl", url: "uploads/bowl.jpg" }],
    });
    const html = decode(await render(seeded, "el-cy"));
    const tiles = html.split('data-slot="home-category"').slice(1);
    expect(tiles[1]?.split("</a>")[0]).toContain("bowl-thumb.jpg");
  });

  it("is the hero and the link to every product alone in a shop with nothing yet", async () => {
    const html = decode(await render(seeded, "en-us"));
    expect(html).not.toContain('data-slot="home-categories"');
    expect(html).not.toContain('data-slot="product-carousel"');
    expect(html).toContain(`>${siteText("en").hero.title}</h1>`);
    expect(hrefsOf(html, "home-shop-all")).toEqual(["/us/store"]);
  });

  it("is in English for a language without a catalog, with the shop's English hero", async () => {
    const overridden: MarketMap = {
      ...mongolia,
      languages: [{ code: "mn", medusaLocale: "mn-MN", htmlLang: "mn" }],
    };
    shop();
    const html = decode(await render(overridden, "mn-mn"));
    expect(html).toContain(`>${siteText("mn").hero.title}</h1>`);
    expect(siteText("mn")).toBe(siteText("en"));
    expect(html).toContain(`>${catalogs.en.templates.home.newArrivals}</h2>`);
  });

  it("has the shop and the market's site, with its search, as JSON-LD", async () => {
    const html = await render(seeded, "en-us");
    const [organization, site] = jsonLd(html)["@graph"];
    expect(organization).toMatchObject({ "@type": "Organization", name: "Shopblok" });
    expect(site).toMatchObject({
      "@type": "WebSite",
      url: "http://localhost:8000/us",
      inLanguage: "en-US",
      publisher: { "@id": organization?.["@id"] },
      potentialAction: {
        "@type": "SearchAction",
        target: { urlTemplate: "http://localhost:8000/us/search?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    });
  });

  it("is self-canonical with the other markets' homes as alternates", async () => {
    state.map = seeded;
    state.key = "en-us";
    const metadata = await generateMetadata();
    expect(metadata.alternates?.canonical).toBe("/us");
    expect(Object.keys(metadata.alternates?.languages ?? {})).toContain("el-CY");
    expect(metadata.description).toBe(siteText("en").hero.text);
  });

  it("is a 404 for a market whose country has no region", async () => {
    state.regions = false;
    await expect(render(seeded, "en-us")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});
