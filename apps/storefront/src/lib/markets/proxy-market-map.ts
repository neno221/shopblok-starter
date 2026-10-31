import { markets as seededMarkets } from "@shopblok/fixtures";
import { env as processEnv } from "../env";
import {
  createMarketSource,
  defaultAllowFallback,
  describeError,
  marketLoadTimeoutMs,
  type MarketSourceOptions,
} from "./source";
import { toMarketMap } from "./problems";
import type { MarketMap } from "./types";

/** Where the proxy reads the map: `app/next/markets/route.ts`, which the proxy's matcher skips. */
export const MARKETS_ROUTE = "/next/markets";

type Env = Parameters<typeof defaultAllowFallback>[0] & { NEXT_PUBLIC_BASE_URL?: string };

/**
 * The URL of the map route. It comes from the environment and never from the request: a proxy that
 * fetched `https://{Host header}/next/markets` could be sent to another host by a forged `Host`
 * header, and would then cache that host's answer as the market map for every visitor.
 */
export function marketsRouteUrl(env: Env): URL {
  return appRouteUrl(MARKETS_ROUTE, env);
}

/** The URL of one of the app's own routes, from the environment (`marketsRouteUrl` says why). */
export function appRouteUrl(route: string, env: { NEXT_PUBLIC_BASE_URL?: string }): URL {
  const base = env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";
  try {
    return new URL(route, base);
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
 * The route returns a `MarketMap`, which the same source checks again (`marketMapProblems`). Imports neither Payload nor the Medusa SDK: that is the point (the cold start of a proxy
 * function). `staleWhileRevalidate`: this is on every request's path, and none may wait for a read.
 */
export function createProxyMarketMap(options: ProxyMarketMapOptions = {}) {
  // `lib/env.ts` reads each variable by its own name, which is what `next build` replaces with a
  // NEXT_PUBLIC_* value; a spread of the whole environment would find nothing in this bundle.
  const env: Env = options.env ?? processEnv;
  const fetcher = options.fetcher ?? fetch;
  // 60 s for the first read in `next dev`, which waits for the map route to compile (W2, finding 3); 10 s
  // otherwise. The fetch gets the same, so it is not cut off before the source gives up.
  const timeoutMs = marketLoadTimeoutMs(env);
  return createMarketSource({
    load: async (): Promise<MarketMap> => {
      const url = marketsRouteUrl(env);
      // The URL in every message: a wrong NEXT_PUBLIC_BASE_URL is otherwise a bare "fetch failed".
      const fail = (what: string) => new Error(`${url.href} ${what}`);
      const response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      }).catch((error: unknown) => {
        throw fail(`could not be fetched (${describeError(error)})`);
      });
      if (!response.ok) {
        throw fail(`answered ${response.status}; the reason is in the server log of that route`);
      }
      const body = (await response.json().catch(() => null)) as Partial<MarketMap> | null;
      return toMarketMap(body, (what) => fail(`${what}; is NEXT_PUBLIC_BASE_URL this app?`));
    },
    fallback: seededMarkets,
    allowFallback: defaultAllowFallback(env),
    firstLoadTimeoutMs: timeoutMs,
    staleWhileRevalidate: true,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
}

export const getProxyMarketMap = createProxyMarketMap().get;
