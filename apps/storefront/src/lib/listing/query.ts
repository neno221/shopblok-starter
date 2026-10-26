// A listing's query (D59, T50): what the filter and sort forms send, read back as the search's
// filters and sort. Plain functions with no server import, because the listing island reads the
// same URL in the browser that the search page and `/next/listing` read on the server.
//
// The parameters are FilterSidebar's field names (`facets.ts` in the registry, `FACET_PARAM` in the
// view models): `category` and `collection` (Medusa's ids, repeated), one parameter per option named
// by the option's id (`opt_…`, its values' ids repeated), `price.min` and `price.max` in major units,
// `sale=1`; then `sort`, `q` (the search page's query), `scope` (the listing a form came from, which
// the search page keeps to: `category:apparel/tops`, `collection:summer-edit`) and `page` (the
// search page's and a filtered listing's page; a listing's own pages are paths).

/** The sorts the forms send (SortSelect's values). `relevance` is the engine's ranking for a query. */
export const LISTING_SORTS = ["relevance", "newest", "price-asc", "price-desc"] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

/** What a listing is: a category (its whole path of handles), a collection, or every product. */
export type ListingScope =
  { kind: "store" } | { kind: "category"; path: string[] } | { kind: "collection"; handle: string };

/** The filters as the search takes them (`SearchFilters` in `lib/medusa/search.ts`). */
export type ListingFilters = {
  categoryIds?: string[];
  collectionIds?: string[];
  optionValueIds?: string[][];
  price?: { min?: number; max?: number };
  onSale?: boolean;
};

export type ListingQuery = {
  query: string;
  filters: ListingFilters;
  /** `null` when the URL names none: the page's default (newest, or relevance with a query). */
  sort: ListingSort | null;
  /** From 1; `null` when the URL names none. */
  page: number | null;
  scope: ListingScope | null;
};

const HANDLE = /^[\w-]+$/;
/** An option's id, as Medusa makes them; any other unknown parameter is ignored. */
const OPTION_PARAM = /^opt_[0-9A-Za-z]+$/;
/** A value's id (Medusa's ids are prefixed ULIDs); a longer or stranger value is no filter. */
const ID = /^[A-Za-z]+_[0-9A-Za-z]{1,64}$/;
const MAX_VALUES = 50;

/** `category:apparel/tops`, `collection:summer`, or `null` for anything else. */
export function parseScope(value: string | null): ListingScope | null {
  if (value === null || value === "") return null;
  if (value === "store") return { kind: "store" };
  const [kind, rest = ""] = value.split(/:(.*)/s, 2);
  if (kind === "collection" && HANDLE.test(rest)) return { kind, handle: rest };
  if (kind === "category") {
    const path = rest.split("/");
    if (path.length > 0 && path.length <= 8 && path.every((part) => HANDLE.test(part)))
      return { kind, path };
  }
  return null;
}

/** The value a form's hidden `scope` field carries for a listing. */
export function scopeValue(scope: ListingScope): string {
  if (scope.kind === "store") return "store";
  return scope.kind === "category"
    ? `category:${scope.path.join("/")}`
    : `collection:${scope.handle}`;
}

const ids = (params: URLSearchParams, name: string): string[] =>
  [...new Set(params.getAll(name))].filter((value) => ID.test(value)).slice(0, MAX_VALUES);

function amount(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function pageOf(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,4}$/.test(value)) return null;
  return Number(value);
}

/** The URL's filters, sort, query, page and scope; a value that is not one is left out. */
export function parseListingQuery(params: URLSearchParams): ListingQuery {
  const filters: ListingFilters = {};
  const categoryIds = ids(params, "category");
  if (categoryIds.length > 0) filters.categoryIds = categoryIds;
  const collectionIds = ids(params, "collection");
  if (collectionIds.length > 0) filters.collectionIds = collectionIds;
  const groups: string[][] = [];
  for (const name of new Set(params.keys()))
    if (OPTION_PARAM.test(name)) {
      const values = ids(params, name);
      if (values.length > 0) groups.push(values);
    }
  if (groups.length > 0) filters.optionValueIds = groups;
  const min = amount(params.get("price.min"));
  const max = amount(params.get("price.max"));
  if (min !== undefined || max !== undefined)
    filters.price = {
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    };
  if (params.get("sale") === "1") filters.onSale = true;
  const sort = params.get("sort");
  return {
    query: (params.get("q") ?? "").trim().slice(0, 200),
    filters,
    sort: LISTING_SORTS.includes(sort as ListingSort) ? (sort as ListingSort) : null,
    page: pageOf(params.get("page")),
    scope: parseScope(params.get("scope")),
  };
}

/** How many filter values are chosen: the chips a visitor sees (a price range is one). */
export function filterCount(filters: ListingFilters): number {
  return (
    (filters.categoryIds?.length ?? 0) +
    (filters.collectionIds?.length ?? 0) +
    (filters.optionValueIds ?? []).reduce((sum, group) => sum + group.length, 0) +
    (filters.price === undefined ? 0 : 1) +
    (filters.onSale === true ? 1 : 0)
  );
}

/** SPEC §12: a listing with more than two facets chosen is `noindex,follow`. */
export const NOINDEX_ABOVE = 2;

/**
 * Whether the URL changes a listing page's results: a filter, a sort or a page in the query. The
 * listing island does nothing (and fetches nothing) when it does not, so a clean URL shows the
 * server's first page as it is (D59).
 */
export function changesListing(query: ListingQuery): boolean {
  return filterCount(query.filters) > 0 || query.sort !== null || query.page !== null;
}

/** The filter parameters' names besides the options' own (`opt_…`). */
const FILTER_PARAMS = ["category", "collection", "price.min", "price.max", "sale"] as const;

/** Whether a parameter is a filter's: one of FilterSidebar's fields. */
export const isFilterParam = (name: string) =>
  (FILTER_PARAMS as readonly string[]).includes(name) || OPTION_PARAM.test(name);

/**
 * The URL's filters and sort alone, in one order (names, then values, sorted), without the page,
 * the query or the scope: the part of a listing's URL that its links keep. Equal choices give equal
 * strings, so `/next/listing` has one cache entry per choice.
 */
export function filterParams(params: URLSearchParams): URLSearchParams {
  const entries = [...params.entries()].filter(
    ([name, value]) => value !== "" && (isFilterParam(name) || name === "sort"),
  );
  const unique = [...new Map(entries.map((entry) => [entry.join("\u0000"), entry])).values()];
  unique.sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : x > y ? 1 : 0) : a < b ? -1 : 1));
  return new URLSearchParams(unique);
}

/** The parameters without one value of one filter (a chip's link), or without all of `names`. */
export function withoutParam(
  params: URLSearchParams,
  name: string,
  value?: string,
): URLSearchParams {
  return new URLSearchParams(
    [...params.entries()].filter(
      ([key, each]) => !(key === name && (value === undefined || each === value)),
    ),
  );
}

/** A path with a query, or the path alone when the query is empty. */
export function withQuery(path: string, params: URLSearchParams): string {
  const text = params.toString();
  return text === "" ? path : `${path}?${text}`;
}
