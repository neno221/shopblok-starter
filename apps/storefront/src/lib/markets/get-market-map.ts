import { markets as seededMarkets } from "@shopblok/fixtures";
import { loadMarketsGlobal } from "./payload-loader";
import { createMarketSource, defaultAllowFallback } from "./source";

// No `import "server-only"` here: T11's proxy imports this too. A client bundle that pulled it in
// would fail on `payload` anyway.
const source = createMarketSource({
  load: loadMarketsGlobal,
  fallback: seededMarkets,
  allowFallback: defaultAllowFallback(process.env),
});

/**
 * The market map (D10): Payload's `markets` global, kept in memory for 30 s. Server code only:
 * the proxy, layouts and metadata. An empty or incomplete global falls back to the seeded
 * fixtures in development only (`source.ts` has the full rules).
 */
export const getMarketMap = source.get;

/** Forget the cached map, so the next `getMarketMap()` reads the global. */
export const clearMarketMapCache = source.clear;
