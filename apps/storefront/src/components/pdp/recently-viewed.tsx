"use client";

import type { ProductCard } from "@shopblok/registry/contracts";
import {
  ProductCarousel,
  type ProductCarouselProps,
} from "@shopblok/ui/organisms/product-carousel";
import { useEffect } from "react";
import { rememberViewed } from "../../lib/visitor/recently-viewed";
import { useRecentlyViewed } from "../../lib/visitor/use-recently-viewed";

// D61: the visitor's recently viewed products, under the related ones. It remembers this page's
// product once mounted and draws the market's list without it: nothing on the server (D44), and
// nothing at all until the visitor has viewed another product.

export type RecentlyViewedProps = {
  market: string;
  /** This page's product, as a card: remembered, and left out of the row. */
  current: ProductCard | null;
  title: string;
  copy: ProductCarouselProps["copy"];
  locale: string;
  prefetch?: boolean | null;
};

export function RecentlyViewed({
  market,
  current,
  title,
  copy,
  locale,
  prefetch,
}: RecentlyViewedProps) {
  const shown = useRecentlyViewed(market, current?.id);
  useEffect(() => {
    if (current !== null) rememberViewed(market, current);
  }, [market, current]);
  if (shown.length === 0) return null;
  return (
    <div data-slot="recently-viewed" className="min-w-0">
      <ProductCarousel
        title={title}
        products={shown}
        variant="standard"
        copy={copy}
        locale={locale}
        prefetch={prefetch}
      />
    </div>
  );
}
