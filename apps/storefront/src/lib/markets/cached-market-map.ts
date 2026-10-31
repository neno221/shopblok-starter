import { cacheLife, cacheTag } from "next/cache";
import { getFreshMarketMap } from "./get-market-map";
import type { MarketMap } from "./types";

/**
 * The market map for rendering: layouts, pages and metadata. A prerendered page can't wait on
 * uncached I/O, so with Cache Components its read of the map goes through `use cache`, where the
 * map is filled into the static shell at build and refreshed on request. The proxy has no render
 * to prerender and imports neither Payload nor the Medusa SDK: it reads this map through `/next/markets`, which returns it
 * (`proxy-market-map.ts`).
 *
 * - `revalidate: 30` keeps the shell as fresh as the 30 s in-process cache beside it (D10).
 *   `expire` is 5 minutes or more and `stale` is 5 minutes, or Next would leave this read out of
 *   the prerender (cacheLife, "Prerendering behavior") and the root layout would block. The cost:
 *   the shortest `revalidate` under a layout sets how long its static shell lives, so every page
 *   under `[market]` is regenerated at most every 30 s while traffic arrives, however long its own
 *   content could last.
 * - The tag `medusa:markets` is for the backend's revalidation subscriber, which expires it when
 *   a market is saved (`shopblok.markets.updated`) or a region changes (D94). The entry is computed
 *   from the map as it is now (`getFreshMarketMap`), not from the
 *   in-process map, which can be up to 30 s old: re-reading that one kept the old map for another
 *   30 s, so a new market took up to 90 s to reach the proxy (T71). `revalidate` stays 30 s for an
 *   edit no event announced (a script, a store locale).
 */
export async function getRenderMarketMap(): Promise<MarketMap> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 30, expire: 3600 });
  cacheTag("medusa:markets");
  return getFreshMarketMap();
}
