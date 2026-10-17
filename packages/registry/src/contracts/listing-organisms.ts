import { z } from "zod";
import { Href, Id, Link } from "./content";
import { FacetGroup } from "./facets";
import { Image } from "./image";
import { ActiveFilters, EmptyStateContent, QueryParam, SearchQuery, SortState } from "./listing";
import { ProductCard } from "./product";
import { SearchResult } from "./search";

// T37: what a listing page's organisms show (SPEC §8.4: search-backed listings, filters and sort in
// the URL, the search overlay). They are built from T33's molecules and T32's cards, so these
// contracts are mostly theirs put together; what is new is checked here: the parameters one GET form
// would send twice, a product listed twice, and a compare tray over its limit. Per-visitor values
// (the recent queries, the products chosen to compare) are fields like the others, and D44 decides
// where they come from: the page passes them once the browser has them.

/** The ten looks of ProductCard (D46), as a grid or a carousel takes one: the family's `variant`s. */
export const ProductCardVariant = z.enum([
  "standard",
  "swatches",
  "quick-add",
  "overlay",
  "minimal",
  "horizontal",
  "compact",
  "editorial",
  "bordered",
  "image-swap",
]);

const uniqueIds = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

/** The query parameters a facet's fields send: its `id`, or `id.min` and `id.max` for a range. */
const facetParams = (group: FacetGroup) =>
  group.kind === "range" ? [`${group.id}.min`, `${group.id}.max`] : [group.id];

/**
 * The search overlay (SearchOverlay; SPEC §8.4: instant product results, recent queries, keyboard).
 * The search is a GET form, so "see all results" is its submit and works without JavaScript; the
 * results for what is typed come from the caller (M3 connects the search), which also says while
 * they load.
 */
export const SearchOverlay = z
  .object({
    search: SearchQuery.describe("The search page the form GETs, and the query typed so far"),
    recent: z
      .array(z.string().min(1))
      .max(8)
      .describe("The visitor's last queries, newest first: the browser's (D44)"),
    result: SearchResult.optional().describe(
      "The results of the last query answered; none before the first",
    ),
    loading: z.boolean().describe("A query is on its way: the results shown are not its yet"),
  })
  .refine(
    (overlay) => new Set(overlay.recent).size === overlay.recent.length,
    "a recent query is listed twice",
  )
  .refine(
    (overlay) => overlay.result === undefined || uniqueIds(overlay.result.products),
    "a product is listed twice in the results",
  );

/**
 * A listing's filters as one GET form (FilterSidebar beside the products from `lg`, FilterDrawer in
 * a sheet below it). Each group's fields are FilterGroup's; the listing's other parameters (the
 * sort) ride along as hidden inputs, without the page, so new filters start at the first page.
 */
export const FilterPanel = z
  .object({
    action: Href.describe("The listing the form GETs, without its filters"),
    groups: z.array(FacetGroup).min(1),
    params: z
      .array(QueryParam)
      .describe("The listing's other parameters (the sort), kept as hidden inputs"),
    active: ActiveFilters.optional().describe(
      "The chosen filters, as chips with the way to clear them; none when nothing is chosen",
    ),
    resultCount: z
      .int()
      .nonnegative()
      .describe("The products the chosen filters leave: the drawer's 'show N results'"),
  })
  .refine(
    (panel) => new Set(panel.groups.map((group) => group.id)).size === panel.groups.length,
    "a filter group is listed twice",
  )
  .refine((panel) => {
    const fields = new Set(panel.groups.flatMap(facetParams));
    return panel.params.every((param) => !fields.has(param.name));
  }, "the form would send a filter twice: it is also one of the params");

/** The bar above a listing's products (ProductToolbar): the count, the sort and the view. */
export const ProductToolbar = z.object({
  count: z.int().nonnegative().describe("Every product the listing holds, on every page"),
  sort: SortState,
  view: z
    .object({
      current: z.enum(["grid", "list"]),
      gridHref: Href.describe("This listing drawn as a grid"),
      listHref: Href.describe("This listing drawn as a list"),
    })
    .optional()
    .describe("The grid or list toggle; left out, the toolbar draws none"),
});

/** A listing's products (ProductGrid): one card look, a grid or a list, and what it says when empty. */
export const ProductGrid = z
  .object({
    products: z.array(ProductCard).max(48),
    variant: ProductCardVariant,
    layout: z.enum(["grid", "list"]),
    empty: EmptyStateContent.describe("What the grid says when it has no products"),
  })
  .refine((grid) => uniqueIds(grid.products), "a product is listed twice");

/** A row of products that scrolls (ProductCarousel): a heading, the cards and a link to them all. */
export const ProductCarousel = z
  .object({
    title: z.string().min(1).describe("The carousel's heading, which also names its region"),
    products: z.array(ProductCard).min(1).max(24),
    variant: ProductCardVariant,
    viewAll: Link.optional().describe("The listing the products come from"),
  })
  .refine((carousel) => uniqueIds(carousel.products), "a product is listed twice");

/** One product chosen to compare: what the tray shows of it. */
export const CompareItem = z.object({
  id: Id,
  title: z.string().min(1),
  href: Href,
  image: Image.optional(),
});

/** The products a visitor chose to compare (CompareTray, sticky at the bottom), and the way on. */
export const CompareTray = z
  .object({
    items: z.array(CompareItem).describe("In the order they were chosen: the visitor's (D44)"),
    max: z.int().min(2).max(4).describe("How many the comparison takes"),
    compareHref: Href.describe("The comparison page for these products"),
  })
  .refine((tray) => tray.items.length <= tray.max, "more products than the comparison takes")
  .refine((tray) => uniqueIds(tray.items), "a product is chosen twice");

export type ProductCardVariant = z.infer<typeof ProductCardVariant>;
export type SearchOverlay = z.infer<typeof SearchOverlay>;
export type FilterPanel = z.infer<typeof FilterPanel>;
export type ProductToolbar = z.infer<typeof ProductToolbar>;
export type ProductGrid = z.infer<typeof ProductGrid>;
export type ProductCarousel = z.infer<typeof ProductCarousel>;
export type CompareItem = z.infer<typeof CompareItem>;
export type CompareTray = z.infer<typeof CompareTray>;
