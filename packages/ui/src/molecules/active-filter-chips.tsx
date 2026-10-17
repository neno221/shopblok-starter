// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). The filters a listing has applied,
// as chips above its products ("Colour: Black", "Price: $20 to $50"), each removed by a link and all
// of them by "Clear all". The links are the listing's own addresses (`removeHref`, `clearHref`, built
// by the app: this component builds no URL, SPEC §8.4: the filters live in the URL), so removing one
// is a navigation that works without JavaScript and is crawlable, and the chip's button is the Chip
// atom's remove link (44 × 44 px in a 32 px chip). A list, named by how many filters it holds ("3
// active filters"), one item per chip; "Clear all" is the last item, so a reader of the list finds it
// after the chips. A chip's text is "{group}: {label}"; an on/off filter has no group and says its
// label alone ("In stock"). The remove link is named with the chip's whole text ("Remove Colour:
// Black"), because many chips share one visible control and the name must say which. "Clear all" has
// a longer name than its text ("Clear all filters", which contains the words the eye sees, WCAG
// 2.5.3). No filters, nothing drawn. A server component: no state, no handlers. The long case wraps
// inside the chip and the chips wrap in rows (a row's gap is as tall as the remove links' reach, so
// the 44 px targets of two rows do not overlap).
import { formatMessage } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { ActiveFilters } from "@shopblok/registry/contracts";
import { Chip } from "@shopblok/ui/atoms/chip";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";

type ActiveFilterChipsProps = Omit<React.ComponentProps<"ul">, "children" | "aria-label"> & {
  /** The applied filters, each with the listing without it, and the listing without any. */
  active: ActiveFilters;
  /** The wording, from the catalog's `molecules.activeFilterChips`. */
  copy: Messages["molecules"]["activeFilterChips"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * The links' `prefetch` (next/link). Unset, Next prefetches the listing a link goes to when it
   * scrolls into view; `false` for a page whose targets are not there yet (the design system's).
   */
  prefetch?: boolean | null;
};

type LinkHref = React.ComponentProps<typeof Link>["href"];
const toHref = (href: string) => href as LinkHref;

function ActiveFilterChips({
  active,
  copy,
  locale,
  prefetch,
  className,
  ...props
}: ActiveFilterChipsProps) {
  if (active.filters.length === 0) return null;
  return (
    <ul
      role="list"
      data-slot="active-filter-chips"
      aria-label={formatMessage(copy.label, { count: active.filters.length }, locale)}
      className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-3", className)}
      {...props}
    >
      {active.filters.map((filter) => {
        const text =
          filter.group === undefined
            ? filter.label
            : formatMessage(copy.chip, { group: filter.group, label: filter.label }, locale);
        return (
          <li key={filter.id} className="max-w-full min-w-0">
            <Chip
              removeHref={filter.removeHref}
              removeLabel={formatMessage(copy.remove, { filter: text }, locale)}
              prefetch={prefetch}
            >
              {text}
            </Chip>
          </li>
        );
      })}
      <li className="max-w-full min-w-0">
        <Link
          variant="standalone"
          href={toHref(active.clearHref)}
          prefetch={prefetch}
          aria-label={copy.clearAllLabel}
          className="px-1 text-sm"
        >
          {copy.clearAll}
        </Link>
      </li>
    </ul>
  );
}

export { ActiveFilterChips };
export type { ActiveFilterChipsProps };
