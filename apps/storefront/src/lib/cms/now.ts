import { cacheLife } from "next/cache";

/**
 * The time a page's blocks are rendered at (D50, T64): the hero's countdown counts from it and a
 * promo banner past its end is left out. Read in `use cache`, because a prerendered page may not
 * read the clock (Cache Components refuse `Date.now()` in the static shell). `revalidate` is the
 * market map's 30 s (`cached-market-map.ts`), so this costs no render of its own; `expire` is the
 * shortest Next keeps in a prerender (5 minutes). So the worst case: after a quiet spell, the first
 * request is served a render up to 5 minutes old while a new one is made. The browser makes up for
 * it: the countdown's clock reads the browser's time once it hydrates, and `OfferEnd` takes away a
 * banner whose offer has ended since.
 */
export async function renderTime(): Promise<string> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 30, expire: 300 });
  return new Date().toISOString();
}
