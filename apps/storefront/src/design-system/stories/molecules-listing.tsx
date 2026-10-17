import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, type Messages } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  Breadcrumbs as BreadcrumbsData,
  EmptyStateContent,
  QueryParam,
  SortState,
} from "@shopblok/registry/contracts";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import { EmptyState, type EmptyStateProps } from "@shopblok/ui/molecules/empty-state";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import { SearchField } from "@shopblok/ui/molecules/search-field";
import { SortSelect } from "@shopblok/ui/molecules/sort-select";
import { FunnelXIcon, PackageOpenIcon, SearchXIcon } from "lucide-react";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of SearchField, Breadcrumbs, Pagination, SortSelect and EmptyState (T33, SETUP.md
// "Discovery and site-wide molecules (T33)"). Sample data is `commerceFixtures[ctx.locale]`, copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// None of the five is a client component: they render on the server, so their props may hold what a
// server component can take (Pagination's `hrefFor`, EmptyState's `icon`), and the two forms hand
// their small client parts plain strings and lists of their own. The links and the forms point at
// the market's listing (`{m}/store`) and search page (`{m}/search`), which do not exist before M3:
// like every fixture link, they are the addresses the app will build, and EmptyState does not
// prefetch them.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

/** The market's listing of every product (SPEC §8.5) and its search page. */
const listingPath = (ctx: DsContext) => `${fixtures(ctx).prefix}/store`;
const searchPath = (ctx: DsContext) => `${fixtures(ctx).prefix}/search`;

/** A path with query parameters, in the order given. */
function withParams(path: string, params: readonly QueryParam[]): string {
  if (params.length === 0) return path;
  return `${path}?${new URLSearchParams(params.map(({ name, value }) => [name, value]))}`;
}

/**
 * The parameters the sidebar's form sends for the facets' chosen values (a facet's `id` is the
 * parameter, a range adds `.min` and `.max`, a switch that is on adds `id=1`): the listing's filters
 * as they are in the URL (SPEC §8.4), which a new sort and a new page keep.
 */
function chosenParams(ctx: DsContext): QueryParam[] {
  return fixtures(ctx).facets.flatMap((facet): QueryParam[] => {
    switch (facet.kind) {
      case "checkbox":
      case "swatch":
        return facet.options
          .filter((option) => option.selected)
          .map((option) => ({ name: facet.id, value: option.value }));
      case "range":
        return facet.selected === undefined
          ? []
          : [
              { name: `${facet.id}.min`, value: String(facet.selected.min) },
              { name: `${facet.id}.max`, value: String(facet.selected.max) },
            ];
      case "toggle":
        return facet.selected ? [{ name: facet.id, value: "1" }] : [];
    }
  });
}

// --- SearchField ---

function searchField(
  ctx: DsContext,
  query: string,
  words: Partial<Messages["molecules"]["searchField"]> = {},
) {
  return (
    <SearchField
      action={searchPath(ctx)}
      query={query}
      copy={{ ...copy(ctx).searchField, ...words }}
      className="max-w-md"
    />
  );
}

const searchFieldStates: readonly DsState[] = [
  {
    id: "empty",
    label: "Empty",
    description: "Nothing typed: the placeholder shows, and there is no clear button.",
    render: (ctx) => searchField(ctx, ""),
  },
  {
    id: "query",
    label: "Query typed",
    description:
      "A query so far, as on the results page: the clear button appears once the page has hydrated.",
    render: (ctx) => searchField(ctx, fixtures(ctx).search.query),
  },
  {
    id: "long-query",
    label: "Long query",
    description:
      "A query longer than the box scrolls inside it (marked data-truncate); the clear button stays at the end.",
    render: (ctx) => searchField(ctx, ctx.fixture.long.productName),
  },
  {
    id: "long-label",
    label: "Long label",
    description:
      "A long label, placeholder and button text: the button wraps below the field, which keeps its width.",
    render: (ctx) =>
      searchField(ctx, "", {
        label: ctx.fixture.long.fieldLabel,
        placeholder: ctx.fixture.long.placeholder,
        submit: ctx.fixture.long.action,
      }),
  },
];

// --- Breadcrumbs ---

function breadcrumbs(ctx: DsContext, data: BreadcrumbsData) {
  return <Breadcrumbs {...data} copy={copy(ctx).breadcrumbs} />;
}

/** The Heritage Hoodie's trail: Home, Women, Clothing, Hoodies. */
function hoodieTrail(ctx: DsContext) {
  return fixtures(ctx).product.breadcrumbs;
}

const breadcrumbsStates: readonly DsState[] = [
  {
    id: "product",
    label: "Product page",
    description:
      "Home, three categories and the product. Below md the two middle categories give way to “…”.",
    render: (ctx) =>
      breadcrumbs(ctx, { trail: hoodieTrail(ctx), current: fixtures(ctx).product.title }),
  },
  {
    id: "category",
    label: "Category page",
    description:
      "One step between Home and the parent is shown at every width: an ellipsis would take the room it saves.",
    render: (ctx) => {
      const trail = hoodieTrail(ctx);
      return breadcrumbs(ctx, {
        trail: trail.slice(0, 3),
        current: required(trail[3], "fourth step").label,
      });
    },
  },
  {
    id: "top",
    label: "Top-level page",
    description: "Home alone is a trail.",
    render: (ctx) =>
      breadcrumbs(ctx, {
        trail: [required(hoodieTrail(ctx)[0], "home step")],
        current: required(hoodieTrail(ctx)[1], "first category").label,
      }),
  },
  {
    id: "long",
    label: "Long names",
    description:
      "Long category names and a long product name wrap instead of being cut, and none of them widens the page.",
    render: (ctx) => {
      const [home, ...categories] = hoodieTrail(ctx);
      const { linkLabel, chipLabel, badge, productName } = ctx.fixture.long;
      const names = [linkLabel, chipLabel, badge];
      return breadcrumbs(ctx, {
        trail: [
          required(home, "home step"),
          ...categories.map((step, index) => ({ ...step, label: names[index] ?? step.label })),
        ],
        current: productName,
      });
    },
  },
];

// --- Pagination ---

/** A page of the listing, with its filters kept; the first page is the listing itself. */
function hrefFor(ctx: DsContext) {
  const params = chosenParams(ctx);
  return (page: number) =>
    withParams(
      listingPath(ctx),
      page === 1 ? params : [...params, { name: "page", value: String(page) }],
    );
}

function pagination(
  ctx: DsContext,
  page: number,
  pageCount: number,
  words: Partial<Messages["molecules"]["pagination"]> = {},
) {
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      hrefFor={hrefFor(ctx)}
      copy={{ ...copy(ctx).pagination, ...words }}
      locale={lang(ctx)}
    />
  );
}

const paginationStates: readonly DsState[] = [
  {
    id: "first",
    label: "First page",
    description:
      "No Previous: it is left out, not drawn dead. Page 1 is the listing's own address.",
    render: (ctx) => pagination(ctx, 1, 20),
  },
  {
    id: "middle",
    label: "Middle page",
    description:
      "Page 10 of 20: the first and the last page, the current one and one on each side, and an ellipsis for each gap.",
    render: (ctx) => pagination(ctx, 10, 20),
  },
  {
    id: "last",
    label: "Last page",
    description: "No Next.",
    render: (ctx) => pagination(ctx, 20, 20),
  },
  {
    id: "few",
    label: "Five pages",
    description: "Every page has a link and there is no ellipsis.",
    render: (ctx) => pagination(ctx, 2, 5),
  },
  {
    id: "large-numbers",
    label: "Large numbers",
    description:
      "Four-digit pages, written with the market's grouping; the row wraps if the room is short.",
    render: (ctx) => pagination(ctx, 1284, 2500),
  },
  {
    id: "long-label",
    label: "Long labels",
    description:
      "A long Previous and Next wrap inside their links, and the row wraps instead of overflowing.",
    render: (ctx) =>
      pagination(ctx, 10, 20, {
        previous: ctx.fixture.long.action,
        next: ctx.fixture.long.linkLabel,
      }),
  },
];

// --- SortSelect ---

/** The sort values a listing offers, and the key of each one's words in the copy. */
const sorts = [
  ["relevance", "relevance"],
  ["newest", "newest"],
  ["price-asc", "priceAsc"],
  ["price-desc", "priceDesc"],
] as const;

/** A sort form for the listing with its filters (`params`), as the app's resolver builds it. */
function sortState(ctx: DsContext, selected: string, params: QueryParam[]): SortState {
  const words = copy(ctx).sortSelect.options;
  return {
    action: listingPath(ctx),
    name: "sort",
    options: sorts.map(([value, key]) => ({ value, label: words[key] })),
    selected,
    params,
  };
}

function sortSelect(ctx: DsContext, state: SortState, words?: Messages["molecules"]["sortSelect"]) {
  return <SortSelect {...state} copy={words ?? copy(ctx).sortSelect} />;
}

const sortSelectStates: readonly DsState[] = [
  {
    id: "default",
    label: "Default",
    description:
      "Relevance chosen, with the listing's filters kept as hidden inputs: a new sort keeps them and starts at the first page.",
    render: (ctx) => sortSelect(ctx, sortState(ctx, "relevance", chosenParams(ctx))),
  },
  {
    id: "price",
    label: "Another sort chosen",
    render: (ctx) => sortSelect(ctx, sortState(ctx, "price-desc", chosenParams(ctx))),
  },
  {
    id: "no-filters",
    label: "No filters",
    description:
      "A listing with no filter has nothing to keep: the form is the select and its button.",
    render: (ctx) => sortSelect(ctx, sortState(ctx, "newest", [])),
  },
  {
    id: "long-label",
    label: "Long labels",
    description:
      "A long label, long options and a long button: the label and the button wrap, the chosen option is cut and says so (data-truncate), and the options wrap in the open list.",
    render: (ctx) => {
      const { optionLabel, hint, toggleLabel, badge, fieldLabel, action } = ctx.fixture.long;
      const state: SortState = {
        ...sortState(ctx, "price-asc", []),
        options: [
          { value: "relevance", label: optionLabel },
          { value: "newest", label: hint },
          { value: "price-asc", label: toggleLabel },
          { value: "price-desc", label: badge },
        ],
      };
      return sortSelect(ctx, state, { ...copy(ctx).sortSelect, label: fieldLabel, apply: action });
    },
  },
];

// --- EmptyState ---

function emptyState(
  ctx: DsContext,
  content: EmptyStateContent,
  extra: Pick<EmptyStateProps, "icon" | "headingLevel"> = {},
) {
  // The sample pages do not exist before M3, so the action does not prefetch them.
  return <EmptyState {...content} {...extra} prefetch={false} />;
}

const emptyStateStates: readonly DsState[] = [
  {
    id: "filters",
    label: "Filters match nothing",
    description: "Icon, title, text and the way out: the listing without its filters.",
    render: (ctx) => emptyState(ctx, fixtures(ctx).emptyStates.filters, { icon: FunnelXIcon }),
  },
  {
    id: "search",
    label: "Search with no result",
    render: (ctx) => emptyState(ctx, fixtures(ctx).emptyStates.search, { icon: SearchXIcon }),
  },
  {
    id: "category",
    label: "Empty category, no action",
    description: "Nothing to do but wait, so there is no button.",
    render: (ctx) => emptyState(ctx, fixtures(ctx).emptyStates.category, { icon: PackageOpenIcon }),
  },
  {
    id: "no-icon",
    label: "Without an icon",
    render: (ctx) => emptyState(ctx, fixtures(ctx).emptyStates.filters),
  },
  {
    id: "title-only",
    label: "Title only",
    render: (ctx) => emptyState(ctx, { title: fixtures(ctx).emptyStates.filters.title }),
  },
  {
    id: "heading-level",
    label: "Heading level 3",
    description: "Under a page's h2 the title is an h3, so the outline stays in order.",
    render: (ctx) =>
      emptyState(ctx, fixtures(ctx).emptyStates.search, { icon: SearchXIcon, headingLevel: 3 }),
  },
  {
    id: "long",
    label: "Long",
    description: "A long title, text and action wrap; none of them widens the page.",
    render: (ctx) =>
      emptyState(
        ctx,
        {
          title: ctx.fixture.long.productName,
          text: ctx.fixture.long.productDescription,
          action: {
            label: ctx.fixture.long.action,
            href: required(fixtures(ctx).emptyStates.filters.action, "action").href,
          },
        },
        { icon: FunnelXIcon },
      ),
  },
];

export const listingMoleculeStories = {
  "molecules/search-field": {
    summary:
      "A search landmark around a plain GET form: a labelled search input, a clear button and a Search button.",
    a11y: [
      'A search landmark named “Search products” (`role="search"`) around a GET form: Enter or the Search button submits, and the query lands in the URL (`?q=`) with JavaScript off.',
      'The input is `type="search"` and named by its label (the placeholder is not its name); `enterkeyhint="search"` puts a Search key on touch keyboards, and capitalisation and spell-checking are off.',
      "The clear button is drawn when there is text and the page has hydrated, so it is never dead; it is named “Clear search”, is 44 × 44 px, empties the field and returns focus to it. The magnifier is decorative.",
      "The button wraps below the field when the room is short (a long German or Greek label), so the field is never narrower than about 190 px. Placeholder text is muted-foreground on white, 4.95:1.",
    ],
    live: (ctx) => searchField(ctx, fixtures(ctx).search.query),
    states: searchFieldStates,
  },
  "molecules/breadcrumbs": {
    summary: "The trail from Home to the current page: a link for each step, then the page's name.",
    a11y: [
      'A navigation landmark named “Breadcrumb” with an ordered list; the current page is plain text marked `aria-current="page"`, not a link, and the separators are decorative.',
      "From md up every step is shown. Below md a trail with two steps or more between Home and the parent collapses to “Home … Parent › Current”: the ellipsis is named “Levels in between”, and the hidden links are `display: none`, so they are neither focusable nor read.",
      "Long names wrap (`wrap-anywhere`) instead of being cut, so the full name is always on screen; links are plain `<a>`, so nothing is prefetched.",
    ],
    live: (ctx) =>
      breadcrumbs(ctx, { trail: hoodieTrail(ctx), current: fixtures(ctx).product.title }),
    states: breadcrumbsStates,
  },
  "molecules/pagination": {
    summary:
      "A listing's pager as links to its pages: Previous and Next, the numbers around the current page, and ellipses for the gaps.",
    a11y: [
      "Links only (SPEC §8.4): every page is an `<a href>` from the app, so a crawler follows them. The filters and the sort stay in each address.",
      'A navigation landmark named “Pagination”. The current page is `aria-current="page"` and named “Page 10 of 20”; the others are “Page 9”. Previous and Next are left out at the ends rather than drawn dead, and carry `rel="prev"` and `rel="next"`. A listing of one page draws nothing.',
      "Seven slots from sm up, five below it (`1 … 10 … 20`), the same count wherever the current page is, so the pager does not change width as the reader moves and fits 343 px with 44 px targets. Both windows are in the markup and CSS shows one, so the links stay in the page at every width.",
      "The numbers follow the market (“1,284” or “1.284”); the ellipsis is named “More pages”.",
    ],
    live: (ctx) => pagination(ctx, 10, 20),
    states: paginationStates,
  },
  "molecules/sort-select": {
    summary:
      "A listing's sort as a GET form: a labelled select, the listing's filters kept as hidden inputs, and an Apply button.",
    a11y: [
      "Works without JavaScript: a GET form whose select is named by its label (“Sort by”) and whose Apply button sends it. The sort lands in the URL (`?sort=`), the filters are kept as hidden inputs and there is no page, so a new sort starts at the first page.",
      "With JavaScript the form is also sent when an option is chosen with a pointer or from the open list. A choice made by pressing a key on the closed select is not sent (arrow keys change the value on each press, and a page that reloads on the first would be a change of context, WCAG 3.2.2): that reader presses Apply, which stays on screen for everyone.",
      "The select and the button are 44 px tall (D32) and draw the ring at full strength; the label and the button wrap when long, and the chosen option is cut and says so (`data-truncate`).",
    ],
    live: (ctx) => sortSelect(ctx, sortState(ctx, "relevance", chosenParams(ctx))),
    states: sortSelectStates,
  },
  "molecules/empty-state": {
    summary:
      "What a page shows when it has nothing to list: an icon, a title, a text and the way on, as a button.",
    a11y: [
      "The title is a heading, an h2 unless `headingLevel` says otherwise, so the page's outline stays in order; the text is a paragraph. The icon is decoration and hidden from assistive technology, because the title says what it shows.",
      'The action is a link drawn as a button (the primary Button\'s classes on an anchor, never `role="button"`): it is the way on, 44 px tall, and its label wraps when long. It prefetches its page unless `prefetch` says not to.',
      "Every word comes from the caller's copy, so the component has none of its own and speaks the page's language. The text is muted-foreground on white (4.95:1); the decorative icon is muted-foreground on muted (4.54:1).",
    ],
    live: (ctx) => emptyState(ctx, fixtures(ctx).emptyStates.filters, { icon: FunnelXIcon }),
    states: emptyStateStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
