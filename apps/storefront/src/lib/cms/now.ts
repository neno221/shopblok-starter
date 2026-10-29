import { cacheLife } from "next/cache";

/**
 * The time a page's blocks are rendered at (D50, T64): the hero's countdown counts from it and a
 * promo banner past its end is left out. Read in `use cache`, because a prerendered page may not
 * read the clock (Cache Components refuse `Date.now()` in the static shell), with the market
 * map's life (`cached-market-map.ts`): every page under `[market]` is regenerated at most every
 * 30 s already, so this costs no render of its own. A page served from the cache shows the time
 * of its render, as the rest of it does: the countdown's clock reads the browser's time once it
 * hydrates, and a banner whose offer has ended since is left out at the next render.
 */
export async function renderTime(): Promise<string> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 30, expire: 3600 });
  return new Date().toISOString();
}
