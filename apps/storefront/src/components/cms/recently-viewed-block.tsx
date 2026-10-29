"use client";

import type { RecentlyViewedSection as RecentlyViewedSectionData } from "@shopblok/registry/contracts";
import { RecentlyViewedSection } from "@shopblok/ui/sections/recently-viewed";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { useSyncExternalStore } from "react";
import {
  getRecentlyViewed,
  getServerRecentlyViewed,
  subscribeRecentlyViewed,
} from "../../lib/visitor/recently-viewed";

// The `recentlyViewed` block's island (T64, D44): the server sends the heading and the settings,
// and the browser fills in the visitor's products from T49's store, the one the product page
// fills. Nothing is drawn on the server, nor in the browser until the visitor has viewed a product.

const SHOWN = 8;

export type RecentlyViewedBlockProps = {
  market: string;
  section: RecentlyViewedSectionData;
  copy: Pick<SectionsCopy, "products">;
  locale: string;
  prefetch?: boolean | null;
};

export function RecentlyViewedBlock({
  market,
  section,
  copy,
  locale,
  prefetch,
}: RecentlyViewedBlockProps) {
  const cards = useSyncExternalStore(
    subscribeRecentlyViewed,
    () => getRecentlyViewed(market),
    getServerRecentlyViewed,
  );
  return (
    <RecentlyViewedSection
      {...section}
      products={cards.slice(0, SHOWN)}
      copy={copy}
      locale={locale}
      prefetch={prefetch}
    />
  );
}
