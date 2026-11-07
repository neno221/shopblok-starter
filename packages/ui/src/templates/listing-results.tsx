// Ours (T50, SETUP.md "Listing pages and search (T50)"; D59, SPEC §8.4, SBP
// layouts/product-listing.md). A listing's results alone, which the listing page, the search page
// and the shop's listing island draw (T69 moved them out of `product-listing.tsx`, so the island,
// a client component, does not bundle the page's own parts):
// - From `lg` the filters (FilterSidebar, one GET form) stand beside the products; below `lg` the
//   toolbar's button opens the same fields in FilterDrawer, and the chosen filters are chips above
//   the products. The toolbar has the count and the sort; then the grid, then the pages, which are
//   links (`hrefFor(page)`, the page's: `/page/2` on a listing, `?page=2` once a filter is set).
// - The cards' titles are `h2`: the page's name is its one `h1`, and the filters' heading, beside
//   them, is an `h2` too.
// - This is the `default` filter layout (`data-layout`); T84's six others are in `listing-layouts/`,
//   and `listing-layouts.tsx` picks one on the server. Every layout draws its products' column with
//   `ResultsProducts` and its root with `ResultsRoot`, so the column is written once.
import type { Messages } from "@shopblok/i18n";
import type { ListingResults as ListingResultsContent } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import type { ProductCardCopy } from "@shopblok/ui/molecules/product-card/parts";
import { FilterDrawer } from "@shopblok/ui/organisms/filter-drawer";
import { FilterSidebar } from "@shopblok/ui/organisms/filter-sidebar";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import { ProductToolbar } from "@shopblok/ui/organisms/product-toolbar";
import type * as React from "react";

/** The words of a listing's results: the organisms' and molecules' own, picked from a catalog. */
type ListingResultsCopy = {
  toolbar: Messages["organisms"]["productToolbar"];
  sort: Messages["molecules"]["sortSelect"];
  sidebar: Messages["organisms"]["filterSidebar"];
  drawer: Messages["organisms"]["filterDrawer"];
  group: Messages["molecules"]["filterGroup"];
  chips: Messages["molecules"]["activeFilterChips"];
  grid: ProductCardCopy & { grid: Messages["organisms"]["productGrid"] };
  pagination: Messages["molecules"]["pagination"];
};

/** The results' words from a whole catalog (the app's `getMessages()`, the DS's `catalogs[locale]`). */
function listingResultsCopy(messages: Messages): ListingResultsCopy {
  const { molecules, organisms } = messages;
  return {
    toolbar: organisms.productToolbar,
    sort: molecules.sortSelect,
    sidebar: organisms.filterSidebar,
    drawer: organisms.filterDrawer,
    group: molecules.filterGroup,
    chips: molecules.activeFilterChips,
    grid: {
      card: molecules.productCard,
      priceBlock: molecules.priceBlock,
      grid: organisms.productGrid,
    },
    pagination: molecules.pagination,
  };
}

type ListingResultsProps = ListingResultsContent & {
  copy: ListingResultsCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The address of a page of these results, with their filters and sort. */
  hrefFor: (page: number) => string;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
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
  /** Whether the chosen filters' chips are drawn above the grid: at every width, or below `lg`. */
  chips: boolean | "below-lg";
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
          className={chips === "below-lg" ? "lg:hidden" : undefined}
        />
      )}
      <ProductGrid {...grid} copy={copy.grid} locale={locale} heading="h2" prefetch={prefetch} />
      <Pagination {...page} hrefFor={hrefFor} copy={copy.pagination} locale={locale} />
    </div>
  );
}

/** M3's sidebar beside the products from `lg`; below it, the drawer's button and the chips. */
function ListingResults({ className, ...results }: ListingResultsProps) {
  const { filters, copy, locale, prefetch } = results;
  return (
    <ResultsRoot
      layout="default"
      className={cn(filters !== undefined && "lg:grid-cols-[16rem_minmax(0,1fr)]", className)}
    >
      {filters === undefined ? null : (
        <div data-slot="listing-filters" className="min-w-0 max-lg:hidden">
          <FilterSidebar
            {...filters}
            copy={copy.sidebar}
            groupCopy={copy.group}
            chipsCopy={copy.chips}
            locale={locale}
            prefetch={prefetch}
          />
        </div>
      )}
      <ResultsProducts results={results} drawer="below-lg" chips="below-lg" />
    </ResultsRoot>
  );
}

export { ListingResults, listingResultsCopy, ResultsProducts, ResultsRoot };
export type { ListingResultsCopy, ListingResultsProps };
