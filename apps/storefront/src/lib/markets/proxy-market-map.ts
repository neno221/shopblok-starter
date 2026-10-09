import { markets as seededMarkets } from "@shopblok/fixtures";
import type { MarketsGlobal } from "./global";
import {
  createMarketSource,
  defaultAllowFallback,
  MARKET_LOAD_TIMEOUT_MS,
  type MarketSourceOptions,
} from "./source";

/** Where the proxy reads the map: `app/next/markets/route.ts`, which the proxy's matcher skips. */
export const MARKETS_ROUTE = "/next/markets";

type Env = {
  NEXT_PUBLIC_BASE_URL?: string;
  NODE_ENV?: string;
  NEXT_PHASE?: string;
  PAYLOAD_DATABASE_URL?: string;
};

/**
 * The URL of the map route. It comes from the environment and never from the request: a proxy that
 * fetched `https://{Host header}/next/markets` could be sent to another host by a forged `Host`
 * header, and would then cache that host's answer as the market map for every visitor.
 */
export function marketsRouteUrl(env: Env): URL {
  return new URL(MARKETS_ROUTE, env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000");
}

type ProxyMarketMapOptions = {
  env?: Env;
  fetcher?: typeof fetch;
  now?: MarketSourceOptions["now"];
  warn?: MarketSourceOptions["warn"];
};

/**
 * The market map for the proxy (D10, T11's fallback): the map route's JSON, kept in process for
 * 30 s, with the same last-good-map, timeout and fallback rules as `getMarketMap()` (`source.ts`).
 * The route returns a `MarketMap`, which has the shape `mapFromGlobal` reads, so the same source
 * checks it again. Imports no Payload: that is the point (the cold start of a proxy function).
 */
export function createProxyMarketMap(options: ProxyMarketMapOptions = {}) {
  const env: Env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  return createMarketSource({
    load: async (): Promise<MarketsGlobal> => {
      const response = await fetcher(marketsRouteUrl(env), {
        cache: "no-store",
        signal: AbortSignal.timeout(MARKET_LOAD_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(
          `${MARKETS_ROUTE} answered ${response.status}; the reason is in the server log of that route`,
        );
      }
      return (await response.json()) as MarketsGlobal;
    },
    fallback: seededMarkets,
    allowFallback: defaultAllowFallback(env),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
}

export const getProxyMarketMap = createProxyMarketMap().get;
