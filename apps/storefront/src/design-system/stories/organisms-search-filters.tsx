// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D41, D44, D45, D49). The stories of
// SearchOverlay, FilterSidebar, FilterDrawer and ProductToolbar. Sample data is
// `commerceFixtures[ctx.locale].listing` (the overlay before a query, with results, while the next
// answer loads and with none; the filters as one form, with six chosen), the twelve cards, the
// copy is `catalogs[ctx.locale]`, and the locale every `Intl` call uses is the market's
// `<html lang>`. Every link is drawn with `prefetch={false}`: the shop's pages answer 404 until M3.
//
// The overlay and the drawer are modal, so the live renders are the closed components: the search
// button, wired to `SearchFixture` (the design system's stand-in for M3's search, which answers
// after 250 ms from the locale's twelve cards, so the overlay can be used, with its recent queries
// and the "Clear recent searches" button), and the filters button alone, which the interaction
// checks press. The open states are drawn inside an `OverlayBox` (D45) with the component's own way
// of starting open (`defaultOpen`, `modal={false}`, so several fit on one page and the rest of the
// frame stays usable). The popup is capped to its box (`cappedDialog`: the window's `100dvh` means
// nothing inside a box), so a result list taller than the box scrolls inside the popup, as it does
// in a short window, and nothing is cut. The animations are switched off (`duration-0`): no state
// is a picture of an animation.
//
// A story renders on the server (RSC). The overlay is a client component, so what it is given is
// plain data (the contract's values and the catalog's words, never a function): the states draw
// the answer they are given and have no handlers. The one state that needs a handler is the one
// with the recent queries, because the "Clear recent searches" button exists only when the page can
// forget them, so that state (and its long twin) is `SearchFixture` drawn open, which holds them.
//
// Landmarks are named apart. A page of states has several overlays, sidebars, drawers and view
// toggles, and two named alike confuse a screen-reader user, so a state's name carries its label in
// brackets (`wordsFor`), as the headers' and the banners' do. The live renders keep the catalog's
// own names. The accordions' panels are regions named by their group, so a group's name repeats
// from one state to the next; axe's `landmark-unique` is a best practice that the design system's
// check does not run.
//
// Each box is taller than what its popup holds in the longest language at the widest popup, or
// holds it with its list scrolling; the heights are generous rather than measured, since a popup
// that is taller than its box scrolls inside itself.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  ActiveFilters,
  FacetGroup,
  FilterPanel,
  ProductCard,
  QueryParam,
  SearchOverlay as SearchOverlayContent,
  SearchResult,
  SortState,
} from "@shopblok/registry/contracts";
import { FilterDrawer, type FilterDrawerProps } from "@shopblok/ui/organisms/filter-drawer";
import { FilterSidebar, type FilterSidebarProps } from "@shopblok/ui/organisms/filter-sidebar";
import { ProductToolbar, type ProductToolbarProps } from "@shopblok/ui/organisms/product-toolbar";
import { SearchOverlay, type SearchOverlayProps } from "@shopblok/ui/organisms/search-overlay";
import { OverlayBox } from "../components/overlay-box";
import { SearchFixture, type SearchFixtureProps } from "../components/search-fixture";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const listing = (ctx: DsContext) => fixtures(ctx).listing;
const messages = (ctx: DsContext) => catalogs[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

/** The market's listing of every product (SPEC §8.5). */
const listingPath = (ctx: DsContext) => `${fixtures(ctx).prefix}/store`;

/** A path with query parameters, in the order given. */
function withParams(path: string, params: readonly QueryParam[]): string {
  if (params.length === 0) return path;
  return `${path}?${new URLSearchParams(params.map(({ name, value }) => [name, value]))}`;
}

/** The popup of an open state, capped to its box (the window's height means nothing inside it). */
const cappedDialog = "max-h-[calc(100%-2rem)] sm:max-h-[calc(100%-4rem)]";
/** The dialog's popup in a state: capped, and still. */
const stillDialog = `${cappedDialog} duration-0`;
/** The sheet in a state: it is as tall as its box already, and it does not slide in. */
const stillSheet = "duration-0";

/** The strings of the DS fixtures that are as long as the locale writes them, in turn. */
function longWords(ctx: DsContext): string[] {
  const { optionLabel, toggleLabel, chipLabel, badge, hint, linkLabel, productName } =
    ctx.fixture.long;
  return [optionLabel, toggleLabel, chipLabel, badge, hint, linkLabel, productName];
}

// --- SearchOverlay ---

type SearchWords = SearchOverlayProps["copy"];

/** The catalog's words, with the dialog's name for one state if given, and what a state replaces. */
function searchCopy(ctx: DsContext, state?: string, words: Partial<SearchWords> = {}): SearchWords {
  const all = { ...messages(ctx).organisms.searchOverlay, ...words };
  return state === undefined ? all : { ...all, title: `${all.title} (${state})` };
}

/** What a state of the overlay is given beyond its contract: the words, the locale, no prefetch. */
function searchProps(ctx: DsContext, state?: string, words?: Partial<SearchWords>) {
  return {
    copy: searchCopy(ctx, state, words),
    priceCopy: messages(ctx).molecules.priceBlock,
    locale: lang(ctx),
    prefetch: false,
  } satisfies Partial<SearchOverlayProps>;
}

/** The overlay drawn open in a box, with its button in the corner behind the popup. */
function searchOpen(
  ctx: DsContext,
  spec: {
    label: string;
    height: number;
    content: SearchOverlayContent;
    words?: Partial<SearchWords>;
  },
) {
  const { label, height, content, words } = spec;
  return (
    <OverlayBox name={label} height={height}>
      <div className="p-4">
        <SearchOverlay
          {...content}
          {...searchProps(ctx, label, words)}
          defaultOpen
          modal={false}
          popupClassName={stillDialog}
        />
      </div>
    </OverlayBox>
  );
}

/** `SearchFixture` drawn open in a box: the recent queries, with the button that forgets them. */
function searchFixtureOpen(
  ctx: DsContext,
  spec: {
    label: string;
    height: number;
    recent: string[];
    words?: Partial<SearchWords>;
  },
) {
  const { label, height, recent, words } = spec;
  const props: SearchFixtureProps = {
    action: listing(ctx).search.idle.search.action,
    recent,
    products: fixtures(ctx).products,
    ...searchProps(ctx, label, words),
    defaultOpen: true,
    modal: false,
    popupClassName: stillDialog,
  };
  return (
    <OverlayBox name={label} height={height}>
      <div className="p-4">
        <SearchFixture {...props} />
      </div>
    </OverlayBox>
  );
}

/** The longest title of the twelve cards, first, then the first four: sale, varying and plain prices. */
function longProducts(ctx: DsContext): ProductCard[] {
  const cards = fixtures(ctx).products;
  const longest = required(
    [...cards].sort((a, b) => b.title.length - a.title.length)[0],
    "products",
  );
  return [longest, ...cards.filter((card) => card.id !== longest.id).slice(0, 5)];
}

/** An answer in which every label is as long as the locale writes it, and a total in the thousands. */
function longResult(ctx: DsContext): SearchResult {
  const { productName, linkLabel, chipLabel, hint, optionLabel } = ctx.fixture.long;
  const { categories } = listing(ctx).search.results.result ?? {
    categories: [],
  };
  return {
    query: productName,
    total: 1284,
    products: longProducts(ctx),
    categories: categories.map((category, index) => ({
      ...category,
      label: index === 0 ? linkLabel : chipLabel,
    })),
    suggestions: [hint, optionLabel, productName],
  };
}

const searchOverlayStates: readonly DsState[] = [
  {
    id: "recent",
    label: "Before a query",
    description:
      "The field is empty, so the list is the visitor's recent queries, under their heading and above “Clear recent searches”. Pressing one puts it in the field, and the button empties the list, as in the live render.",
    render: (ctx) =>
      searchFixtureOpen(ctx, {
        label: "Before a query",
        height: 480,
        recent: listing(ctx).search.idle.recent,
      }),
  },
  {
    id: "results",
    label: "With results",
    description:
      "Four products (picture, title, price: one on sale, one from a price), then the categories and the suggestions, each under its heading, and the form's submit, “See all 14 results”.",
    render: (ctx) =>
      searchOpen(ctx, {
        label: "With results",
        height: 920,
        content: listing(ctx).search.results,
      }),
  },
  {
    id: "loading",
    label: "Loading",
    description:
      "The field has changed and the answer has not arrived: the last answer stays on screen, marked busy, under a spinner (which stands still when motion is reduced), and the status region says “Searching…”.",
    render: (ctx) =>
      searchOpen(ctx, {
        label: "Loading",
        height: 920,
        content: listing(ctx).search.loading,
      }),
  },
  {
    id: "empty",
    label: "No results",
    description:
      "A misspelt query: the sentence with the query in it and a hint, and no “See all” button, since there is nothing to see.",
    render: (ctx) =>
      searchOpen(ctx, {
        label: "No results",
        height: 400,
        content: listing(ctx).search.empty,
      }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "A long query in the field, the longest product title, long category and suggestion names and long headings: they wrap inside their rows and nothing is cut. The query is longer than the field, which scrolls it (data-truncate).",
    render: (ctx) => {
      const { fieldLabel, chipLabel, hint } = ctx.fixture.long;
      const result = longResult(ctx);
      return searchOpen(ctx, {
        label: "Long labels",
        height: 1000,
        content: {
          search: {
            ...listing(ctx).search.results.search,
            query: result.query,
          },
          recent: [],
          result,
          loading: false,
        },
        words: {
          products: fieldLabel,
          categories: chipLabel,
          suggestions: hint,
        },
      });
    },
  },
  {
    id: "long-recent",
    label: "Long recent queries",
    description:
      "A long recent query wraps in its row, and a long “Clear recent searches” wraps inside its button, which never grows wider than the popup.",
    render: (ctx) => {
      const { productName, fieldLabel, action } = ctx.fixture.long;
      return searchFixtureOpen(ctx, {
        label: "Long recent queries",
        height: 520,
        recent: [productName, ...listing(ctx).search.idle.recent.slice(0, 2)],
        words: { recent: fieldLabel, clearRecent: action },
      });
    },
  },
];

// --- The filters' panel ---

type FilterWords = FilterSidebarProps["copy"];

/** The listing's filters: six groups with six values chosen, the chips for them, 24 products. */
const panelOf = (ctx: DsContext): FilterPanel => listing(ctx).filters;

/** A group with nothing chosen. */
function cleared(facet: FacetGroup): FacetGroup {
  switch (facet.kind) {
    case "checkbox":
      return {
        ...facet,
        options: facet.options.map((option) => ({
          ...option,
          selected: false,
        })),
      };
    case "swatch":
      return {
        ...facet,
        options: facet.options.map((option) => ({
          ...option,
          selected: false,
        })),
      };
    case "range": {
      const { selected: _selected, ...bounds } = facet;
      return bounds;
    }
    case "toggle":
      return { ...facet, selected: false };
  }
}

/** The panel with nothing chosen: every group untouched and no chips. */
function nothingChosen(ctx: DsContext): FilterPanel {
  const { active: _active, ...rest } = panelOf(ctx);
  return { ...rest, groups: rest.groups.map(cleared) };
}

/** The panel with the listing's filters, and no product left. */
function noProducts(ctx: DsContext): FilterPanel {
  return { ...panelOf(ctx), resultCount: 0 };
}

/**
 * The panel with the locale's longest strings for every name: the groups' (each its own), the
 * options' (in turn, numbered, with counts in the thousands) and the chips'.
 */
function longPanel(ctx: DsContext): FilterPanel {
  const panel = panelOf(ctx);
  const words = longWords(ctx);
  const { fieldLabel, linkLabel, chipLabel, hint, toggleLabel, badge } = ctx.fixture.long;
  const names: Record<string, string> = {
    category: fieldLabel,
    colour: chipLabel,
    size: linkLabel,
    price: hint,
    "in-stock": toggleLabel,
    "on-sale": badge,
  };
  const wordOf = (index: number) => `${words[index % words.length]} ${index + 1}`;
  const relabelled = <Option extends { label: string; count: number }>(options: Option[]) =>
    options.map((option, index) => ({
      ...option,
      label: wordOf(index),
      count: index === 0 ? 12480 : option.count,
    }));
  const groups = panel.groups.map((group): FacetGroup => {
    const label = names[group.id] ?? group.label;
    switch (group.kind) {
      case "checkbox":
        return { ...group, label, options: relabelled(group.options) };
      case "swatch":
        return { ...group, label, options: relabelled(group.options) };
      case "range":
      case "toggle":
        return { ...group, label };
    }
  });
  const chosen = panel.active;
  const active: ActiveFilters | undefined =
    chosen === undefined
      ? undefined
      : {
          ...chosen,
          filters: chosen.filters.map((filter, index) => ({
            ...filter,
            ...(filter.group === undefined
              ? {}
              : { group: names[filter.id.split(":")[0] ?? ""] ?? fieldLabel }),
            label: wordOf(index),
          })),
        };
  return { ...panel, groups, ...(active === undefined ? {} : { active }) };
}

// --- FilterSidebar ---

/** The catalog's words, with the heading (the form's name) for one state if given. */
function sidebarCopy(
  ctx: DsContext,
  state?: string,
  words: Partial<FilterWords> = {},
): FilterWords {
  const all = { ...messages(ctx).organisms.filterSidebar, ...words };
  return state === undefined ? all : { ...all, title: `${all.title} (${state})` };
}

function sidebar(
  ctx: DsContext,
  panel: FilterPanel,
  options: {
    state?: string;
    words?: Partial<FilterWords>;
    headingLevel?: FilterSidebarProps["headingLevel"];
  } = {},
) {
  return (
    <div className="w-full max-w-sm">
      <FilterSidebar
        {...panel}
        copy={sidebarCopy(ctx, options.state, options.words)}
        groupCopy={messages(ctx).molecules.filterGroup}
        chipsCopy={messages(ctx).molecules.activeFilterChips}
        locale={lang(ctx)}
        prefetch={false}
        headingLevel={options.headingLevel}
      />
    </div>
  );
}

/** A state of the sidebar: its panel, under the state's `h3` label, so its heading is an `h4`. */
function sidebarState(spec: {
  id: string;
  label: string;
  description: string;
  panel: (ctx: DsContext) => FilterPanel;
  words?: (ctx: DsContext) => Partial<FilterWords>;
}): DsState {
  const { id, label, description, panel, words } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) =>
      sidebar(ctx, panel(ctx), {
        state: label,
        words: words?.(ctx),
        headingLevel: 4,
      }),
  };
}

const filterSidebarStates: readonly DsState[] = [
  sidebarState({
    id: "chosen",
    label: "Filters chosen",
    description:
      "Six values chosen: the chips on top, each with its way off and “Clear all” after them, then the groups (open, with their boxes ticked) and “Apply filters”.",
    panel: panelOf,
  }),
  sidebarState({
    id: "none",
    label: "Nothing chosen",
    description:
      "No chips and nothing ticked: the heading, the groups and the button. A group with nothing chosen is open too, so the form is complete before a script has run.",
    panel: nothingChosen,
  }),
  sidebarState({
    id: "long",
    label: "Long labels",
    description:
      "The groups, options, chips and button have the longest labels of the locale, with counts in the thousands: they wrap inside the column and nothing is cut.",
    panel: longPanel,
    words: (ctx) => ({ apply: ctx.fixture.long.action }),
  }),
];

// --- FilterDrawer ---

type DrawerWords = FilterDrawerProps["copy"];

/** The catalog's words, with the sheet's title (its name) for one state if given. */
function drawerCopy(ctx: DsContext, state?: string, words: Partial<DrawerWords> = {}): DrawerWords {
  const all = { ...messages(ctx).organisms.filterDrawer, ...words };
  return state === undefined ? all : { ...all, title: `${all.title} (${state})` };
}

function drawer(
  ctx: DsContext,
  panel: FilterPanel,
  props: Partial<FilterDrawerProps> = {},
  options: { state?: string; words?: Partial<DrawerWords> } = {},
) {
  return (
    <FilterDrawer
      {...panel}
      copy={drawerCopy(ctx, options.state, options.words)}
      groupCopy={messages(ctx).molecules.filterGroup}
      locale={lang(ctx)}
      prefetch={false}
      {...props}
    />
  );
}

/** The sheet drawn open in a box, its button in the corner behind it. */
function drawerOpen(
  ctx: DsContext,
  spec: { label: string; panel: FilterPanel; words?: Partial<DrawerWords> },
) {
  return (
    <OverlayBox name={spec.label} height={760}>
      <div className="p-4">
        {drawer(
          ctx,
          spec.panel,
          { defaultOpen: true, modal: false, popupClassName: stillSheet },
          { state: spec.label, words: spec.words },
        )}
      </div>
    </OverlayBox>
  );
}

const filterDrawerStates: readonly DsState[] = [
  {
    id: "chosen",
    label: "Open, filters chosen",
    description:
      "The title and the close button, the six groups in a body that scrolls, and a foot that stays in view with “Clear all” and “Show 24 results”. The button behind says “Filters” and a badge says 6.",
    render: (ctx) => drawerOpen(ctx, { label: "Open, filters chosen", panel: panelOf(ctx) }),
  },
  {
    id: "none",
    label: "Open, nothing chosen",
    description:
      "No “Clear all” (there is nothing to clear) and no badge on the button: the foot is the submit alone, across its width.",
    render: (ctx) =>
      drawerOpen(ctx, {
        label: "Open, nothing chosen",
        panel: nothingChosen(ctx),
      }),
  },
  {
    id: "zero",
    label: "Open, no products",
    description:
      "The listing as it stands has no products, so the submit says “No results”. It still sends the form: the count is the page's as it was drawn, and the change that fixes a 0 must be possible.",
    render: (ctx) => drawerOpen(ctx, { label: "Open, no products", panel: noProducts(ctx) }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "The title, the groups, the options and both buttons have the longest labels of the locale: they wrap, the two buttons share the foot's row or take a row each, and the body scrolls between the header and the foot.",
    render: (ctx) => {
      const { fieldLabel, action, linkLabel } = ctx.fixture.long;
      return drawerOpen(ctx, {
        label: "Long labels",
        panel: longPanel(ctx),
        words: { title: fieldLabel, close: linkLabel, clear: action },
      });
    },
  },
];

// --- ProductToolbar ---

type ToolbarWords = ProductToolbarProps["copy"];

/** The sort values a listing offers, and the key of each one's words in the copy. */
const sorts = [
  ["relevance", "relevance"],
  ["newest", "newest"],
  ["price-asc", "priceAsc"],
  ["price-desc", "priceDesc"],
] as const;

/** The parameters the filters' form sends for the values chosen (a facet's `id`, `id.min` and `id.max`). */
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

/**
 * The sort form of the listing with its filters and its view (`params`), built from the catalog's
 * words as the app's resolver builds it (the same as SortSelect's story).
 */
function sortState(ctx: DsContext, selected: string, params: QueryParam[]): SortState {
  const words = messages(ctx).molecules.sortSelect.options;
  return {
    action: listingPath(ctx),
    name: "sort",
    options: sorts.map(([value, key]) => ({ value, label: words[key] })),
    selected,
    params,
  };
}

/** The toggle's two addresses: the listing with its filters, and the view each link chooses. */
function viewOf(ctx: DsContext, current: "grid" | "list") {
  const filters = chosenParams(ctx);
  return {
    current,
    gridHref: withParams(listingPath(ctx), [...filters, { name: "view", value: "grid" }]),
    listHref: withParams(listingPath(ctx), [...filters, { name: "view", value: "list" }]),
  };
}

/** The catalog's words, with the toggle's name for one state if given, and what a state replaces. */
function toolbarCopy(
  ctx: DsContext,
  state?: string,
  words: Partial<ToolbarWords> = {},
): ToolbarWords {
  const all = { ...messages(ctx).organisms.productToolbar, ...words };
  return state === undefined ? all : { ...all, view: `${all.view} (${state})` };
}

type ToolbarSpec = {
  /** The state's label, for its toggle's name; none: the live render's. */
  state?: string;
  count: number;
  /** `null`: no toggle. */
  view: "grid" | "list" | null;
  words?: Partial<ToolbarWords>;
  sortWords?: Partial<ProductToolbarProps["sortCopy"]>;
  sortOptions?: SortState["options"];
  drawerWords?: Partial<DrawerWords>;
};

/** The toolbar a page draws: the count, the sort, the toggle, and the filters button in its slot. */
function toolbar(ctx: DsContext, spec: ToolbarSpec) {
  const { state, count, view, words, sortWords, sortOptions, drawerWords } = spec;
  const params: QueryParam[] = [
    ...chosenParams(ctx),
    ...(view === null ? [] : [{ name: "view", value: view }]),
  ];
  const sort = sortState(ctx, "relevance", params);
  // The drawer's form keeps what the filters do not own: the sort and the view.
  const kept: QueryParam[] = [
    { name: "sort", value: "relevance" },
    ...(view === null ? [] : [{ name: "view", value: view }]),
  ];
  return (
    <ProductToolbar
      count={count}
      sort={sortOptions === undefined ? sort : { ...sort, options: sortOptions }}
      view={view === null ? undefined : viewOf(ctx, view)}
      copy={toolbarCopy(ctx, state, words)}
      sortCopy={{ ...messages(ctx).molecules.sortSelect, ...sortWords }}
      locale={lang(ctx)}
      prefetch={false}
      filters={drawer(
        ctx,
        { ...panelOf(ctx), params: kept, resultCount: count },
        {},
        { words: drawerWords },
      )}
    />
  );
}

const productToolbarStates: readonly DsState[] = [
  {
    id: "no-view",
    label: "No view toggle",
    description:
      "The page gives no view, so the bar is the filters button (below lg), the count and the sort.",
    render: (ctx) =>
      toolbar(ctx, {
        state: "No view toggle",
        count: panelOf(ctx).resultCount,
        view: null,
      }),
  },
  {
    id: "list",
    label: "List chosen",
    description:
      "The List link is the current one: marked aria-current and drawn pressed (a filled background and a darker border), where the live render's Grid link is the current one.",
    render: (ctx) =>
      toolbar(ctx, {
        state: "List chosen",
        count: panelOf(ctx).resultCount,
        view: "list",
      }),
  },
  {
    id: "one",
    label: "One product",
    description: "The count says “1 product”, in the singular.",
    render: (ctx) => toolbar(ctx, { state: "One product", count: 1, view: "grid" }),
  },
  {
    id: "none",
    label: "No products",
    description:
      "The count says “No products”; the sort and the toggle stay, since the filters that left none are still on the page.",
    render: (ctx) => toolbar(ctx, { state: "No products", count: 0, view: "grid" }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "A long filters button, toggle name and links, sort label, options and button: everything wraps, the row breaks into as many rows as it needs, and nothing is cut or wider than the page.",
    render: (ctx) => {
      const { fieldLabel, action, chipLabel, optionLabel, hint, toggleLabel, badge, linkLabel } =
        ctx.fixture.long;
      return toolbar(ctx, {
        state: "Long labels",
        count: 1284,
        view: "grid",
        words: { view: fieldLabel, grid: action, list: chipLabel },
        sortWords: { label: fieldLabel, apply: action },
        sortOptions: [
          { value: "relevance", label: optionLabel },
          { value: "newest", label: hint },
          { value: "price-asc", label: toggleLabel },
          { value: "price-desc", label: badge },
        ],
        drawerWords: { open: linkLabel },
      });
    },
  },
];

export const searchFilterOrganismStories = {
  "organisms/search-overlay": {
    summary:
      "The store's search as a dialog: a button opens a field with instant results below it, the visitor's recent queries before a query, and a submit that goes to the search page.",
    a11y: [
      "The search button is 44 px and named “Search”. It opens a modal dialog named “Search the store”, the page behind is inert, focus starts in the field, a Tab goes round the dialog without leaving it, and Escape, pressed once, closes it with focus back on the button.",
      "The field is a labelled combobox (type search, named “Search products”) in a GET form to the search page, so Enter with no result highlighted and the “See all 14 results” button both go to the full results, and search works without JavaScript. The list is inline in the dialog and not in a popup of its own, which is why one Escape closes the dialog and not only the list.",
      "ArrowDown and ArrowUp walk the list while focus stays in the field. Enter on a product or a category follows its link and closes the dialog; Enter on a recent query or a suggestion puts it in the field and asks for its results. The options are the links themselves, so there is no link inside an option, and Tab goes from the field to the next control. A click with a modifier key opens a new tab and leaves the dialog as it is.",
      "One polite status region speaks: “Searching…” while an answer is on its way, and the count (“14 results”) when it arrives. It says nothing for each key before that, and the spinner row beside the busy list is decoration, hidden from assistive technology and still under prefers-reduced-motion.",
      "The recent queries sit under a heading that names their list, and “Clear recent searches” is a button above it, not an option; it returns focus to the field when the list goes. They are per visitor (D44), so the page passes them in once the browser has them, and the live render keeps them in `SearchFixture`.",
      "Every option and button is at least 44 px tall and the highlighted option is drawn as a ring as well as a fill. Long titles, categories, queries and headings wrap (wrap-anywhere), a query longer than the field scrolls inside it and says so (data-truncate), and the list scrolls inside the popup when it is taller than the screen.",
      "Prices are written in the market's currency and say what they are: a sale price carries “Sale price” and “Original price” for a reader, and a price that varies says “From”. The pictures are decoration beside their titles (empty alternative text) in a box of a known shape, so nothing shifts as they load.",
    ],
    live: (ctx) => {
      const props: SearchFixtureProps = {
        action: listing(ctx).search.idle.search.action,
        recent: listing(ctx).search.idle.recent,
        products: fixtures(ctx).products,
        ...searchProps(ctx),
      };
      return <SearchFixture {...props} />;
    },
    states: searchOverlayStates,
    // The popup is up to 36rem wide in a box of the frame's width: in a 14rem card it would be 12rem.
    statesLayout: "stack",
  },
  "organisms/filter-sidebar": {
    summary:
      "A listing's filters as a panel for the side of the products: the chosen filters as chips, every group in an accordion, and one “Apply filters” button, in a single GET form.",
    a11y: [
      "One GET form, named by its heading (“Filters”), whose fields are the listing's query: it works without JavaScript, the listing's other parameters (the sort) ride along as hidden inputs, and the page is left out, so new filters start at the first page.",
      "It does not submit when a box is ticked. A visitor ticks several boxes and moves a price range, and a page load after each would drop a keyboard reader's place, redraw the listing under a hand that has not finished and change the context on input (WCAG 3.2.2); “Apply filters” is the one submit.",
      "Each group is a disclosure: a button in a heading, with aria-expanded, that opens a region named by it. All of them start open, so the form is complete and usable before a script has run, and a closed group keeps its fields in the form, so what it holds is still sent. The on/off filters are plain switches in their own rows.",
      "The chosen filters come first, as ActiveFilterChips draws them: each chip has a link that removes it, and “Clear all” follows, all of them 44 px and working without JavaScript.",
      "Every row, button and link is at least 44 px tall and the ring is at full strength. Long labels wrap (wrap-anywhere), the panel is as tall as its content and never scrolls inside itself, and the page decides where it stands: beside the products from lg, with FilterDrawer below.",
    ],
    live: (ctx) => sidebar(ctx, panelOf(ctx), { headingLevel: 3 }),
    states: filterSidebarStates,
    statesLayout: "stack",
  },
  "organisms/filter-drawer": {
    summary:
      "A listing's filters for a narrow screen: a button that says how many are chosen opens a sheet with the same groups, “Clear all” and “Show 24 results”.",
    a11y: [
      "The button is 44 px and named “Filters” followed by how many are chosen (“Filters, 6 filters chosen”); the badge with the number is for the eye and hidden from assistive technology, and the visible word is in the name (WCAG 2.5.3).",
      "It opens a modal sheet from the start side, named by its title: the page behind is inert, focus starts on the close button, Tab and Shift+Tab go round the sheet and never leave it, and Escape closes it with focus back on the button.",
      "The sheet is three boxes in a column: the title and the close button, a body that scrolls between them and the foot, and a foot that stays in view with “Clear all” (a link to the listing without any filter, drawn only when something is chosen) and the submit “Show 24 results”. Following “Clear all” closes the sheet, because the page behind changes in place.",
      "The form is the sidebar's: the same groups in the same accordions (open at first), the listing's other parameters as hidden inputs, and a submit that loads the listing with the new filters. The count is the listing's as the page was drawn, so the submit stays pressable at 0 (“No results”): a disabled button would leave no way to apply the change that fixes it.",
      "The sheet is 90 % of the screen wide, up to 28 rem, and nothing slides under prefers-reduced-motion. The button needs JavaScript to open the sheet, which is why a page shows the sidebar, a plain form, from lg and this button below it.",
      "Every control is at least 44 px tall, the ring is at full strength, and long labels wrap (wrap-anywhere) in the button, the title, the groups and the foot's two buttons.",
    ],
    live: (ctx) => drawer(ctx, panelOf(ctx)),
    states: filterDrawerStates,
    // The sheet is 90 % of its box up to 28rem: in a 14rem card it would be 12rem wide.
    statesLayout: "stack",
  },
  "organisms/product-toolbar": {
    summary:
      "The bar above a listing's products: the count, the filters button on narrow screens, the sort, and a grid or list toggle.",
    a11y: [
      "The count is plain text (“24 products”), not a live region; it changes with the page, which the page's heading announces. It is the number of products the listing holds on every page, not the number on this one.",
      "The sort is SortSelect's form: a labelled select that works without JavaScript and keeps the listing's filters. The grid or list toggle is a group named “View” of two links, not buttons, so it works without JavaScript and each choice is an address; the current one is marked aria-current and drawn pressed (a filled background and a darker border, not a colour alone).",
      "The filters button is whatever the page puts in the slot (FilterDrawer) and is shown below lg only, because from lg the sidebar stands beside the products.",
      "Every control is at least 44 px and the ring is at full strength. On a phone the bar wraps: the filters button, the count and the toggle share the first row and the sort takes the next one across the width (in a longer language its Apply button wraps under the field), and the tab order is the order on screen: filters, toggle, sort. Long labels wrap (wrap-anywhere), nothing is cut and nothing is wider than the page.",
    ],
    live: (ctx) => toolbar(ctx, { count: panelOf(ctx).resultCount, view: "grid" }),
    states: productToolbarStates,
    // A toolbar spans its row: each state gets the frame's whole width.
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
