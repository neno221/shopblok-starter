// Ours (T50, SETUP.md "Listing pages and search (T50)"; D57, D59, SPEC §8.4, §12, SBP
// layouts/product-listing.md). A listing page's `<main>`: the breadcrumbs, the page's name, then its
// results (`ListingResults`, `listing-results.tsx`, which the search page and the shop's listing
// island draw too):
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
import type { ProductListingPage } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import { Prose } from "@shopblok/ui/sections/prose";
import type * as React from "react";
import {
  ListingResults,
  listingResultsCopy,
  type ListingResultsCopy,
  type ListingResultsProps,
} from "./listing-results";

type ProductListingCopy = {
  breadcrumbs: Messages["molecules"]["breadcrumbs"];
  results: ListingResultsCopy;
};

/** The listing page's words from a whole catalog. */
function productListingCopy(messages: Messages): ProductListingCopy {
  return { breadcrumbs: messages.molecules.breadcrumbs, results: listingResultsCopy(messages) };
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
