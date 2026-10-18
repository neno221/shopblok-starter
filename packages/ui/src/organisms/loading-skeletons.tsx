// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.3's loading skeletons; D46). What a
// page draws while its content is on the way: four layouts, each shaped like what it stands in
// for, so that nothing moves when the content arrives (the cumulative layout shift stays at zero):
// - `product-grid`: ProductCard standard's cards, a 3:4 picture over two lines of title and a
//   price, in a listing's columns (two under `md`, three from `md`, four from `lg`), 8 unless
//   `items` says. The title's box is the card's 44 px link and the price's the 24 px of a
//   `text-base` line, so the card is as tall as a real one with a short title (measured in
//   Chromium against ProductCardStandard at 375, 768 and 1440 px: the same height to the pixel,
//   with a one-word title and with a title that wraps to three lines, which the card clamps to
//   two). A card that has reviews draws a row of stars as well, 22 px more, which the skeleton
//   does not reserve: the cards that have none are the same as it, and a listing cannot know.
// - `product-page`: the gallery beside the buy box (stacked under `md`): a picture and a row of
//   thumbnails, then the title's lines, the price, the option pills, the add-to-cart button and
//   two lines of delivery notes. `items` means nothing here (the page has no repeated part).
// - `cart`: lines like CartLineItem's (a thumbnail, the title and options, the quantity stepper
//   and the price), 3 unless `items` says, then the summary box (rows, a total and the checkout
//   button), beside the lines from `lg`.
// - `account-list`: rows like an order or an address (a title, two lines, a status), 4 unless
//   `items` says.
// What a screen reader hears: one string. The layout is a `<section>` named by the copy for its
// layout ("Loading products") with `aria-busy="true"`, so it is reached as one named, busy region
// and read as that name once; every shape is hidden from assistive technology (the Skeleton atom
// is `aria-hidden`, and so is the box that holds them, so no empty group or list is exposed), and
// there is no live region, per item or at all, so the page is not interrupted and no announcement
// storm of eight "loading" messages happens. The region holds no text. Under reduced motion the
// shapes do not pulse (the atom's `motion-safe:`). The shapes' sizes are the Tailwind scale (the
// 4 px step of the spacing token) and the cards' own aspect ratio; every box can shrink
// (`min-w-0`), so nothing is wider than a 375 px window. A server component: it has no state.
// ProductGrid (T37) draws its cards in the same columns and gaps: both import them from
// `product-grid-layout.ts`, so the skeleton and the listing it stands in for cannot drift apart.
import type { Messages } from "@shopblok/i18n";
import type { LoadingSkeleton as LoadingSkeletonContent } from "@shopblok/registry/contracts";
import { Skeleton } from "@shopblok/ui/atoms/skeleton";
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";
import { PRODUCT_GRID } from "./product-grid-layout";

type LoadingSkeletonProps = LoadingSkeletonContent & {
  /** The wording, from the catalog's `organisms.loadingSkeleton`. */
  copy: Messages["organisms"]["loadingSkeleton"];
  className?: string;
};

/** How many of each repeated part a layout draws unless `items` says. */
const DEFAULT_ITEMS = { "product-grid": 8, cart: 3, "account-list": 4 } as const;

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

// --- product-grid ---

/** ProductCard standard's shape: the 3:4 picture, a title of two lines, a price. */
function CardShape() {
  return (
    <div data-slot="loading-skeleton-card" className="flex min-w-0 flex-col gap-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* The title is the card's link, 44 px high, with two lines of text in it. */}
        <div className="flex h-11 flex-col gap-1.5 pt-0.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}

// --- product-page ---

/** The gallery beside the buy box, stacked under `md`. */
function ProductPageShape() {
  return (
    <div className="grid min-w-0 gap-8 md:grid-cols-2 lg:gap-12">
      <div className="flex min-w-0 flex-col gap-3">
        <Skeleton className="aspect-[4/5] w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {range(4).map((index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
        <Skeleton className="h-7 w-1/4" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-wrap gap-2">
            {range(5).map((index) => (
              <Skeleton key={index} className="h-11 w-14 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// --- cart ---

/** CartLineItem's shape: a 5rem thumbnail, the title and an option, the stepper and the price. */
function LineShape() {
  return (
    <div
      data-slot="loading-skeleton-line"
      className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 border-t border-border py-4 first:border-t-0"
    >
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-1 flex items-center justify-between gap-4">
          <Skeleton className="h-11 w-32 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

/** The summary box: a heading, three rows, the total and the checkout button. */
function SummaryShape() {
  return (
    <div
      data-slot="loading-skeleton-summary"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border p-4"
    >
      <Skeleton className="h-6 w-1/3" />
      <div className="flex flex-col gap-3">
        {range(3).map((index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

// --- account-list ---

/** An order's or an address's row: a title, two lines, and a status on the end. */
function RowShape() {
  return (
    <div
      data-slot="loading-skeleton-row"
      className="flex min-w-0 items-start justify-between gap-4 rounded-xl border border-border p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </div>
  );
}

function shapes(layout: LoadingSkeletonContent["layout"], items?: number): React.ReactNode {
  switch (layout) {
    case "product-grid":
      return (
        <div className={PRODUCT_GRID}>
          {range(items ?? DEFAULT_ITEMS["product-grid"]).map((index) => (
            <CardShape key={index} />
          ))}
        </div>
      );
    case "product-page":
      return <ProductPageShape />;
    case "cart":
      return (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex min-w-0 flex-col">
            {range(items ?? DEFAULT_ITEMS.cart).map((index) => (
              <LineShape key={index} />
            ))}
          </div>
          <SummaryShape />
        </div>
      );
    case "account-list":
      return (
        <div className="flex min-w-0 flex-col gap-3">
          {range(items ?? DEFAULT_ITEMS["account-list"]).map((index) => (
            <RowShape key={index} />
          ))}
        </div>
      );
  }
}

function LoadingSkeleton({ layout, items, copy, className }: LoadingSkeletonProps) {
  const name = {
    "product-grid": copy.productGrid,
    "product-page": copy.productPage,
    cart: copy.cart,
    "account-list": copy.accountList,
  }[layout];
  return (
    <section
      aria-label={name}
      aria-busy="true"
      data-slot="loading-skeleton"
      data-layout={layout}
      className={cn("w-full min-w-0", className)}
    >
      {/* Hidden whole: the shapes say nothing, and a group of nothing would still be exposed. */}
      <div aria-hidden="true" className="min-w-0">
        {shapes(layout, items)}
      </div>
    </section>
  );
}

export { LoadingSkeleton };
export type { LoadingSkeletonProps };
