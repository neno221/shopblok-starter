import { markets as seededMarkets } from "@shopblok/fixtures";
import "server-only";
import { env } from "../env";
import { loadMarketMap } from "./medusa-loader";
import { sharedMarketSource } from "./shared-source";
import { createMarketSource, defaultAllowFallback } from "./source";

// The proxy doesn't import this (it would load the Medusa SDK there): it reads the map from
// `/next/markets` through `proxy-market-map.ts`.
// One source per process, on `globalThis`: Payload's admin imports this module lazily and may get a
// copy of its own, and `/api/revalidate` expires the map through the shared one (`shared-source.ts`).
// Every read is capped at `MEDUSA_REQUEST_TIMEOUT_MS` by the SDK call, so no first-read timeout.
const source = sharedMarketSource(() =>
  createMarketSource({
    load: loadMarketMap,
    fallback: seededMarkets,
    allowFallback: defaultAllowFallback(env),
  }),
);

/**
 * The market map (D10, D94): Medusa's `GET /store/markets`, kept in memory for 30 s. Server code only:
 * layouts, metadata and the map route (`app/next/markets/route.ts`) that the proxy reads. An empty
 * or incomplete map falls back to the seeded fixtures in development and while `next build`
 * runs, never in production (`source.ts` has the full rules).
 */
export const getMarketMap = source.get;

/**
 * The map read now, past the 30 s (`source.fresh`): for `getRenderMarketMap()`, whose own
 * `use cache` entry is what keeps it, and which a save of the map expires (T71).
 */
export const getFreshMarketMap = source.fresh;
