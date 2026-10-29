import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { localeHeaders, medusaRequest } from "./sdk";

// `POST /store/search` over T43's index (D63): one `search_text` in every store locale, facets as
// ids. The locale goes in `x-medusa-locale`, which the backend's middleware checks against the
// store's and turns into the index's query locale where the provider takes one; the storefront never
// sends `search_options.locales` (the middleware drops it anyway). Hits carry ids and the default
// language's texts, so a page shows them through `listProductsByIds` (translated, priced) and labels
// the facet ids with `listCategories`, `listCollections` and the products' own option values.

/** The sorts a listing offers (SortSelect, T33). `relevance` is the engine's ranking for a query. */
export const SEARCH_SORTS = ["relevance", "newest", "price-asc", "price-desc", "title"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export type SearchFilters = {
  /** Only these products (T64: a product type's, which the index does not hold). */
  productIds?: string[];
  categoryIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
  /**
   * Option values, one group per option: a product matches when it has one value of each group
   * (Colour black or navy, and size M). Groups are ANDed, values in a group ORed.
   */
  optionValueIds?: string[][];
  /** In major units, in the search's currency; either bound may be left out. */
  price?: { min?: number; max?: number };
  onSale?: boolean;
};

export type SearchInput = {
  /** The market's Medusa locale (D8): `x-medusa-locale`. */
  locale: string;
  /** The region's currency, lowercase: picks the `min_price_<currency>` fields (T43). */
  currencyCode: string;
  /** What the visitor typed; empty lists every product (a listing page). */
  query: string;
  filters: SearchFilters;
  sort: SearchSort;
  /** From 1. */
  page: number;
  pageSize: number;
};

export type FacetCount = { value: string; count: number };

export type SearchResult = {
  /** The hits' product ids, in the search's order. */
  ids: string[];
  /** Every product the query and filters match, over all pages. */
  total: number;
  page: number;
  pageCount: number;
  /**
   * Counts per value, each facet counted without its own filter (`disjunctive_facets`), so a
   * checkbox group still shows the values a visitor could add.
   */
  facets: {
    categoryIds: FacetCount[];
    collectionIds: FacetCount[];
    tagIds: FacetCount[];
    optionValueIds: FacetCount[];
    onSale: number;
  };
  /** The price range over the matches, for the slider; `null` when nothing has a price. */
  priceRange: { min: number; max: number } | null;
};

/** The index's names for the filters and facets (T43, `apps/backend/src/search/product.ts`). */
const FIELD = {
  categoryIds: "category_ids",
  collectionIds: "collection_ids",
  tagIds: "tag_ids",
  optionValueIds: "option_value_ids",
} as const;

const currencyOf = (input: Pick<SearchInput, "currencyCode">) => {
  const code = input.currencyCode.toLowerCase();
  // A field name is built from it: refuse anything that is not a currency code.
  if (!/^[a-z]{3}$/.test(code)) throw new Error(`"${input.currencyCode}" is not a currency code`);
  return code;
};

const nonEmpty = (values: string[] | undefined): values is string[] =>
  values !== undefined && values.length > 0;

/** The request body for one search: plain data, which a test reads. */
export function searchBody(input: SearchInput): Record<string, unknown> {
  const currency = currencyOf(input);
  const minPrice = `min_price_${currency}`;
  const onSale = `on_sale_${currency}`;
  const { filters } = input;
  const clauses: Record<string, unknown>[] = [];
  if (filters.productIds !== undefined) clauses.push({ id: filters.productIds });
  for (const key of ["categoryIds", "collectionIds", "tagIds"] as const) {
    const values = filters[key];
    if (nonEmpty(values)) clauses.push({ [FIELD[key]]: values });
  }
  for (const group of filters.optionValueIds ?? [])
    if (group.length > 0) clauses.push({ [FIELD.optionValueIds]: group });
  const { price } = filters;
  if (price !== undefined && (price.min !== undefined || price.max !== undefined))
    clauses.push({
      [minPrice]: {
        ...(price.min === undefined ? {} : { $gte: price.min }),
        ...(price.max === undefined ? {} : { $lte: price.max }),
      },
    });
  if (filters.onSale === true) clauses.push({ [onSale]: true });

  const query = input.query.trim();
  const order: Record<string, "ASC" | "DESC"> | undefined = {
    relevance: undefined,
    newest: { created_at: "DESC" as const },
    "price-asc": { [minPrice]: "ASC" as const },
    "price-desc": { [minPrice]: "DESC" as const },
    title: { title: "ASC" as const },
  }[input.sort];
  // Without a query there is no ranking: the newest first, so a listing's order is stable.
  const effectiveOrder = order ?? (query === "" ? { created_at: "DESC" as const } : undefined);

  return {
    entity: "product",
    fields: ["id"],
    filters: {
      ...(query === "" ? {} : { q: query }),
      ...(clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses }),
    },
    pagination: {
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      ...(effectiveOrder === undefined ? {} : { order: effectiveOrder }),
    },
    search_options: {
      facets: [
        ...Object.values(FIELD).map((field) => ({ field, type: "value" as const, limit: 100 })),
        { field: onSale, type: "value" as const },
        { field: minPrice, type: "stats" as const },
      ],
      disjunctive_facets: true,
    },
  };
}

type WireFacet =
  | { type: "value"; values?: { value: string | number | boolean; count: number }[] }
  | { type: "stats"; min?: number | null; max?: number | null; count?: number }
  | undefined;

export type WireSearchResult = {
  hits?: { id: string }[];
  facets?: Record<string, WireFacet>;
  metadata?: { count?: number; skip?: number; take?: number };
};

const valuesOf = (facet: WireFacet): FacetCount[] =>
  facet?.type === "value"
    ? (facet.values ?? []).map((entry) => ({ value: String(entry.value), count: entry.count }))
    : [];

/** The engine's answer as the DTO. */
export function toSearchResult(input: SearchInput, result: WireSearchResult): SearchResult {
  const currency = currencyOf(input);
  const total = result.metadata?.count ?? 0;
  const stats = result.facets?.[`min_price_${currency}`];
  return {
    ids: (result.hits ?? []).map((hit) => hit.id),
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    facets: {
      categoryIds: valuesOf(result.facets?.[FIELD.categoryIds]),
      collectionIds: valuesOf(result.facets?.[FIELD.collectionIds]),
      tagIds: valuesOf(result.facets?.[FIELD.tagIds]),
      optionValueIds: valuesOf(result.facets?.[FIELD.optionValueIds]),
      onSale:
        valuesOf(result.facets?.[`on_sale_${currency}`]).find((entry) => entry.value === "true")
          ?.count ?? 0,
    },
    priceRange:
      stats?.type === "stats" && typeof stats.min === "number" && typeof stats.max === "number"
        ? { min: stats.min, max: stats.max }
        : null,
  };
}

async function fetchSearch(input: SearchInput): Promise<SearchResult> {
  const answer = await medusaRequest((sdk) =>
    sdk.client.fetch<{ results: WireSearchResult[] }>("/store/search", {
      method: "POST",
      body: searchBody(input),
      headers: localeHeaders(input.locale),
    }),
  );
  return toSearchResult(input, answer.results[0] ?? {});
}

/**
 * One page of products for a query and filters (D59's listing island, the search page, T50). The
 * whole input is the key, so each URL has its entry; tag `search` is what the revalidation
 * subscriber and the price-list job refresh (D58).
 */
export const searchProducts = cached(fetchSearch, {
  name: "medusa:search",
  tags: ["search", "medusa:products"],
  life: CATALOG_LIFE,
});
