import { markets as seededMarkets } from "@shopblok/fixtures";
import "server-only";
import { env } from "../env";
import { loadMarketsGlobal } from "./payload-loader";
import { createMarketSource, defaultAllowFallback, marketLoadTimeoutMs } from "./source";

// The proxy doesn't import this (it would load Payload there, 550 ms on the first request): it
// reads the map from `/next/markets` through `proxy-market-map.ts`.
const source = createMarketSource({
  load: loadMarketsGlobal,
  fallback: seededMarkets,
  allowFallback: defaultAllowFallback(env),
  // The first read starts Payload, which `next dev` can take more than 10 s to do (W2, finding 3);
  // the reads after it get 10 s again.
  firstLoadTimeoutMs: marketLoadTimeoutMs(env),
});

/**
 * The market map (D10): Payload's `markets` global, kept in memory for 30 s. Server code only:
 * layouts, metadata and the map route (`app/next/markets/route.ts`) that the proxy reads. An empty
 * or incomplete global falls back to the seeded fixtures in development and while `next build`
 * runs, never in production (`source.ts` has the full rules).
 */
export const getMarketMap = source.get;
