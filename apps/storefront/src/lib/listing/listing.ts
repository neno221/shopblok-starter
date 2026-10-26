import "server-only";
import { formatMessage, formatNumberRange, type Messages } from "@shopblok/i18n";
import type {
  ActiveFilter,
  ActiveFilters,
  Breadcrumbs,
  EmptyStateContent,
  FacetGroup,
  ListingResults,
  Link,
  QueryParam,
  SortState,
} from "@shopblok/registry/contracts";
import { env, type RawEnv } from "../env";
import type { MarketContext } from "../market-context";
import { flattenCategories, listCategories, type CategoryNode } from "../medusa/categories";
import { listCollections } from "../medusa/collections";
import { listOptionValueLabels, listProductsByIds } from "../medusa/products";
import { searchProducts, type SearchFilters, type SearchSort } from "../medusa/search";
import { FACET_PARAM, toFacetGroups } from "../view-models/facets";
import { toProductCard } from "../view-models/product";
import {
  filterCount,
  filterParams,
  scopeValue,
  withoutParam,
  withQuery,
  type ListingQuery,
  type ListingScope,
  type ListingSort,
} from "./query";

// A listing's results (D59, T50): one search and its labels, as the template's `ListingResults`.
// The listing pages draw the first page with no filter on the server, the listing island asks
// `/next/listing` for the same thing with the URL's filters, and the search page draws it for its
// query. Every read is a `cached()` entry, so a listing page stays in the static shell.

export const DEFAULT_LISTING_PAGE_SIZE = 24;

/** `STOREFRONT_LISTING_PAGE_SIZE`: products per page, 1 to 48 (ProductGrid's most); 24 unset. */
export function listingPageSize(source: RawEnv = env): number {
  const raw = source.STOREFRONT_LISTING_PAGE_SIZE?.trim();
  if (raw === undefined || raw === "") return DEFAULT_LISTING_PAGE_SIZE;
  const size = Number(raw);
  if (!Number.isInteger(size) || size < 1 || size > 48)
    throw new Error(
      `STOREFRONT_LISTING_PAGE_SIZE must be a whole number from 1 to 48, not "${raw}"`,
    );
  return size;
}

/** A listing as its page names it: its trail, its name, its path in the market, its search's filter. */
export type ResolvedScope = {
  scope: ListingScope;
  title: string;
  /** Home first, then the parent categories. */
  trail: Link[];
  /** The listing's first page, inside the market (`/categories/apparel`). */
  path: string;
  /** What the scope adds to every search of it: a category and its children, or a collection. */
  filters: SearchFilters;
};

function categoryAt(tree: readonly CategoryNode[], path: readonly string[]): CategoryNode[] | null {
  const nodes: CategoryNode[] = [];
  let level = tree;
  for (const handle of path) {
    const node = level.find((each) => each.handle === handle);
    if (node === undefined) return null;
    nodes.push(node);
    level = node.children;
  }
  return nodes.length === 0 ? null : nodes;
}

/** The scope's category, collection or store in the market's language; `null` for one Medusa lacks. */
export async function resolveScope(
  context: MarketContext,
  messages: Messages,
  scope: ListingScope,
): Promise<ResolvedScope | null> {
  const copy = messages.templates.productListing;
  const home: Link = { label: copy.home, href: context.url("/") };
  const locale = context.market.medusaLocale;
  if (scope.kind === "store")
    return { scope, title: copy.store, trail: [home], path: "/store", filters: {} };
  if (scope.kind === "collection") {
    const collection = (await listCollections(locale)).find((each) => each.handle === scope.handle);
    if (collection === undefined) return null;
    return {
      scope,
      title: collection.title,
      trail: [home],
      path: `/collections/${encodeURIComponent(collection.handle)}`,
      filters: { collectionIds: [collection.id] },
    };
  }
  const nodes = categoryAt(await listCategories(locale), scope.path);
  const node = nodes?.at(-1);
  if (nodes === null || node === undefined) return null;
  const parents = nodes.slice(0, -1).map((each, index) => ({
    label: each.name,
    href: context.hrefs.category(scope.path.slice(0, index + 1).join("/")),
  }));
  return {
    scope,
    title: node.name,
    trail: [home, ...parents],
    path: `/categories/${scope.path.map(encodeURIComponent).join("/")}`,
    // A parent category lists its children's products too.
    filters: { categoryIds: flattenCategories([node]).map((each) => each.id) },
  };
}

export function listingBreadcrumbs(resolved: ResolvedScope): Breadcrumbs {
  return { trail: resolved.trail, current: resolved.title };
}

/** Where the results' links and forms point. */
export type ListingLinks = {
  /** The results' own address without a filter: the listing's first page, or the search's URL. */
  base: { path: string; params: URLSearchParams };
  /** Where the filter and sort forms GET: the search page, which reads them without scripts (D59). */
  formAction: string;
  /** The hidden fields those forms carry: the listing's scope, or the search's query. */
  hidden: QueryParam[];
};

export type ReadListingInput = {
  context: MarketContext;
  messages: Messages;
  resolved: ResolvedScope;
  /** The URL's query (filters, sort, page); a listing page's own first page passes none. */
  query: ListingQuery;
  /** The URL's parameters as they came: the chips' links remove one of them. */
  params: URLSearchParams;
  /** The page from the path (`/page/2`), used when the query names none. */
  pathPage: number;
  pageSize: number;
  links: ListingLinks;
};

const SORT_LABEL: Record<ListingSort, keyof Messages["molecules"]["sortSelect"]["options"]> = {
  relevance: "relevance",
  newest: "newest",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
};

/** The sort's options: a search for words ranks first by relevance; a listing has no ranking. */
function sortOptions(messages: Messages, withQuery: boolean) {
  const sorts: ListingSort[] = withQuery
    ? ["relevance", "newest", "price-asc", "price-desc"]
    : ["newest", "price-asc", "price-desc"];
  const words = messages.molecules.sortSelect.options;
  return sorts.map((value) => ({ value, label: words[SORT_LABEL[value]] }));
}

function chipsFor(
  groups: readonly FacetGroup[],
  params: URLSearchParams,
  link: (params: URLSearchParams) => string,
  locale: string,
): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  for (const group of groups) {
    if (group.kind === "checkbox" || group.kind === "swatch") {
      for (const option of group.options)
        if (option.selected)
          chips.push({
            id: `${group.id}:${option.value}`,
            group: group.label,
            label: option.label,
            removeHref: link(withoutParam(params, group.id, option.value)),
          });
    } else if (group.kind === "range" && group.selected !== undefined) {
      chips.push({
        id: group.id,
        group: group.label,
        label: formatNumberRange(group.selected.min, group.selected.max, locale, {
          style: "currency",
          currency: group.currencyCode,
        }),
        removeHref: link(withoutParam(withoutParam(params, `${group.id}.min`), `${group.id}.max`)),
      });
    } else if (group.kind === "toggle" && group.selected) {
      chips.push({
        id: group.id,
        label: group.label,
        removeHref: link(withoutParam(params, group.id)),
      });
    }
  }
  return chips;
}

/** The search's filters: the URL's, with the scope's own in place of the group it fixes. */
function searchFilters(resolved: ResolvedScope, query: ListingQuery): SearchFilters {
  return { ...query.filters, ...resolved.filters };
}

/**
 * One page of a listing's results with its labels, or `null` for a page past the last (a 404 on a
 * listing's path, the first page on the search).
 */
export async function readListing(input: ReadListingInput): Promise<ListingResults | null> {
  const { context, messages, resolved, query, links } = input;
  const { market, region } = context;
  const locale = market.medusaLocale;
  const copy = messages.templates.productListing;
  const hasWords = query.query !== "";
  const sort: SearchSort = query.sort ?? (hasWords ? "relevance" : "newest");
  const page = query.page ?? input.pathPage;
  const result = await searchProducts({
    locale,
    currencyCode: region.currencyCode,
    query: query.query,
    filters: searchFilters(resolved, query),
    sort,
    page,
    pageSize: input.pageSize,
  });
  if (page > result.pageCount) return null;
  const [products, categories, collections, optionValues] = await Promise.all([
    result.ids.length === 0
      ? Promise.resolve([])
      : listProductsByIds(result.ids, { regionId: region.id, locale }),
    listCategories(locale),
    listCollections(locale),
    listOptionValueLabels(locale),
  ]);
  const cards = products.flatMap((product) => toProductCard(product, context.hrefs) ?? []);

  // The group the scope fixes is not offered: a category's page filters by its own categories.
  const fixed: string | null =
    resolved.scope.kind === "category"
      ? FACET_PARAM.category
      : resolved.scope.kind === "collection"
        ? FACET_PARAM.collection
        : null;
  const groups = toFacetGroups(result, query.filters, region.currencyCode, {
    categories: flattenCategories(categories),
    collections,
    optionValues,
    copy: copy.facets,
  }).filter((group) => group.id !== fixed);

  const chosen = filterParams(input.params);
  const base = links.base;
  const link = (params: URLSearchParams) =>
    withQuery(
      base.path,
      new URLSearchParams([...base.params.entries(), ...filterParams(params).entries()]),
    );
  const chips = chipsFor(groups, chosen, link, market.htmlLang);
  const sortOnly = new URLSearchParams([...chosen.entries()].filter(([name]) => name === "sort"));
  const clearHref = link(sortOnly);
  const active: ActiveFilters | undefined =
    chips.length === 0 ? undefined : { filters: chips, clearHref };
  const filterFields = [...chosen.entries()]
    .filter(([name]) => name !== "sort")
    .map(([name, value]) => ({ name, value }));

  const sortState: SortState = {
    action: links.formAction,
    name: "sort",
    options: sortOptions(messages, hasWords),
    selected: sort,
    // The listing's other parameters ride along, so a new sort keeps the filters (SortState).
    params: [...links.hidden, ...filterFields],
  };
  const empty: EmptyStateContent =
    filterCount(query.filters) > 0
      ? {
          // Always with its way out: a filter can count without a chip (a price range the facet
          // drops, a category on a category's page), and then "Clear all" is the only one.
          title: copy.noMatch.title,
          text: copy.noMatch.text,
          action: { label: copy.noMatch.clear, href: clearHref },
        }
      : hasWords
        ? {
            title: formatMessage(
              messages.templates.searchResults.empty.title,
              { query: query.query },
              market.htmlLang,
            ),
            text: messages.templates.searchResults.empty.text,
          }
        : {
            title: copy.empty.title,
            text: copy.empty.text,
            action: { label: copy.empty.browse, href: context.url("/store") },
          };
  const sortParam = query.sort === null ? [] : [{ name: "sort", value: query.sort }];
  return {
    toolbar: { count: result.total, sort: sortState },
    ...(groups.length === 0
      ? {}
      : {
          filters: {
            action: links.formAction,
            groups,
            params: [...links.hidden, ...sortParam],
            ...(active === undefined ? {} : { active }),
            resultCount: result.total,
          },
        }),
    grid: { products: cards, variant: "standard", layout: "grid", empty },
    page: { page: Math.min(page, result.pageCount), pageCount: result.pageCount },
  };
}

/** The hidden field that names a listing to the search page (the forms' `scope`). */
export const scopeField = (scope: ListingScope): QueryParam => ({
  name: "scope",
  value: scopeValue(scope),
});
