import "server-only";
import { catalogs } from "@shopblok/i18n";
import type { Link, SearchResult } from "@shopblok/registry/contracts";
import { cached } from "../cache";
import { getMarketContext } from "../market-context";
import { categoryPaths, listCategories } from "../medusa/categories";
import { listOptionValueLabels, listProductsByIds } from "../medusa/products";
import { searchProducts } from "../medusa/search";
import { MedusaRequestError } from "../medusa/sdk";
import { toProductCard } from "../view-models/product";
import { listingPageSize, readListing, resolveScope, scopeField } from "./listing";
import { parseListingQuery, parseScope } from "./query";

// The listing island's and the search overlay's questions (D59, D63, T50). Neither answer is a
// visitor's: they are the catalog's, in the market's language and currency, so a shared cache may
// keep them a minute. A route handler has no `next/root-params`: the market's key comes in the
// query, like the visitor's handlers (`lib/visitor/handlers.ts`).

/** A catalog's answer: the same for every visitor of the market, a minute old at most. */
export const CATALOG_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
} as const;

const nothing = (status: number) =>
  Response.json(null, { status, headers: { "Cache-Control": "no-store" } });

/** Medusa down is a 503 the island can wait out; anything else is the server's fault. */
function failure(error: unknown): Response {
  if (error instanceof MedusaRequestError) return nothing(503);
  throw error;
}

/**
 * `GET /next/listing?market=&scope=&page=&…filters`: one page of a listing with the URL's filters
 * and sort, as `ListingResults`. 400 for a scope that is none, 404 for a market, listing or page
 * that is not there.
 */
export async function listingResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const scope = parseScope(params.get("scope"));
  if (scope === null) return nothing(400);
  try {
    const context = await getMarketContext(params.get("market") ?? "");
    if (context === null) return nothing(404);
    const messages = catalogs[context.market.locale];
    const resolved = await resolveScope(context, messages, scope);
    if (resolved === null) return nothing(404);
    const results = await readListing({
      context,
      messages,
      resolved,
      // A listing's island never sends words: a query is the search page's.
      query: { ...parseListingQuery(params), query: "" },
      params,
      pathPage: 1,
      pageSize: listingPageSize(),
      links: {
        base: { path: context.url(resolved.path), params: new URLSearchParams() },
        formAction: context.url("/search"),
        hidden: [scopeField(scope)],
      },
    });
    if (results === null) return nothing(404);
    return Response.json(results, { headers: CATALOG_HEADERS });
  } catch (error) {
    return failure(error);
  }
}

/** The overlay's products, categories and suggestions (SPEC §8.4). */
export const OVERLAY_PRODUCTS = 8;
const OVERLAY_LINKS = 4;

async function overlayResult(market: string, query: string): Promise<SearchResult | null> {
  const context = await getMarketContext(market);
  if (context === null) return null;
  const { region } = context;
  const locale = context.market.medusaLocale;
  const result = await searchProducts({
    locale,
    currencyCode: region.currencyCode,
    query,
    filters: {},
    sort: "relevance",
    page: 1,
    pageSize: OVERLAY_PRODUCTS,
  });
  const [products, categories, optionValues] = await Promise.all([
    result.ids.length === 0
      ? Promise.resolve([])
      : listProductsByIds(result.ids, { regionId: region.id, locale }),
    listCategories(locale),
    listOptionValueLabels(locale),
  ]);
  const byCount = <T extends { count: number }>(rows: readonly T[]) =>
    rows.filter((row) => row.count > 0).toSorted((a, b) => b.count - a.count);
  const byId = new Map(categoryPaths(categories).map((entry) => [entry.node.id, entry]));
  const categoryLinks: Link[] = byCount(result.facets.categoryIds)
    .flatMap(({ value }) => {
      const entry = byId.get(value);
      return entry === undefined
        ? []
        : [{ label: entry.node.name, href: context.hrefs.category(entry.path.join("/")) }];
    })
    .slice(0, OVERLAY_LINKS);
  // The suggestions are the matches' option values, which the index searches too: a word that
  // narrows the query ("Black"), never one shorter than three letters (a size).
  const lower = query.toLocaleLowerCase(context.market.htmlLang);
  const values = new Map(optionValues.map((each) => [each.valueId, each.value]));
  const suggestions = [
    ...new Set(
      byCount(result.facets.optionValueIds).flatMap(({ value }) => {
        const label = values.get(value);
        return label === undefined ||
          label.length < 3 ||
          label.toLocaleLowerCase(context.market.htmlLang) === lower
          ? []
          : [label];
      }),
    ),
  ].slice(0, OVERLAY_LINKS);
  return {
    query,
    total: result.total,
    products: products.flatMap((product) => toProductCard(product, context.hrefs) ?? []),
    categories: categoryLinks,
    suggestions,
  };
}

/** A minute per query and market (T50 step 4): the overlay asks at every pause in typing. */
const cachedOverlayResult = cached(overlayResult, {
  name: "listing:overlay",
  tags: ["search", "medusa:products"],
  life: { stale: 60, revalidate: 60, expire: 3600 },
});

/** `GET /next/search?market=&q=`: the overlay's answer for a query; 404 for a market that is none. */
export async function searchResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 200);
  if (query === "") return nothing(400);
  try {
    const result = await cachedOverlayResult(params.get("market") ?? "", query);
    return result === null ? nothing(404) : Response.json(result, { headers: CATALOG_HEADERS });
  } catch (error) {
    return failure(error);
  }
}
