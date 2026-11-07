// Ours (T84, SETUP.md "Listing variants (T84)"; D59, D100, D102, M5 plan §1a). The parts the
// listing's filter layouts share: the results' columns (the toolbar, the chips, the grid and the
// pages) and the four new arrangements of the filters (popovers in a bar or a rail, toggles in rows,
// one panel in columns). Every arrangement is the same GET form as FilterSidebar's: the listing's
// `action`, its hidden parameters, and the groups' fields under the same names (FilterGroup's, or
// the toggles' native boxes named and valued as FilterGroup's are), so the listing island catches
// its submit and `/search` reads it without scripts (D59), whichever layout drew it.
// - Nothing here needs JavaScript (D100): a popover is HTML's own (`popover` and a button's
//   `popovertarget`: it opens, closes on Escape or a click outside, and takes the focus order after
//   its button, without a script), a panel is a native `<details>`, and a toggle is a native box in
//   its label. So the layouts add no client code to a listing's first load (D102): the client parts
//   they draw (FilterGroup's, FilterDrawer's) are M3's, already there.
// - A popover sits under its button (beside it in the rail) where the browser has CSS anchor
//   positioning, and in the middle of the window where it has not, as a dialog would.
// - Server components; `useId` names each popover, so the server's results and the island's, both
//   in the page, never share an id.
import { formatMessage, formatNumber, type Messages } from "@shopblok/i18n";
import type { FacetGroup, FilterPanel } from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { FilterGroup } from "@shopblok/ui/molecules/filter-group";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import { FilterDrawer } from "@shopblok/ui/organisms/filter-drawer";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import { ProductToolbar } from "@shopblok/ui/organisms/product-toolbar";
import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import NextLink from "next/link";
import { useId } from "react";
import type * as React from "react";
import type { ListingResultsCopy, ListingResultsProps } from "../listing-results";

// `next/link` takes whatever an app with typed routes narrows its `href` to; ours are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FiltersProps = FilterPanel & {
  copy: ListingResultsCopy;
  locale: string;
  prefetch?: boolean | null;
};

/** The results' root: the products alone, or the filters' column and the products. */
function ResultsRoot({
  layout,
  className,
  children,
}: {
  layout: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="listing-results"
      data-layout={layout}
      className={cn("grid min-w-0 gap-8", className)}
    >
      {children}
    </div>
  );
}

/** The products' column: what `lead` puts first, the toolbar, the chips, the grid and the pages. */
function ResultsProducts({
  results,
  drawer,
  chips,
  lead,
}: {
  results: ListingResultsProps;
  /** Where the toolbar draws FilterDrawer's button: below `lg`, at every width, or nowhere. */
  drawer: "below-lg" | "always" | "none";
  /** Whether the chosen filters' chips are drawn above the grid (at every width). */
  chips: boolean;
  /** Drawn before the toolbar: the top bar's popovers, the toggles, the inline panel. */
  lead?: React.ReactNode;
}) {
  const { toolbar, filters, grid, page, copy, locale, hrefFor, prefetch } = results;
  return (
    <div data-slot="listing-products" className="flex min-w-0 flex-col gap-6">
      {lead}
      <ProductToolbar
        {...toolbar}
        copy={copy.toolbar}
        sortCopy={copy.sort}
        locale={locale}
        prefetch={prefetch}
        filtersAlways={drawer === "always"}
        filters={
          filters === undefined || drawer === "none" ? undefined : (
            <FilterDrawer
              {...filters}
              copy={copy.drawer}
              groupCopy={copy.group}
              locale={locale}
              prefetch={prefetch}
            />
          )
        }
      />
      {!chips || filters?.active === undefined ? null : (
        <ActiveFilterChips
          active={filters.active}
          copy={copy.chips}
          locale={locale}
          prefetch={prefetch}
        />
      )}
      <ProductGrid {...grid} copy={copy.grid} locale={locale} heading="h2" prefetch={prefetch} />
      <Pagination {...page} hrefFor={hrefFor} copy={copy.pagination} locale={locale} />
    </div>
  );
}

/** The listing's other parameters (its scope, the sort), which every filter form carries. */
function HiddenParams({ params }: Pick<FilterPanel, "params">) {
  return params.map((param, index) => (
    <input key={`${param.name}-${index}`} type="hidden" name={param.name} value={param.value} />
  ));
}

/** How many of a group's values are chosen: a box each, a range or a toggle one. */
function chosenIn(group: FacetGroup): number {
  if (group.kind === "checkbox" || group.kind === "swatch")
    return group.options.filter((option) => option.selected).length;
  if (group.kind === "range") return group.selected === undefined ? 0 : 1;
  return group.selected ? 1 : 0;
}

/** A group's button's count: a badge for the eye, the drawer's sentence for the ear. */
function ChosenCount({
  count,
  copy,
  locale,
}: {
  count: number;
  copy: Messages["organisms"]["filterDrawer"];
  locale: string;
}) {
  if (count === 0) return null;
  return (
    <>
      <VisuallyHidden>, {formatMessage(copy.chosen, { count }, locale)}</VisuallyHidden>
      <Badge variant="secondary" aria-hidden="true" className="min-w-5">
        {formatNumber(count, locale)}
      </Badge>
    </>
  );
}

/** A dashed ident for CSS from React's id, which may hold characters an ident may not. */
const anchorFor = (id: string) => `--filter-${id.replace(/[^A-Za-z0-9_-]/g, "")}`;

/**
 * Each group a button that opens its values in a popover (T84's `top-bar` and `rail`): one form,
 * every popover's fields its own, and "Apply filters" in each popover. An on/off group is its
 * switch in the row, since a popover over one switch would hide a control behind another.
 */
function PopoverFilters({
  action,
  groups,
  params,
  copy,
  locale,
  orientation,
  className,
}: FiltersProps & { orientation: "bar" | "rail"; className?: string }) {
  const base = useId();
  const rail = orientation === "rail";
  return (
    <form
      action={action}
      method="get"
      aria-label={copy.sidebar.title}
      data-slot="filter-popovers"
      data-orientation={orientation}
      className={cn(
        "flex min-w-0 gap-2",
        rail ? "flex-col items-stretch" : "flex-wrap items-center",
        className,
      )}
    >
      <HiddenParams params={params} />
      {groups.map((group, index) => {
        if (group.kind === "toggle")
          return (
            <div
              key={group.id}
              data-slot="filter-popover-toggle"
              className={cn("min-w-0", rail ? "border-y" : "rounded-md border px-3")}
            >
              <FilterGroup facet={group} copy={copy.group} locale={locale} />
            </div>
          );
        const id = `${base}-filter-${index}`;
        const anchor = anchorFor(id);
        return (
          <div key={group.id} className="contents">
            <button
              type="button"
              popoverTarget={id}
              data-slot="filter-popover-trigger"
              style={{ anchorName: anchor }}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "max-w-full min-w-0",
                rail && "justify-between",
              )}
            >
              <span className="min-w-0 wrap-anywhere">
                {group.label}
                <ChosenCount count={chosenIn(group)} copy={copy.drawer} locale={locale} />
              </span>
              <Icon icon={ChevronDownIcon} className={cn(rail && "-rotate-90 rtl:rotate-90")} />
            </button>
            <div
              id={id}
              popover="auto"
              data-slot="filter-popover"
              style={{ positionAnchor: anchor }}
              className={cn(
                // Without anchor positioning: in the middle of the window, as a dialog.
                "fixed inset-0 m-auto h-fit max-h-[min(70vh,32rem)] w-80 max-w-[calc(100vw-2rem)] [contain:paint] overflow-y-auto overscroll-contain rounded-lg border bg-popover p-4 text-popover-foreground shadow-md",
                "supports-[position-area:block-end]:inset-auto supports-[position-area:block-end]:m-0",
                rail
                  ? "supports-[position-area:block-end]:ms-2 supports-[position-area:block-end]:[position-area:inline-end_span-block-end] supports-[position-area:block-end]:[position-try-fallbacks:flip-block]"
                  : "supports-[position-area:block-end]:mt-2 supports-[position-area:block-end]:[position-area:block-end_span-inline-end] supports-[position-area:block-end]:[position-try-fallbacks:flip-inline]",
              )}
            >
              <div className="flex flex-col gap-4">
                <FilterGroup facet={group} copy={copy.group} locale={locale} />
                <Button type="submit" data-slot="filter-popover-apply" className="w-full">
                  {copy.sidebar.apply}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </form>
  );
}

/** An option's count beside its name, muted, and the same count read after it (FilterGroup's). */
function OptionCount({
  count,
  copy,
  locale,
}: {
  count: number;
  copy: FiltersProps["copy"];
  locale: string;
}) {
  return (
    <>
      <span aria-hidden="true" className="text-muted-foreground tabular-nums">
        {formatNumber(count, locale)}
      </span>
      <VisuallyHidden>, {formatMessage(copy.group.products, { count }, locale)}</VisuallyHidden>
    </>
  );
}

/**
 * Each group's values as toggles in a row (T84's `chips`, for a shop with few filters): a box and
 * a swatch option are a native box in a 44 px pill, named and valued as FilterGroup's, so the same
 * query is sent; the price range and the on/off filters are FilterGroup's own fields, in one row
 * with "Apply filters", which sends them (a tick never reloads the page, WCAG 3.2.2, as the sidebar's rule says).
 */
function ToggleFilters({ action, groups, params, copy, locale }: FiltersProps) {
  return (
    <form
      action={action}
      method="get"
      aria-label={copy.sidebar.title}
      data-slot="filter-toggles"
      className="flex min-w-0 flex-col gap-4"
    >
      <HiddenParams params={params} />
      {groups.map((group) =>
        group.kind !== "checkbox" && group.kind !== "swatch" ? null : (
          <fieldset key={group.id} data-slot="filter-toggle-group" className="min-w-0">
            <legend className="mb-2 text-sm font-medium wrap-anywhere">{group.label}</legend>
            <ul className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const dead = option.count === 0 && !option.selected;
                return (
                  <li key={option.value} className="min-w-0">
                    <label
                      data-slot="filter-toggle"
                      className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border border-input px-4 text-sm has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-50 [&:has(:checked)_span]:text-primary-foreground"
                    >
                      <input
                        type="checkbox"
                        name={group.id}
                        value={option.value}
                        defaultChecked={option.selected}
                        disabled={dead}
                        className="sr-only"
                      />
                      {group.kind === "swatch" && "hex" in option && option.hex !== undefined ? (
                        <span
                          aria-hidden="true"
                          className="size-4 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: option.hex }}
                        />
                      ) : null}
                      <span className="min-w-0 wrap-anywhere">{option.label}</span>
                      <OptionCount count={option.count} copy={copy} locale={locale} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ),
      )}
      {/* The price range and the on/off filters in one row with the submit, in the facets' order. */}
      <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4">
        {groups.map((group) =>
          group.kind === "checkbox" || group.kind === "swatch" ? null : (
            <div
              key={group.id}
              data-slot="filter-toggle-field"
              className={cn("min-w-0", group.kind === "range" ? "w-full sm:w-80" : "w-full sm:w-56")}
            >
              <FilterGroup facet={group} copy={copy.group} locale={locale} />
            </div>
          ),
        )}
        <Button type="submit" data-slot="filter-toggles-apply">
          {copy.sidebar.apply}
        </Button>
      </div>
    </form>
  );
}

/**
 * The filters as one panel above the grid (T84's `inline`): a native disclosure ("Filters", and
 * how many are chosen) whose form holds every group in columns, opened and closed as one, with
 * "Clear all" (when something is chosen) and "Apply filters".
 */
function InlineFilters({ action, groups, params, active, copy, locale, prefetch }: FiltersProps) {
  const count = active?.filters.length ?? 0;
  return (
    <details data-slot="filter-inline" className="group/inline min-w-0 rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Icon icon={SlidersHorizontalIcon} />
        <span className="min-w-0 flex-1 wrap-anywhere">
          {copy.drawer.open}
          {count === 0 ? null : (
            <VisuallyHidden>
              , {formatMessage(copy.drawer.chosen, { count }, locale)}
            </VisuallyHidden>
          )}
        </span>
        {count === 0 ? null : (
          <Badge variant="secondary" aria-hidden="true" className="min-w-5">
            {formatNumber(count, locale)}
          </Badge>
        )}
        <Icon
          icon={ChevronDownIcon}
          className="text-muted-foreground transition-transform duration-150 group-open/inline:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <form
        action={action}
        method="get"
        aria-label={copy.sidebar.title}
        data-slot="filter-inline-form"
        className="grid min-w-0 gap-6 border-t p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <HiddenParams params={params} />
        {groups.map((group) => (
          <div key={group.id} data-slot="filter-inline-group" className="min-w-0">
            <FilterGroup facet={group} copy={copy.group} locale={locale} />
          </div>
        ))}
        <div className="col-span-full flex flex-wrap gap-2">
          {active === undefined ? null : (
            <NextLink
              href={active.clearHref as LinkHref}
              prefetch={prefetch}
              data-slot="filter-inline-clear"
              className={cn(buttonVariants({ variant: "outline" }), "max-w-full")}
            >
              <span className="min-w-0 wrap-anywhere">{copy.drawer.clear}</span>
            </NextLink>
          )}
          <Button type="submit" data-slot="filter-inline-apply">
            {copy.sidebar.apply}
          </Button>
        </div>
      </form>
    </details>
  );
}

export { HiddenParams, InlineFilters, PopoverFilters, ResultsProducts, ResultsRoot, ToggleFilters };
export type { FiltersProps };
