import { cacheLife, cacheTag } from "next/cache";
import { getMarketMap } from "./get-market-map";
import type { MarketMap } from "./types";

/**
 * The market map for rendering: layouts, pages and metadata. A prerendered page can't wait on
 * uncached I/O, so with Cache Components its read of the map goes through `use cache`, where the
 * map is filled into the static shell at build and refreshed on request. The proxy has no render
 * to prerender and calls `getMarketMap()` itself.
 *
 * - `revalidate: 30` keeps the shell about as fresh as the 30 s in-process cache under it (D10).
 *   `expire` is 5 minutes or more and `stale` is 5 minutes, or Next would leave this read out of
 *   the prerender (cacheLife, "Prerendering behavior") and the root layout would block.
 * - The tag `global:markets` is for the Payload hook that revalidates it when the global is saved
 *   (M4); until it exists, the 30 s is how an edit gets here.
 */
export async function getRenderMarketMap(): Promise<MarketMap> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 30, expire: 3600 });
  cacheTag("global:markets");
  return getMarketMap();
}
