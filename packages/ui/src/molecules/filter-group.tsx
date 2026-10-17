// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). One facet of a listing's filters,
// drawn by its `kind` as form fields for the caller's GET form (FilterSidebar and FilterDrawer, T37,
// hold the form; SPEC §8.4: filters live in the URL). A group has a visible name, a `fieldset` and
// its `legend`; an on/off filter is its own label and has none. The fields, and so the query:
// - `checkbox`: a Checkbox atom per option, named by the facet's `id` and valued by the option's
//   `value`, so two chosen sizes send `size=m&size=l`;
// - `swatch`: the same fields, each drawn as a Swatch with the colour's name beside it;
// - `range`: two number fields, `{id}.min` and `{id}.max`, and a slider with two thumbs that moves
//   them (the client part, `filter-group-price-range.tsx`); without JavaScript the fields alone work;
// - `toggle`: a Switch named by the facet's `id` that sends `{id}=1` when it is on.
// Each option's count is drawn apart from its name, muted, and read after it ("Black, 8 products"), so
// it is part of the name. An option with a count of 0 is still listed, but disabled and muted: adding
// it could only give an empty page (SBP product-listing.md: "gray out options with 0 products"). A
// chosen option is never disabled, so a stale link's filter can always be taken off. Over `limit`
// options (6) the rest sit in a native `<details>` ("Show 4 more" / "Show fewer"): it works without
// JavaScript, its fields are in the form whether it is open or closed, a chosen option among them
// opens it, and the focus stays on the summary when it opens, so the next Tab is the first new option.
// Long names wrap. A server component: it holds no state; its client parts are the checkboxes, the
// switch, the swatch and the price range, each given plain strings.
import { formatMessage, formatMoney, formatNumber } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type {
  CheckboxFacet,
  FacetGroup,
  RangeFacet,
  SwatchFacet,
  ToggleFacet,
} from "@shopblok/registry/contracts";
import { Checkbox } from "@shopblok/ui/atoms/checkbox";
import { Label } from "@shopblok/ui/atoms/label";
import { Switch } from "@shopblok/ui/atoms/switch";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { FieldLegend, FieldSet } from "@shopblok/ui/primitives/field";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";
import { PriceRange } from "./filter-group-price-range";
import { FilterSwatchOption } from "./filter-group-swatch-option";

/** What a switch sends when it is on: the URL carries `in-stock=1`. */
const TOGGLE_VALUE = "1";

/** How many options show before "Show more", unless the caller says. */
const DEFAULT_LIMIT = 6;

type FilterGroupCopy = Messages["molecules"]["filterGroup"];

type FilterGroupProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The facet and its kind. */
  facet: FacetGroup;
  /** The wording, from the catalog's `molecules.filterGroup`. */
  copy: FilterGroupCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** How many options show before "Show N more"; the default is 6. */
  limit?: number;
  /**
   * Hides the legend from sight and keeps it for assistive technology: for a parent that already
   * shows the facet's name (an accordion's trigger).
   */
  hideLegend?: boolean;
};

/** An option row's label: the 44 px target, the name taking the room, a dead option muted. */
const optionRow =
  "min-h-11 w-full cursor-pointer gap-3 py-1 font-normal has-data-disabled:cursor-not-allowed has-data-disabled:text-muted-foreground has-data-disabled:opacity-100";

/** Nothing is left for an option, and it is not chosen: it cannot be added. */
const isDead = (count: number, selected: boolean) => count === 0 && !selected;

/** The count beside a name, muted, and the same count read after it. */
function Count({ count, copy, locale }: { count: number; copy: FilterGroupCopy; locale: string }) {
  return (
    <>
      <span
        data-slot="filter-count"
        aria-hidden="true"
        className="shrink-0 text-sm text-muted-foreground tabular-nums"
      >
        {formatNumber(count, locale)}
      </span>
      <VisuallyHidden>, {formatMessage(copy.products, { count }, locale)}</VisuallyHidden>
    </>
  );
}

function CheckboxOption({
  facet,
  option,
  copy,
  locale,
}: {
  facet: CheckboxFacet;
  option: CheckboxFacet["options"][number];
  copy: FilterGroupCopy;
  locale: string;
}) {
  return (
    <li>
      <Label className={optionRow}>
        <Checkbox
          name={facet.id}
          value={option.value}
          defaultChecked={option.selected}
          disabled={isDead(option.count, option.selected)}
        />
        <span className="min-w-0 flex-1 wrap-anywhere">{option.label}</span>
        <Count count={option.count} copy={copy} locale={locale} />
      </Label>
    </li>
  );
}

function SwatchOption({
  facet,
  option,
  copy,
  locale,
}: {
  facet: SwatchFacet;
  option: SwatchFacet["options"][number];
  copy: FilterGroupCopy;
  locale: string;
}) {
  return (
    <li>
      <FilterSwatchOption
        name={facet.id}
        value={option.value}
        label={option.label}
        colour={option.hex}
        image={option.image?.src}
        defaultChecked={option.selected}
        disabled={isDead(option.count, option.selected)}
        count={formatNumber(option.count, locale)}
        countLabel={formatMessage(copy.products, { count: option.count }, locale)}
      />
    </li>
  );
}

/** The options of a checkbox or swatch group: the first `limit`, then the rest behind a disclosure. */
function OptionList({
  facet,
  copy,
  locale,
  limit,
}: {
  facet: CheckboxFacet | SwatchFacet;
  copy: FilterGroupCopy;
  locale: string;
  limit: number;
}) {
  const shown = facet.options.slice(0, limit);
  const rest = facet.options.slice(limit);

  function list(options: typeof facet.options) {
    return (
      <ul role="list" className="flex flex-col">
        {options.map((option) =>
          facet.kind === "swatch" ? (
            <SwatchOption
              key={option.value}
              facet={facet}
              option={option}
              copy={copy}
              locale={locale}
            />
          ) : (
            <CheckboxOption
              key={option.value}
              facet={facet}
              option={option}
              copy={copy}
              locale={locale}
            />
          ),
        )}
      </ul>
    );
  }

  return (
    <>
      {list(shown)}
      {rest.length > 0 ? (
        <details
          data-slot="filter-more"
          open={rest.some((option) => option.selected)}
          className="group/more"
        >
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm font-medium outline-none select-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="group-open/more:hidden">
              {formatMessage(copy.showMore, { count: rest.length }, locale)}
            </span>
            <span className="hidden group-open/more:inline">{copy.showFewer}</span>
            <ChevronDownIcon aria-hidden="true" className="size-4 group-open/more:rotate-180" />
            <VisuallyHidden>, {facet.label}</VisuallyHidden>
          </summary>
          {list(rest)}
        </details>
      ) : null}
    </>
  );
}

function ToggleRow({
  facet,
  copy,
  locale,
}: {
  facet: ToggleFacet;
  copy: FilterGroupCopy;
  locale: string;
}) {
  return (
    <Label className={cn(optionRow, "justify-between")}>
      <span className="min-w-0 flex-1 wrap-anywhere">{facet.label}</span>
      <Count count={facet.count} copy={copy} locale={locale} />
      <Switch
        name={facet.id}
        value={TOGGLE_VALUE}
        defaultChecked={facet.selected}
        disabled={isDead(facet.count, facet.selected)}
      />
    </Label>
  );
}

function RangeFields({
  facet,
  copy,
  locale,
}: {
  facet: RangeFacet;
  copy: FilterGroupCopy;
  locale: string;
}) {
  return (
    <PriceRange
      id={facet.id}
      currencyCode={facet.currencyCode}
      min={facet.min}
      max={facet.max}
      selected={facet.selected}
      locale={locale}
      minimumLabel={copy.minimum}
      maximumLabel={copy.maximum}
      boundsText={formatMessage(
        copy.bounds,
        {
          min: formatMoney(facet.min, facet.currencyCode, locale),
          max: formatMoney(facet.max, facet.currencyCode, locale),
        },
        locale,
      )}
    />
  );
}

function FilterGroup({
  facet,
  copy,
  locale,
  limit = DEFAULT_LIMIT,
  hideLegend = false,
  className,
  ...props
}: FilterGroupProps) {
  return (
    <div
      data-slot="filter-group"
      data-kind={facet.kind}
      className={cn("min-w-0", className)}
      {...props}
    >
      {facet.kind === "toggle" ? (
        <ToggleRow facet={facet} copy={copy} locale={locale} />
      ) : (
        <FieldSet className="min-w-0 gap-0">
          <FieldLegend
            variant="label"
            className={cn("mb-1 wrap-anywhere", hideLegend && "sr-only")}
          >
            {facet.label}
          </FieldLegend>
          {facet.kind === "range" ? (
            <RangeFields facet={facet} copy={copy} locale={locale} />
          ) : (
            <OptionList facet={facet} copy={copy} locale={locale} limit={limit} />
          )}
        </FieldSet>
      )}
    </div>
  );
}

export { FilterGroup, TOGGLE_VALUE };
export type { FilterGroupProps };
