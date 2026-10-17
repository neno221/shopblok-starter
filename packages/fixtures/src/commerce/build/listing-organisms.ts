import type {
  ActiveFilters,
  CompareItem,
  CompareTray,
  EmptyStateContent,
  FacetGroup,
  ProductCard,
  SearchResult,
} from "@shopblok/registry/contracts";
import type { Context } from "../context";
import type { CommerceFixture } from "../types";

// The listing organisms' samples (T37), made from the data the molecules already have: the twelve
// cards, T33's search result, facets and chips, and the empty states. The listing is the market's
// `/store` page and the search page its `/search`, as T33's samples have them.

/** What the compare tray shows of a card: its title, its link and its first picture. */
function compareItem(product: ProductCard): CompareItem {
  const [image] = product.images;
  return {
    id: product.id,
    title: product.title,
    href: product.href,
    ...(image === undefined ? {} : { image }),
  };
}

/** The tray with these cards, and the comparison page for them. */
function compareTray(ctx: Context, products: ProductCard[]): CompareTray {
  const ids = products.map((product) => product.id).join(",");
  return {
    items: products.map(compareItem),
    max: 4,
    compareHref: ctx.href(`/compare?products=${ids}`),
  };
}

export function buildListingOrganisms(
  ctx: Context,
  products: ProductCard[],
  search: SearchResult,
  facets: FacetGroup[],
  activeFilters: ActiveFilters,
  empty: EmptyStateContent,
): CommerceFixture["listing"] {
  const { copy } = ctx;
  const form = { action: ctx.href("/search") };
  const recent = [...copy.search.recent];
  return {
    search: {
      idle: { search: { ...form, query: "" }, recent, loading: false },
      results: { search: { ...form, query: search.query }, recent, result: search, loading: false },
      // The visitor has typed on (the first suggestion): the last answer stays until the next arrives.
      loading: {
        search: { ...form, query: copy.search.suggestions[0] },
        recent,
        result: search,
        loading: true,
      },
      empty: {
        search: { ...form, query: copy.search.misspelt },
        recent,
        result: {
          query: copy.search.misspelt,
          total: 0,
          products: [],
          categories: [],
          suggestions: [],
        },
        loading: false,
      },
    },
    filters: {
      action: ctx.href("/store"),
      groups: facets,
      params: [],
      active: activeFilters,
      resultCount: 24,
    },
    grid: {
      products: { products, variant: "standard", layout: "grid", empty },
      empty: { products: [], variant: "standard", layout: "grid", empty },
    },
    carousel: {
      title: copy.carousel.title,
      products: products.slice(0, 8),
      variant: "standard",
      viewAll: { label: copy.carousel.viewAll, href: ctx.href("/collections/new-in") },
    },
    compare: {
      one: compareTray(ctx, products.slice(0, 1)),
      three: compareTray(ctx, products.slice(0, 3)),
      full: compareTray(ctx, products.slice(0, 4)),
    },
  };
}
