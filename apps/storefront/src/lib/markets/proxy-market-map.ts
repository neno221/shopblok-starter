import { markets as seededMarkets } from "@shopblok/fixtures";
import type { MarketsGlobal } from "./global";
import {
  createMarketSource,
  defaultAllowFallback,
  MARKET_LOAD_TIMEOUT_MS,
  type MarketSourceOptions,
} from "./source";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Where the proxy reads the map: `app/next/markets/route.ts`, which the proxy's matcher skips. */
export const MARKETS_ROUTE = "/next/markets";

type Env = {
  NEXT_PUBLIC_BASE_URL?: string | undefined;
  NODE_ENV?: string | undefined;
  NEXT_PHASE?: string | undefined;
  PAYLOAD_DATABASE_URL?: string | undefined;
};

/**
 * `process.env`, read name by name: `next build` only writes a `NEXT_PUBLIC_*` value into the
 * bundle where it sees the literal `process.env.NEXT_PUBLIC_…` (as `payload.config.ts` reads it),
 * and `.env.example` promises that the build carries it.
 */
function processEnv(): Env {
  return {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,
    PAYLOAD_DATABASE_URL: process.env.PAYLOAD_DATABASE_URL,
  };
}

/**
 * The URL of the map route. It comes from the environment and never from the request: a proxy that
 * fetched `https://{Host header}/next/markets` could be sent to another host by a forged `Host`
 * header, and would then cache that host's answer as the market map for every visitor.
 */
export function marketsRouteUrl(env: Env): URL {
  const base = env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";
  try {
    return new URL(MARKETS_ROUTE, base);
  } catch {
    throw new Error(`NEXT_PUBLIC_BASE_URL is "${base}", which is not a URL (https://shop.example)`);
  }
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
  const env: Env = options.env ?? processEnv();
  const fetcher = options.fetcher ?? fetch;
  return createMarketSource({
    load: async (): Promise<MarketsGlobal> => {
      const url = marketsRouteUrl(env);
      const response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(MARKET_LOAD_TIMEOUT_MS),
      }).catch((error: unknown) => {
        // The URL in the message: a wrong NEXT_PUBLIC_BASE_URL otherwise shows as a bare "fetch failed".
        throw new Error(`${url.href} could not be fetched (${describe(error)})`);
      });
      if (!response.ok) {
        throw new Error(
          `${url.href} answered ${response.status}; the reason is in the server log of that route`,
        );
      }
      const body: unknown = await response.json();
      // Another app on the address (or a gateway's error page) answers 200 with something else.
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error(
          `${url.href} did not answer a market map; is NEXT_PUBLIC_BASE_URL this app?`,
        );
      }
      return body as MarketsGlobal;
    },
    fallback: seededMarkets,
    allowFallback: defaultAllowFallback(env),
    staleWhileRevalidate: true,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
}

export const getProxyMarketMap = createProxyMarketMap().get;
