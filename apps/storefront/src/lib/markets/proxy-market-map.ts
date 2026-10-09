import { markets as seededMarkets } from "@shopblok/fixtures";
import { env as processEnv } from "../env";
import type { MarketsGlobal } from "./global";
import {
  createMarketSource,
  defaultAllowFallback,
  describeError,
  MARKET_LOAD_TIMEOUT_MS,
  type MarketSourceOptions,
} from "./source";

/** Where the proxy reads the map: `app/next/markets/route.ts`, which the proxy's matcher skips. */
export const MARKETS_ROUTE = "/next/markets";

type Env = Parameters<typeof defaultAllowFallback>[0] & { NEXT_PUBLIC_BASE_URL?: string };

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
 * maps and checks it again. Imports no Payload: that is the point (the cold start of a proxy
 * function). `staleWhileRevalidate`: this is on every request's path, and none may wait for a read.
 */
export function createProxyMarketMap(options: ProxyMarketMapOptions = {}) {
  // `lib/env.ts` reads each name as the literal `process.env.NAME`, which is what `next build`
  // replaces with a NEXT_PUBLIC_* value; `{ ...process.env }` would find nothing in this bundle.
  const env: Env = options.env ?? processEnv;
  const fetcher = options.fetcher ?? fetch;
  return createMarketSource({
    load: async (): Promise<MarketsGlobal> => {
      const url = marketsRouteUrl(env);
      // The URL in every message: a wrong NEXT_PUBLIC_BASE_URL is otherwise a bare "fetch failed".
      const fail = (what: string) => new Error(`${url.href} ${what}`);
      const response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(MARKET_LOAD_TIMEOUT_MS),
      }).catch((error: unknown) => {
        throw fail(`could not be fetched (${describeError(error)})`);
      });
      if (!response.ok) {
        throw fail(`answered ${response.status}; the reason is in the server log of that route`);
      }
      const body = (await response.json().catch(() => null)) as Partial<MarketsGlobal> | null;
      // The one place the shape is untrusted: another app on the address answers 200 with its own
      // page or JSON. The route always sends both lists.
      if (!Array.isArray(body?.countries) || !Array.isArray(body.languages)) {
        throw fail("did not answer a market map; is NEXT_PUBLIC_BASE_URL this app?");
      }
      return body;
    },
    fallback: seededMarkets,
    allowFallback: defaultAllowFallback(env),
    staleWhileRevalidate: true,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
}

export const getProxyMarketMap = createProxyMarketMap().get;
