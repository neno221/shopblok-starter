// Ours (T50, SETUP.md "Listing pages and search (T50)"; D57, D59, SPEC §8.4, §12, SBP
// layouts/product-listing.md). A listing page's `<main>`: the breadcrumbs, the page's name, then its
// results. `ListingResults` is the results alone, so the search page and the shop's listing island
// draw the same parts:
// - From `lg` the filters (FilterSidebar, one GET form) stand beside the products; below `lg` the
//   toolbar's button opens the same fields in FilterDrawer, and the chosen filters are chips above
//   the products. The toolbar has the count and the sort; then the grid, then the pages, which are
//   links (`hrefFor(page)`, the page's: `/page/2` on a listing, `?page=2` once a filter is set).
// - The cards' titles are `h2`: the page's name is its one `h1`, and the filters' heading, beside
//   them, is an `h2` too.
// - What follows the visitor's filters is the page's: `slots.island` is drawn before the server's
//   results and, once it holds results of its own (`data-active` on its root, which carries the
//   `peer` class), the server's results are hidden by CSS (`peer-data-active:hidden`). The island is
//   never around the server's results, so the first page's products are in the static HTML (D59).
// - A category's or collection's banner and introduction (T69, an editor's): the banner under the
//   title, 16:9 on a phone and 3:1 from `md`, preloaded as the page's largest picture; the
//   introduction under it with the editor's text's look (`Prose`). The introduction is rich text the
//   shop renders (`slots.intro`), since the registry holds none.
// - `variant` is the contract's one value (D57).
import type { Messages } from "@shopblok/i18n";
import type {
  ListingResults as ListingResultsContent,
  ProductListingPage,
} from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import type { ProductCardCopy } from "@shopblok/ui/molecules/product-card/parts";
import { FilterDrawer } from "@shopblok/ui/organisms/filter-drawer";
import { FilterSidebar } from "@shopblok/ui/organisms/filter-sidebar";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import { ProductToolbar } from "@shopblok/ui/organisms/product-toolbar";
import { Prose } from "@shopblok/ui/sections/prose";
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

type ProductListingCopy = {
  breadcrumbs: Messages["molecules"]["breadcrumbs"];
  results: ListingResultsCopy;
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

/** The listing page's words from a whole catalog. */
function productListingCopy(messages: Messages): ProductListingCopy {
  return { breadcrumbs: messages.molecules.breadcrumbs, results: listingResultsCopy(messages) };
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

function ListingResults({
  toolbar,
  filters,
  grid,
  page,
  copy,
  locale,
  hrefFor,
  prefetch,
  className,
}: ListingResultsProps) {
  return (
    <div
      data-slot="listing-results"
      className={cn(
        "grid min-w-0 gap-8",
        filters !== undefined && "lg:grid-cols-[16rem_minmax(0,1fr)]",
        className,
      )}
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
      <div data-slot="listing-products" className="flex min-w-0 flex-col gap-6">
        <ProductToolbar
          {...toolbar}
          copy={copy.toolbar}
          sortCopy={copy.sort}
          locale={locale}
          prefetch={prefetch}
          filters={
            filters === undefined ? undefined : (
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
        {filters?.active === undefined ? null : (
          <ActiveFilterChips
            active={filters.active}
            copy={copy.chips}
            locale={locale}
            prefetch={prefetch}
            className="lg:hidden"
          />
        )}
        <ProductGrid {...grid} copy={copy.grid} locale={locale} heading="h2" prefetch={prefetch} />
        <Pagination {...page} hrefFor={hrefFor} copy={copy.pagination} locale={locale} />
      </div>
    </div>
  );
}

type ProductListingTemplateProps = ProductListingPage & {
  copy: ProductListingCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The address of a page of this listing (`/page/2`). */
  hrefFor: (page: number) => string;
  /** The page's parts that follow the visitor. */
  slots?: {
    /** The listing island in its `Suspense`: drawn before the server's results, which it hides once active. */
    island?: React.ReactNode;
    /** The category's or collection's introduction (an editor's rich text, rendered by the shop). */
    intro?: React.ReactNode;
  };
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function ProductListingTemplate({
  breadcrumbs,
  title,
  banner,
  results,
  copy,
  locale,
  hrefFor,
  slots = {},
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: ProductListingTemplateProps) {
  return (
    <Root
      id={mainId}
      data-slot="product-listing-template"
      data-variant="default"
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-8 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <h1
          data-slot="product-listing-title"
          className="text-2xl leading-tight font-semibold wrap-anywhere md:text-3xl"
        >
          {title}
        </h1>
        {banner === undefined ? null : (
          <Image
            src={banner.src}
            alt={banner.alt}
            ratio="video"
            radius="lg"
            sizes="(min-width: 1280px) 1216px, 100vw"
            priority
            className="md:aspect-[3/1]"
            data-slot="product-listing-banner"
          />
        )}
        {slots.intro == null ? null : (
          <Prose data-slot="product-listing-intro" className="text-muted-foreground">
            {slots.intro}
          </Prose>
        )}
      </div>
      <div data-slot="product-listing-region" className="min-w-0">
        {slots.island ?? null}
        <ListingResults
          {...results}
          copy={copy.results}
          locale={locale}
          hrefFor={hrefFor}
          prefetch={prefetch}
          className="peer-data-active:hidden"
        />
      </div>
    </Root>
  );
}

export { ListingResults, listingResultsCopy, ProductListingTemplate, productListingCopy };
export type {
  ListingResultsCopy,
  ListingResultsProps,
  ProductListingCopy,
  ProductListingTemplateProps,
};
