import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { encodePagePath, pageIdOf } from "../cms/page-path";
import { journalPath, postPath } from "../cms/paths";
import { readHomepageId, readPagePaths } from "../cms/pages";
import { readPostSlugs } from "../cms/posts";
import { cmsRead } from "../cms/read";
import { pageTags, postTags } from "../cms/tags";
import { listMarkets } from "../markets/market";
import type { Market, MarketMap } from "../markets/types";
import { categoryPaths, toCategoryTree, type WireCategory } from "../medusa/categories";
import { PRODUCT_DETAIL_FIELDS, toProductDto, type WireProduct } from "../medusa/products";
import { getRegionForCountry } from "../medusa/regions";
import { medusaRequest } from "../medusa/sdk";
import { buildReadsMedusa } from "../prerender";
import { toProductDetail } from "../view-models/product";
import { addressCount, newest, sitemapIdsByMarket, type SitemapAddress } from "./sitemap";

// M7 D147 (T110): what each market's sitemap lists, from cached reads tagged as the catalog's and
// Payload's other reads are (`medusa:products`, `medusa:categories`, `medusa:collections`,
// `pages:<locale>`, `posts:<locale>`), so the revalidation that refreshes a page refreshes its
// sitemap too and no hook has a tag of its own to send. Without `MEDUSA_BACKEND_URL` (D10's
// stand-in: CI's `check` and design-system builds) the catalog asks Medusa nothing and is empty.

const PAGE_SIZE = 100;

/** A product a market sells: its handle and when it last changed. */
export type SoldProduct = { handle: string; updatedAt?: string };

const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);

/** `toProductDetail`'s hrefs, which only the answer's `null` is read for here. */
const NO_HREFS = { product: () => "", category: () => "", collection: () => "" };
const NO_HOME = { label: "", href: "" };

async function fetchSoldProducts(regionId: string): Promise<SoldProduct[]> {
  const sold: SoldProduct[] = [];
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.product.list({
        region_id: regionId,
        fields: `${PRODUCT_DETAIL_FIELDS},updated_at`,
        order: "handle",
        limit: PAGE_SIZE,
        offset,
      }),
    );
    for (const row of page.products as unknown as (WireProduct & { updated_at?: unknown })[]) {
      // The product page's own rule (`readMarketProduct`): a product with no variant it can show
      // in the region is a 404 there, so it is not in the market's sitemap.
      if (toProductDetail(toProductDto(row), { hrefs: NO_HREFS, home: NO_HOME }) === null) continue;
      const updatedAt = text(row.updated_at);
      sold.push({ handle: row.handle, ...(updatedAt === undefined ? {} : { updatedAt }) });
    }
    offset += page.products.length;
    if (page.products.length === 0 || offset >= page.count) return sold;
  }
}

/** The products a region's markets sell (a page that is not a 404 there), in handle order. */
export const listSoldProducts = cached(fetchSoldProducts, {
  name: "seo:sitemap:products",
  tags: ["medusa:products"],
  life: CATALOG_LIFE,
});

/** A category's or a collection's address: its path of handles and when it last changed. */
export type DatedHandle = { path: string; updatedAt?: string };

async function fetchCategoryDates(): Promise<DatedHandle[]> {
  const rows: (WireCategory & { updated_at?: unknown })[] = [];
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.category.list({
        fields: "id,handle,name,rank,parent_category_id,updated_at",
        limit: PAGE_SIZE,
        offset,
      }),
    );
    rows.push(...(page.product_categories as unknown as typeof rows));
    offset += page.product_categories.length;
    if (page.product_categories.length === 0 || offset >= page.count) break;
  }
  const dates = new Map(rows.map((row) => [row.id, text(row.updated_at)]));
  // The tree the navigation builds (`toCategoryTree`), so a category's address is its whole path
  // of handles, as `hrefsFor` links it.
  return categoryPaths(toCategoryTree(rows)).map(({ node, path }) => {
    const updatedAt = dates.get(node.id);
    return {
      path: path.map(encodeURIComponent).join("/"),
      ...(updatedAt === undefined ? {} : { updatedAt }),
    };
  });
}

/** Every published category, at its whole path of handles. */
export const listCategoryDates = cached(fetchCategoryDates, {
  name: "seo:sitemap:categories",
  tags: ["medusa:categories"],
  life: CATALOG_LIFE,
});

async function fetchCollectionDates(): Promise<DatedHandle[]> {
  const found: DatedHandle[] = [];
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.collection.list({ fields: "id,handle,updated_at", limit: PAGE_SIZE, offset }),
    );
    for (const row of page.collections as unknown as { handle?: unknown; updated_at?: unknown }[]) {
      const handle = text(row.handle);
      if (handle === undefined) continue;
      const updatedAt = text(row.updated_at);
      found.push({
        path: encodeURIComponent(handle),
        ...(updatedAt === undefined ? {} : { updatedAt }),
      });
    }
    offset += page.collections.length;
    if (page.collections.length === 0 || offset >= page.count) return found;
  }
}

/** Every published collection. */
export const listCollectionDates = cached(fetchCollectionDates, {
  name: "seo:sitemap:collections",
  tags: ["medusa:collections"],
  life: CATALOG_LIFE,
});

/** Each published document's `updatedAt` by its id (Payload keeps one per document, not per language). */
type Dates = Record<string, string>;

const datesOf = (docs: readonly { id: number; updatedAt?: unknown }[]): Dates =>
  Object.fromEntries(
    docs.flatMap((doc) => {
      const date = text(doc.updatedAt);
      return date === undefined ? [] : [[String(doc.id), date]];
    }),
  );

const readPageDates = cmsRead(
  async (payload, query): Promise<Dates> => {
    const { docs } = await payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { updatedAt: true },
      limit: 0,
      pagination: false,
    });
    return datesOf(docs);
  },
  { name: "seo:sitemap:page-dates", tags: (locale) => pageTags(locale) },
);

const readPostDates = cmsRead(
  async (payload, query): Promise<Dates> => {
    const { docs } = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { updatedAt: true },
      limit: 0,
      pagination: false,
    });
    return datesOf(docs);
  },
  { name: "seo:sitemap:post-dates", tags: (locale) => postTags(locale) },
);

const published = (language: string) => ({ market: { language }, draft: false });

/** The catalog a market sells: its region's products, and every category and collection. */
async function catalogOf(market: Market) {
  if (!buildReadsMedusa()) return { products: [], categories: [], collections: [] };
  const region = await getRegionForCountry(market.country);
  const [products, categories, collections] = await Promise.all([
    region === undefined ? [] : listSoldProducts(region.id),
    listCategoryDates(),
    listCollectionDates(),
  ]);
  return { products, categories, collections };
}

/**
 * Every address of a market's sitemap (D147): its home, the store, the journal when it has a post,
 * every product it sells, every category and collection, and every page and post it publishes in
 * its language (the homepage at the market's home, not at its own address, as its canonical says).
 * The pages' and posts' addresses come from the same per-language reads their routes and hreflang
 * use, so the sitemap and the pages agree on every address.
 */
export async function marketAddresses(market: Market, map: MarketMap): Promise<SitemapAddress[]> {
  const languages = [...new Set(listMarkets(map).map((each) => each.language))];
  const [catalog, pagePaths, postSlugs, pageDates, postDates, homepage] = await Promise.all([
    catalogOf(market),
    Promise.all(languages.map((language) => readPagePaths(published(language)))),
    Promise.all(languages.map((language) => readPostSlugs(published(language)))),
    readPageDates(published(market.language)),
    readPostDates(published(market.language)),
    readHomepageId(published(market.language)),
  ]);
  const pagesIn = Object.fromEntries(languages.map((language, i) => [language, pagePaths[i]]));
  const postsIn = Object.fromEntries(languages.map((language, i) => [language, postSlugs[i]]));

  const own = pagePaths[languages.indexOf(market.language)];
  const pages: SitemapAddress[] = Object.keys(own?.byId ?? {}).flatMap((id) => {
    if (pageIdOf(id) === homepage) return [];
    const updatedAt = pageDates?.[id];
    return [
      {
        path: (each: Market) => {
          const path = pagesIn[each.language]?.byId[id]?.path;
          return path === undefined ? null : encodePagePath(path);
        },
        ...(updatedAt === undefined ? {} : { lastModified: updatedAt }),
      },
    ];
  });
  const ownPosts = postSlugs[languages.indexOf(market.language)];
  const posts: SitemapAddress[] = Object.keys(ownPosts?.byId ?? {}).map((id) => {
    const updatedAt = postDates?.[id];
    return {
      path: (each: Market) => postPath(postsIn[each.language]?.byId[id]),
      ...(updatedAt === undefined ? {} : { lastModified: updatedAt }),
    };
  });
  const dated = (path: string, updatedAt: string | undefined): SitemapAddress => ({
    path,
    ...(updatedAt === undefined ? {} : { lastModified: updatedAt }),
  });
  const products = catalog.products.map((product) =>
    dated(`/products/${encodeURIComponent(product.handle)}`, product.updatedAt),
  );
  const categories = catalog.categories.map((each) =>
    dated(`/categories/${each.path}`, each.updatedAt),
  );
  const collections = catalog.collections.map((each) =>
    dated(`/collections/${each.path}`, each.updatedAt),
  );
  const lastOf = (addresses: readonly SitemapAddress[]) =>
    newest(addresses.map((address) => address.lastModified));
  const rest = [...products, ...categories, ...collections, ...pages, ...posts];
  return [
    dated("/", lastOf(rest)),
    dated("/store", lastOf(products)),
    ...(posts.length === 0 ? [] : [dated(journalPath(), lastOf(posts))]),
    ...rest,
  ];
}

/**
 * Every market's sitemap ids (`{key}`, then `{key}_2`… past 50,000 addresses), by the market's key:
 * what `generateSitemaps()` returns and what `robots.txt` lists. A market whose reads fail (Payload
 * or Medusa down while an entry is cold) keeps its first sitemap, with one warning, so `robots.txt`
 * and the other markets' sitemaps never answer 500 for it (PR 155 review, item 2): a crawler takes a
 * 5xx `robots.txt` as "crawl nothing".
 */
export async function sitemapIds(map: MarketMap): Promise<Record<string, string[]>> {
  const markets = listMarkets(map);
  const counts = await Promise.all(
    markets.map(async (market) => {
      try {
        return [market.key, addressCount(market, await marketAddresses(market, map))] as const;
      } catch (error) {
        console.warn(
          `sitemap: ${market.key}'s addresses could not be read, so it keeps one sitemap (${error instanceof Error ? error.message : String(error)})`,
        );
        return [market.key, 0] as const;
      }
    }),
  );
  return sitemapIdsByMarket(Object.fromEntries(counts), map);
}
