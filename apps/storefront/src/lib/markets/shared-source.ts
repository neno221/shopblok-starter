import type { createMarketSource } from "./source";

/** The market source of `get-market-map.ts`: what `expireMarketMap` reaches. */
export type MarketSource = ReturnType<typeof createMarketSource>;

/**
 * The one copy of that source in a process, on `globalThis` under a `Symbol.for` key. Next bundles
 * each route on its own, and Payload's admin loads `get-market-map.ts` through a lazy import, so
 * the module can be evaluated more than once; a module-level `const source` would then be one map
 * (and one 30 s cache) per copy, and a save in Medusa would reach only the copy that `/next/markets`
 * refreshes (T75 review, item 1). The same reason `filter-available-locales.ts` keeps its memory
 * here.
 *
 * This file imports no Medusa SDK and no `server-only`, so the revalidate route can reach the
 * source without loading either.
 */
export const MARKET_SOURCE = Symbol.for("shopblok.marketSource");

type Shared = typeof globalThis & { [MARKET_SOURCE]?: MarketSource };

/** The process's source, made by `make` the first time it is asked for. */
export function sharedMarketSource(make: () => MarketSource): MarketSource {
  const shared = globalThis as Shared;
  return (shared[MARKET_SOURCE] ??= make());
}

/** Forgets the shared source, for a test. */
export function clearSharedMarketSource(): void {
  delete (globalThis as Shared)[MARKET_SOURCE];
}

/**
 * Marks the process's map stale (`source.expire`): Medusa saved a market. Nothing happens when no
 * source exists yet (nothing was read, so nothing is stale). It reaches only this process: on a
 * host with several instances, the others keep their map for up to 30 s.
 */
export function expireMarketMap(): void {
  (globalThis as Shared)[MARKET_SOURCE]?.expire();
}
