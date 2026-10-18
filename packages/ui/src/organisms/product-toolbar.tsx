// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D42). The bar above a listing's
// products: how many there are, the filters button below `lg`, the grid or list toggle, and the sort.
// A server component, and a row of plain parts: the count is text, the sort is SortSelect (a GET
// form with its own button), the filters are a slot the page fills with FilterDrawer, and the toggle
// is two links, so everything works without JavaScript and the page decides the layout the links go
// to (`gridHref`, `listHref`; the toolbar builds no URL, SPEC §8.5).
// - The order of the parts in the page is the order they are drawn in (the filters, the count, the
//   toggle, the sort), so the reading order, the tab order and the picture agree. The row wraps:
//   on a phone the filters button, the count and the toggle share the first row, and the sort,
//   whose label, field and button need the width, takes a row of its own; from `sm` the sort stays
//   in the row if it fits and wraps under it if it does not (a long German or Greek label). The
//   count's basis is small (4 rem) and it grows into what is left of the row: a flex row breaks
//   where the parts' bases no longer fit, and a basis of 6 rem sent the toggle to a row of its own
//   at 375 px (measured: the filters button is up to 140 px, the toggle 96, the gaps 24, so the
//   count has 83 px at most before the row wraps), where its text is the one thing that may
//   wrap. Nothing is cut.
// - `filters` is drawn only below `lg` (`lg:hidden` around the slot): from `lg` the page puts
//   FilterSidebar beside the products, and the button would open a second copy of the same form.
// - The toggle is a group named by the catalog's "View" holding two 44 px links, "Grid" and "List",
//   each an icon with its name for assistive technology. The current one carries
//   `aria-current="true"` and is drawn pressed: a darker border and a filled background, which are
//   not colours alone to tell apart. They are links, not buttons, because choosing a layout is a
//   navigation (the layout is in the URL) and a link works without JavaScript.
// - `count` is every product the listing holds, on every page, not the number on this one.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { ProductToolbar as ProductToolbarContent } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import { SortSelect } from "@shopblok/ui/molecules/sort-select";
import { LayoutGridIcon, ListIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type ProductToolbarProps = Omit<React.ComponentProps<"div">, "children"> &
  ProductToolbarContent & {
    /** The wording, from the catalog's `organisms.productToolbar`. */
    copy: Messages["organisms"]["productToolbar"];
    /** SortSelect's wording, from the catalog's `molecules.sortSelect`. */
    sortCopy: Messages["molecules"]["sortSelect"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The toggle's links' `prefetch` (next/link); the design system passes `false`. */
    prefetch?: boolean | null;
    /** The filters button (FilterDrawer), drawn below `lg` only. Nothing: no button. */
    filters?: React.ReactNode;
  };

// `next/link` takes whatever an app with typed routes narrows its `href` to; ours are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function ViewToggle({
  view,
  copy,
  prefetch,
}: {
  view: NonNullable<ProductToolbarContent["view"]>;
  copy: ProductToolbarProps["copy"];
  prefetch?: boolean | null;
}) {
  const choices = [
    { key: "grid", href: view.gridHref, name: copy.grid, icon: LayoutGridIcon },
    { key: "list", href: view.listHref, name: copy.list, icon: ListIcon },
  ] as const;
  return (
    <div
      role="group"
      aria-label={copy.view}
      data-slot="product-toolbar-view"
      className="flex shrink-0 gap-1"
    >
      {choices.map((choice) => (
        <NextLink
          key={choice.key}
          href={choice.href as LinkHref}
          prefetch={prefetch}
          aria-current={view.current === choice.key ? "true" : undefined}
          data-slot="product-toolbar-view-link"
          data-view={choice.key}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "aria-[current=true]:border-foreground aria-[current=true]:bg-muted",
          )}
        >
          <Icon icon={choice.icon} />
          <span className="sr-only">{choice.name}</span>
        </NextLink>
      ))}
    </div>
  );
}

function ProductToolbar({
  count,
  sort,
  view,
  copy,
  sortCopy,
  locale,
  prefetch,
  filters,
  className,
  ...props
}: ProductToolbarProps) {
  return (
    <div
      data-slot="product-toolbar"
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-3", className)}
      {...props}
    >
      {filters === undefined ? null : (
        <div data-slot="product-toolbar-filters" className="max-w-full lg:hidden">
          {filters}
        </div>
      )}
      <p
        data-slot="product-toolbar-count"
        className="min-w-0 flex-1 basis-16 text-sm font-medium wrap-anywhere"
      >
        {formatMessage(copy.count, { count }, locale)}
      </p>
      {view === undefined ? null : <ViewToggle view={view} copy={copy} prefetch={prefetch} />}
      <SortSelect {...sort} copy={sortCopy} className="w-full sm:w-auto" />
    </div>
  );
}

export { ProductToolbar };
export type { ProductToolbarProps };
