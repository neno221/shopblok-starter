// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4: filters live in the URL, D42). The
// filters of a listing as a panel: a heading, the chosen filters as chips with their way off ("Clear
// all" among them), every facet's group in an accordion, and "Apply filters". One GET form to the
// listing's `action`: the groups' fields are the query, the listing's other parameters (the sort)
// ride along as hidden inputs without the page, so a new filter starts at the first page, and the
// whole form works without JavaScript. The page decides where it stands (beside the products from
// `lg`; below `lg` it puts FilterDrawer, which holds the same fields); this is the panel alone, as
// tall as its content, with no scroll of its own. A server component.
// - It does NOT submit when a box is ticked. SortSelect submits on change because it has one
//   control and a choice made with a pointer is a whole decision; here a visitor ticks several boxes
//   and moves a price range, and a page load after each tick would drop the keyboard reader's place
//   (the focus returns to the top of a new page), re-draw the listing under a hand that has not
//   finished, and is a change of context on input (WCAG 3.2.2). "Apply filters" is the one
//   submit, so a visitor changes as much as they like and applies once. The counts beside the
//   options are the listing's as it was drawn, so they would be stale after the first tick anyway.
// - The form is a landmark named by the heading (`aria-labelledby`), so a reader of the page finds
//   the filters by their name. A page has one of them in view at a time (the drawer's form is in a
//   dialog that exists only while it is open), and the design system names each state's apart.
// - The sections' headings are one level under the panel's (`headingLevel`, 2 by default, so 3).
import type { Messages } from "@shopblok/i18n";
import type { FilterPanel } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { useId } from "react";
import type * as React from "react";
import { FilterFields } from "./filter-fields";

type FilterSidebarProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "aria-label" | "aria-labelledby"
> &
  FilterPanel & {
    /** The wording, from the catalog's `organisms.filterSidebar`. */
    copy: Messages["organisms"]["filterSidebar"];
    /** FilterGroup's wording, from the catalog's `molecules.filterGroup`. */
    groupCopy: Messages["molecules"]["filterGroup"];
    /** ActiveFilterChips' wording, from the catalog's `molecules.activeFilterChips`. */
    chipsCopy: Messages["molecules"]["activeFilterChips"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The chips' links' `prefetch` (next/link); the design system passes `false`. */
    prefetch?: boolean | null;
    /** The panel's heading level; its sections sit one level under it. Default 2. */
    headingLevel?: 2 | 3 | 4;
  };

function FilterSidebar({
  action,
  groups,
  params,
  active,
  // The drawer's "show N results" is the only place that count is drawn.
  resultCount: _resultCount,
  copy,
  groupCopy,
  chipsCopy,
  locale,
  prefetch,
  headingLevel = 2,
  className,
  ...props
}: FilterSidebarProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <form
      action={action}
      method="get"
      aria-labelledby={headingId}
      data-slot="filter-sidebar"
      className={cn("flex min-w-0 flex-col gap-4", className)}
      {...props}
    >
      <Heading id={headingId} className="text-lg leading-snug font-semibold wrap-anywhere">
        {copy.title}
      </Heading>
      {active === undefined ? null : (
        <ActiveFilterChips active={active} copy={chipsCopy} locale={locale} prefetch={prefetch} />
      )}
      <FilterFields
        groups={groups}
        params={params}
        copy={groupCopy}
        locale={locale}
        headingLevel={(headingLevel + 1) as 3 | 4 | 5}
      />
      <Button type="submit" data-slot="filter-sidebar-apply" className="w-full">
        {copy.apply}
      </Button>
    </form>
  );
}

export { FilterSidebar };
export type { FilterSidebarProps };
