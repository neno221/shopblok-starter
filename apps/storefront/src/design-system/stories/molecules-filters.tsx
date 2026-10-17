import { commerceFixtures, sampleImage } from "@shopblok/fixtures";
import { catalogs, type Messages } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  ActiveFilters,
  CheckboxFacet,
  FacetGroup,
  QueryParam,
  SwatchFacet,
} from "@shopblok/registry/contracts";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { FilterGroup } from "@shopblok/ui/molecules/filter-group";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of FilterGroup and ActiveFilterChips (T33, SETUP.md "Discovery and site-wide
// molecules (T33)"). Sample data is `commerceFixtures[ctx.locale]`, copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// Both render on the server. FilterGroup's client parts (the price range and the swatch) get plain
// strings and numbers from it, so a story hands FilterGroup only its contract's facet and the copy.
// A group is only fields: its caller's form sends them (FilterSidebar and FilterDrawer, T37), so each
// story wraps one group, or the six of the live render, in a GET form to `#`. No state names a
// form field twice in one form, and the ids Base UI and `useId` make are unique across the page.
// ActiveFilterChips' links are the listing's own addresses (`{market}/store?…`), which do not exist
// before M3: like every fixture link they are the addresses the app will build, and the stories
// pass `prefetch={false}` so a production build does not prefetch them into a 404.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

type Kind = FacetGroup["kind"];
type FacetOf<K extends Kind> = Extract<FacetGroup, { kind: K }>;

/** One of the fixtures' six facets, by its id; a story that names the wrong one fails at once. */
function facetOf<K extends Kind>(ctx: DsContext, id: string, kind: K): FacetOf<K> {
  const found = fixtures(ctx).facets.find((facet) => facet.id === id);
  if (found?.kind !== kind) throw new Error(`The fixtures have no ${kind} facet "${id}"`);
  return found as FacetOf<K>;
}

/** The facet's options with a new count or chosen state for some of them, by value. */
function adjusted<F extends CheckboxFacet | SwatchFacet>(
  facet: F,
  changes: Record<string, { count?: number; selected?: boolean }>,
): F {
  return {
    ...facet,
    options: facet.options.map((option) => ({ ...option, ...changes[option.value] })),
  };
}

// --- FilterGroup ---

type GroupOptions = {
  limit?: number;
  hideLegend?: boolean;
  /** Words of the catalog to replace (a long case). */
  words?: Partial<Messages["molecules"]["filterGroup"]>;
};

function group(ctx: DsContext, facet: FacetGroup, options: GroupOptions = {}) {
  return (
    <FilterGroup
      facet={facet}
      copy={{ ...copy(ctx).filterGroup, ...options.words }}
      locale={lang(ctx)}
      limit={options.limit}
      hideLegend={options.hideLegend}
    />
  );
}

/** A group in the GET form its caller would hold, the width of a filter sidebar. */
function inForm(ctx: DsContext, facet: FacetGroup, options?: GroupOptions) {
  return (
    <form action="#" method="get" className="w-full max-w-sm">
      {group(ctx, facet, options)}
    </form>
  );
}

/** The six facets of the fixtures, as a sidebar's form draws them. */
function sidebar(ctx: DsContext) {
  return (
    <form action="#" method="get" className="flex w-full max-w-sm flex-col gap-4">
      {fixtures(ctx).facets.map((facet) => (
        <div key={facet.id} className="border-b pb-4 last:border-b-0 last:pb-0">
          {group(ctx, facet)}
        </div>
      ))}
    </form>
  );
}

/** The long strings of the DS fixtures as the names of a checkbox or swatch group's options. */
function longOptions(ctx: DsContext) {
  const { optionLabel, toggleLabel, chipLabel, badge, hint, linkLabel, productName } =
    ctx.fixture.long;
  // Large counts too: the grouping marks of the locale make the digits wider.
  return [
    { label: optionLabel, count: 1284 },
    { label: toggleLabel, count: 12 },
    { label: chipLabel, count: 7 },
    { label: badge, count: 3 },
    { label: hint, count: 1 },
    { label: linkLabel, count: 12480 },
    { label: productName, count: 950 },
  ].map((option, index) => ({ ...option, value: `long-${index + 1}`, selected: index === 6 }));
}

/** Greys and blues for the long swatches: any six-digit colour will do. */
const longHex = ["#1f1f1f", "#f2ede2", "#c9b79c", "#3b4a3f", "#1f2a44", "#8aa6c1", "#6b4f3a"];

const filterGroupStates: readonly DsState[] = [
  {
    id: "checkbox",
    label: "Checkbox group",
    description:
      "A fieldset named by its legend, a checkbox per option with its count: M is chosen, so the form sends size=m.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "size", "checkbox")),
  },
  {
    id: "show-more",
    label: "Show more, closed",
    description:
      "Eight options and a limit of six: the last two sit behind a native disclosure (Show 2 more). Its fields are in the form even while it is closed.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "category", "checkbox")),
  },
  {
    id: "show-more-open",
    label: "Show more, opened by a chosen option",
    description:
      "A chosen option among the last two opens the disclosure by itself: the visitor never has a filter hidden from them.",
    render: (ctx) =>
      inForm(
        ctx,
        adjusted(facetOf(ctx, "category", "checkbox"), { "ankle-socks": { selected: true } }),
      ),
  },
  {
    id: "zero-count",
    label: "Nothing left in an option",
    description:
      "XS and XXL have a count of 0 and are not chosen: disabled and muted, since adding them could only give an empty page. M is chosen with a count of 0 (a stale link): it stays enabled so it can be taken off.",
    render: (ctx) =>
      inForm(
        ctx,
        adjusted(facetOf(ctx, "size", "checkbox"), {
          xs: { count: 0 },
          xxl: { count: 0 },
          m: { count: 0 },
        }),
      ),
  },
  {
    id: "swatch",
    label: "Swatch group",
    description:
      "The colours as swatches, each with its name and count beside it. Black and Forest green are chosen (a thicker edge), so the form sends colour=black&colour=forest.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "colour", "swatch")),
  },
  {
    id: "swatch-open",
    label: "Swatch, opened by a chosen colour",
    description:
      "Sky blue is behind Show more and chosen: the disclosure is open, and the swatches in it behave like the others.",
    render: (ctx) =>
      inForm(ctx, adjusted(facetOf(ctx, "colour", "swatch"), { sky: { selected: true } })),
  },
  {
    id: "swatch-zero",
    label: "Swatch, nothing left",
    description:
      "White has a count of 0 and is not chosen: disabled. Forest green is chosen with a count of 0: still enabled.",
    render: (ctx) =>
      inForm(
        ctx,
        adjusted(facetOf(ctx, "colour", "swatch"), { white: { count: 0 }, forest: { count: 0 } }),
      ),
  },
  {
    id: "swatch-image",
    label: "Swatch with a picture",
    description: "A colour can be a picture of the fabric instead of a flat colour.",
    render: (ctx) => {
      const colour = facetOf(ctx, "colour", "swatch");
      return inForm(ctx, {
        ...colour,
        // The third and fifth colour are pictures: an option with an image and no hex.
        options: colour.options.map((option, index) =>
          index === 2 || index === 4
            ? {
                value: option.value,
                label: option.label,
                count: option.count,
                selected: option.selected,
                image: { ...sampleImage, alt: option.label },
              }
            : option,
        ),
      });
    },
  },
  {
    id: "range",
    label: "Price range, chosen",
    description:
      "Two number fields and a slider with two thumbs, in the market's currency. The chosen range is in the fields, so the form sends price.min and price.max.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "price", "range")),
  },
  {
    id: "range-untouched",
    label: "Price range, not chosen",
    description:
      "Nothing chosen: the fields are empty (their placeholders are the ends) and the thumbs are at the ends. An empty field is no limit.",
    render: (ctx) => inForm(ctx, { ...facetOf(ctx, "price", "range"), selected: undefined }),
  },
  {
    id: "range-one-price",
    label: "Price range, one price",
    description:
      "Every product costs the same: the slider has nothing to move, so it is left out and the two fields remain.",
    render: (ctx) => {
      const price = facetOf(ctx, "price", "range");
      return inForm(ctx, { ...price, min: 49, max: 49, selected: undefined });
    },
  },
  {
    id: "toggle",
    label: "Switch, on",
    description:
      "An on/off filter is a switch in its own label, with no group around it. It is on, so the form sends in-stock=1.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "in-stock", "toggle")),
  },
  {
    id: "toggle-off",
    label: "Switch, off",
    description: "Off: the form sends nothing for it.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "on-sale", "toggle")),
  },
  {
    id: "toggle-zero",
    label: "Switch, nothing left",
    description:
      "Nothing is on sale in this listing: the switch is off, disabled and muted, like an option with a count of 0.",
    render: (ctx) => inForm(ctx, { ...facetOf(ctx, "on-sale", "toggle"), count: 0 }),
  },
  {
    id: "hidden-legend",
    label: "Legend hidden",
    description:
      "For a parent that already shows the facet's name, such as an accordion's trigger: the legend stays for assistive technology and leaves the screen.",
    render: (ctx) => inForm(ctx, facetOf(ctx, "size", "checkbox"), { hideLegend: true }),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "A long group name and long option names wrap inside the column, with counts in the thousands. The last option is chosen, so the disclosure is open.",
    render: (ctx) => {
      const size = facetOf(ctx, "size", "checkbox");
      return inForm(ctx, {
        ...size,
        label: ctx.fixture.long.fieldLabel,
        options: longOptions(ctx),
      });
    },
  },
  {
    id: "long-swatch",
    label: "Long swatch names",
    description: "Long colour names wrap beside their swatch, which keeps its 44 px.",
    render: (ctx) => {
      const colour = facetOf(ctx, "colour", "swatch");
      return inForm(ctx, {
        ...colour,
        label: ctx.fixture.long.fieldLabel,
        options: longOptions(ctx).map((option, index) => ({
          ...option,
          hex: longHex[index],
          selected: index === 0,
        })),
      });
    },
  },
  {
    id: "long-toggle",
    label: "Long switch label",
    description: "A long switch label wraps and the switch stays at its end.",
    render: (ctx) =>
      inForm(ctx, { ...facetOf(ctx, "on-sale", "toggle"), label: ctx.fixture.long.toggleLabel }),
  },
  {
    id: "long-range",
    label: "Long range labels",
    description:
      "Long names for the two fields wrap above them, and the fields share the row (each may shrink to its half).",
    render: (ctx) => {
      const { fieldLabel, optionLabel, hint } = ctx.fixture.long;
      return inForm(
        ctx,
        { ...facetOf(ctx, "price", "range"), label: fieldLabel },
        { words: { minimum: optionLabel, maximum: hint } },
      );
    },
  },
];

// --- ActiveFilterChips ---

function chips(ctx: DsContext, active: ActiveFilters) {
  return (
    <ActiveFilterChips
      active={active}
      copy={copy(ctx).activeFilterChips}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

/** The market's listing: the page the chips remove filters from. */
const listingPath = (ctx: DsContext) => `${fixtures(ctx).prefix}/store`;

type ChipSpec = { id: string; group?: string; label: string; params: QueryParam[] };

/**
 * A list of chips for these filters. Each chip's link is the listing with the other chips' query
 * parameters, the way the app builds it, and "Clear all" is the listing alone.
 */
function chipsFor(ctx: DsContext, specs: readonly ChipSpec[]): ActiveFilters {
  const listing = listingPath(ctx);
  const query = (params: QueryParam[]) =>
    params.length === 0
      ? listing
      : `${listing}?${new URLSearchParams(params.map(({ name, value }) => [name, value]))}`;
  const [first, ...rest] = specs.map(({ id, group, label }, index) => ({
    id,
    ...(group === undefined ? {} : { group }),
    label,
    removeHref: query(specs.flatMap((spec, other) => (other === index ? [] : spec.params))),
  }));
  if (first === undefined) throw new Error("A list of chips needs a chip");
  return { filters: [first, ...rest], clearHref: listing };
}

/** The checkbox and swatch options of the fixtures' facets, each as a chip. */
function optionChips(ctx: DsContext, ids: readonly string[]): ChipSpec[] {
  return fixtures(ctx).facets.flatMap((facet) =>
    (facet.kind === "checkbox" || facet.kind === "swatch") && ids.includes(facet.id)
      ? facet.options.map((option) => ({
          id: `${facet.id}:${option.value}`,
          group: facet.label,
          label: option.label,
          params: [{ name: facet.id, value: option.value }],
        }))
      : [],
  );
}

const activeFilterChipsStates: readonly DsState[] = [
  {
    id: "default",
    label: "Six filters",
    description:
      "The filters the facets have chosen: a category, two colours, a size, a price range and an on/off filter (which has no group in front of its label).",
    render: (ctx) => chips(ctx, fixtures(ctx).activeFilters),
  },
  {
    id: "one",
    label: "One filter",
    description:
      "A single chip: its link goes to the listing without it, which is the same page Clear all goes to.",
    render: (ctx) => {
      const { filters, clearHref } = fixtures(ctx).activeFilters;
      const [first] = filters;
      if (first === undefined) throw new Error("The fixtures have no active filter");
      return chips(ctx, { filters: [{ ...first, removeHref: clearHref }], clearHref });
    },
  },
  {
    id: "on-off",
    label: "On/off filters",
    description:
      "An on/off filter says its label alone. Its remove link is still named with it: Remove In stock.",
    render: (ctx) => {
      const inStock = facetOf(ctx, "in-stock", "toggle");
      const onSale = facetOf(ctx, "on-sale", "toggle");
      return chips(
        ctx,
        chipsFor(ctx, [
          { id: inStock.id, label: inStock.label, params: [{ name: inStock.id, value: "1" }] },
          { id: onSale.id, label: onSale.label, params: [{ name: onSale.id, value: "1" }] },
        ]),
      );
    },
  },
  {
    id: "many",
    label: "Many filters",
    description: "Fourteen chips wrap in rows; the 44 px remove links of two rows do not overlap.",
    render: (ctx) => chips(ctx, chipsFor(ctx, optionChips(ctx, ["colour", "size"]))),
  },
  {
    id: "long",
    label: "Long labels",
    description:
      "Long names wrap inside their chip, which never grows wider than the row, and the remove link stays beside the last line.",
    render: (ctx) => {
      const { fieldLabel, optionLabel, toggleLabel, chipLabel, productName } = ctx.fixture.long;
      return chips(
        ctx,
        chipsFor(ctx, [
          {
            id: "long:1",
            group: fieldLabel,
            label: optionLabel,
            params: [{ name: "long", value: "1" }],
          },
          { id: "long:2", label: toggleLabel, params: [{ name: "long-toggle", value: "1" }] },
          {
            id: "long:3",
            group: chipLabel,
            label: productName,
            params: [{ name: "long", value: "3" }],
          },
        ]),
      );
    },
  },
];

export const filterMoleculeStories = {
  "molecules/filter-group": {
    summary:
      "One facet of a listing's filters, drawn by its kind as form fields for the caller's GET form: checkboxes, swatches, a price range or a switch.",
    a11y: [
      "A checkbox, swatch or range group is a fieldset with a visible legend, so a screen reader announces the group's name on entering it. An on/off filter is a switch in its own label and has no group.",
      "Each option is read with its count after its name (Black, 8 products); the digits on screen are hidden from assistive technology so they are not read twice. Rows are 44 px tall, and a click on the words toggles the box.",
      "A swatch is a checkbox (role checkbox with aria-checked, no aria-pressed) named by the words beside it, so the colour is never told by the disc alone.",
      "An option with a count of 0 is disabled and muted, unless it is chosen: a chosen filter can always be taken off.",
      "Show more is a native details and summary: Enter or Space opens it, the focus stays on the summary and the next Tab is the first new option; it works without JavaScript, and a chosen option inside opens it.",
      "The price range's number fields are the form's own (price.min, price.max) and work alone; the slider's two thumbs have the same names, speak their value as money, and move one unit with the arrow keys.",
    ],
    live: sidebar,
    states: filterGroupStates,
  },
  "molecules/active-filter-chips": {
    summary:
      "The filters a listing has applied, as chips that each remove their filter by a link, with Clear all after them.",
    a11y: [
      "A list named by its size (6 active filters); each chip is one item and says its group and value (Color: Black).",
      "The remove control is a link, not a button, so removing a filter is a navigation that works without JavaScript. Its name carries the whole chip (Remove Color: Black), because the visible control is the same X on every chip.",
      "The X is 44 px square around a 16 px icon, in a chip that stays 32 px tall; the focus ring is at full strength.",
      "Clear all is the last item, a link named Clear all filters, which holds the words on screen.",
      "With no filter applied nothing is drawn: removing the last chip removes the list.",
    ],
    live: (ctx) => chips(ctx, fixtures(ctx).activeFilters),
    states: activeFilterChipsStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
