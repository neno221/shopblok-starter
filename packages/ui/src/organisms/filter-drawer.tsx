// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D42, D49). The filters of a listing for a
// narrow screen: a 44 px button ("Filters", and how many are chosen) that opens a sheet from the
// start side with the same fields as FilterSidebar (they are one part, `FilterFields`, in two
// shells), and a foot that stays in view with "Clear all" and "Show 24 results". One GET form to the
// listing's `action`, as the sidebar is, so the form works as a plain form once it is open. The
// button needs JavaScript to open the sheet, which is why a page shows the sidebar (a plain form in
// the page) from `lg` and this below it: a phone without JavaScript cannot open the sheet, and the
// listing's sort, pages and chips (links and a form of their own) still work. A server component on
// purpose (D49), as MobileNavDrawer is: it makes every word (`formatMessage` for "2 filters chosen"
// and "Show 24 results") and renders the fields, which are server components, and hands both to
// `FilterDrawerClient`, which opens and closes. No catalog, no formatter and no facet's drawing is
// in a client chunk.
// - "Show N results" reads N from the panel's `resultCount`. It is the listing's count as the page
//   was drawn, not a live one (M3 may fetch a live count; this component fetches nothing, D42), and
//   the submit stays pressable at 0 (see the client part).
// - The chosen filters are not drawn as chips inside the sheet: the page shows them above its
//   products, where removing one is a link away. The sheet's job is to change the choice, and the
//   button tells the visitor how many are chosen.
import type { Messages } from "@shopblok/i18n";
import { formatMessage, formatNumber } from "@shopblok/i18n/format";
import type { FilterPanel } from "@shopblok/registry/contracts";
import { FilterDrawerClient } from "./filter-drawer-client";
import { FilterFields } from "./filter-fields";

type FilterDrawerProps = FilterPanel & {
  /** The wording, from the catalog's `organisms.filterDrawer`. */
  copy: Messages["organisms"]["filterDrawer"];
  /** FilterGroup's wording, from the catalog's `molecules.filterGroup`. */
  groupCopy: Messages["molecules"]["filterGroup"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for "Clear all"; the design system passes `false`. */
  prefetch?: boolean | null;
  /** Drawn open at first render (the design system's states); takes no focus until a reader opens it again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  /** Classes for the button (a page hides it from `lg` up). */
  triggerClassName?: string;
  /** Classes for the sheet (the design system's states cap it to their box and switch its slide off). */
  popupClassName?: string;
};

function FilterDrawer({
  action,
  groups,
  params,
  active,
  resultCount,
  copy,
  groupCopy,
  locale,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: FilterDrawerProps) {
  const count = active?.filters.length ?? 0;
  return (
    <FilterDrawerClient
      action={action}
      copy={{
        open: copy.open,
        title: copy.title,
        close: copy.close,
        show: formatMessage(copy.show, { count: resultCount }, locale),
        clear: copy.clear,
      }}
      chosen={
        count === 0
          ? undefined
          : {
              badge: formatNumber(count, locale),
              text: formatMessage(copy.chosen, { count }, locale),
            }
      }
      clearHref={count === 0 ? undefined : active?.clearHref}
      fields={<FilterFields groups={groups} params={params} copy={groupCopy} locale={locale} />}
      prefetch={prefetch}
      defaultOpen={defaultOpen}
      modal={modal}
      triggerClassName={triggerClassName}
      popupClassName={popupClassName}
    />
  );
}

export { FilterDrawer };
export type { FilterDrawerProps };
