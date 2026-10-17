import { z } from "zod";
import { Href, Id, Link } from "./content";

// What a listing page's discovery molecules show (T33; SPEC §8.4: crawlable pagination, filters and
// sort in the URL). Every URL is built by the app (§8.5) and arrives here as an `href`; the labels a
// visitor reads that are not content (a sort's name, "Price") come from the copy through the
// resolver, as the facets' do.

/** Breadcrumbs: the trail from the home page to the parent, then the current page's name. */
export const Breadcrumbs = z.object({
  trail: z.array(Link).min(1).describe("Home first, the parent last"),
  current: z.string().min(1).describe("The current page: text, not a link"),
});

/** Which page of a listing this is (Pagination); `hrefFor(page)` is the component's prop. */
export const PageState = z
  .object({
    page: z.int().min(1),
    pageCount: z.int().min(1),
  })
  .refine((state) => state.page <= state.pageCount, "page is after the last page");

/** A query parameter a GET form carries on (the listing's filters, while the sort changes). */
export const QueryParam = z.object({ name: z.string().min(1), value: z.string() });

/** The search field's form: where it sends the query (a GET form) and the query so far. */
export const SearchQuery = z.object({
  action: Href.describe("The search page the form GETs"),
  query: z.string().describe("The current query, empty for none"),
});

/** A listing's sort (SortSelect): its options, the chosen one, and the form that changes it. */
export const SortState = z
  .object({
    action: Href.describe("The listing the form GETs, without its sort"),
    name: z.string().min(1).describe("The query parameter, `sort`"),
    options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).min(2),
    selected: z.string().min(1),
    params: z
      .array(QueryParam)
      .describe(
        "The listing's other parameters, kept as hidden inputs; without the page, so a new sort starts at the first",
      ),
  })
  .refine(
    (state) => state.options.some((option) => option.value === state.selected),
    "the selected sort is not one of the options",
  )
  .refine(
    (state) => new Set(state.options.map((option) => option.value)).size === state.options.length,
    "a sort is listed twice",
  )
  .refine(
    (state) => state.params.every((param) => param.name !== state.name),
    "the form would send the sort twice: it is also one of the params",
  );

/** One chosen filter value (ActiveFilterChips) and the listing without it. */
export const ActiveFilter = z.object({
  id: Id.describe("Unique in the list: `colour:black`"),
  group: z
    .string()
    .min(1)
    .optional()
    .describe(
      "The facet's label: Colour, Price. Left out for an on/off filter (in stock), whose label says it all",
    ),
  label: z.string().min(1).describe("The value: Black, EUR 20 to 50"),
  removeHref: Href.describe("The listing without this value"),
});

/** The chosen filters, and the listing with none of them. */
export const ActiveFilters = z
  .object({
    filters: z.array(ActiveFilter).min(1),
    clearHref: Href.describe("The listing without any filter"),
  })
  .refine(
    (chosen) => new Set(chosen.filters.map((filter) => filter.id)).size === chosen.filters.length,
    "a filter is listed twice",
  );

/** An empty state's words and its way on (EmptyState); the caller passes its own copy's. */
export const EmptyStateContent = z.object({
  title: z.string().min(1),
  text: z.string().min(1).optional(),
  action: Link.optional(),
});

export type Breadcrumbs = z.infer<typeof Breadcrumbs>;
export type PageState = z.infer<typeof PageState>;
export type QueryParam = z.infer<typeof QueryParam>;
export type SearchQuery = z.infer<typeof SearchQuery>;
export type SortState = z.infer<typeof SortState>;
export type ActiveFilter = z.infer<typeof ActiveFilter>;
export type ActiveFilters = z.infer<typeof ActiveFilters>;
export type EmptyStateContent = z.infer<typeof EmptyStateContent>;
