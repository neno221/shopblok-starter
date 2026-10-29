import type { ProductCard } from "@shopblok/registry/contracts";
import { useSyncExternalStore } from "react";
import {
  getRecentlyViewed,
  getServerRecentlyViewed,
  subscribeRecentlyViewed,
} from "./recently-viewed";

/** A row of recently viewed products shows eight. */
const SHOWN = 8;

/**
 * The market's recently viewed products as a row draws them (D61): newest first, at most eight,
 * without the product `excludeId` names (the product page's own). None during the server render
 * and hydration (D44). A client component's hook: the product page's row and the CMS block.
 */
export function useRecentlyViewed(market: string, excludeId?: string): ProductCard[] {
  const cards = useSyncExternalStore(
    subscribeRecentlyViewed,
    () => getRecentlyViewed(market),
    getServerRecentlyViewed,
  );
  return cards.filter((card) => card.id !== excludeId).slice(0, SHOWN);
}
