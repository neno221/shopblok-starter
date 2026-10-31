import { withTimeout } from "../with-timeout";
import { marketMapProblems } from "./problems";
import type { MarketMap } from "./types";

/** Why the map could not be used: it was read and is empty or incomplete, or it was not read. */
export type FallbackReason = "unusable" | "unreachable";

export type MarketSourceOptions = {
  /** Reads the market map: Medusa's `GET /store/markets` in the app, a fake in tests. */
  load: () => Promise<MarketMap>;
  /** The map to use instead, where `allowFallback` says so (the seeded fixtures). */
  fallback: MarketMap;
  allowFallback: (reason: FallbackReason) => boolean;
  /**
   * Past the TTL, answer with the map held and read the new one in the background, so no caller
   * waits for a slow read. For a caller on every request's path (the proxy); only the first read
   * blocks then. In a serverless function the background read may pause with the instance; the
   * next call joins it or starts another.
   */
  staleWhileRevalidate?: boolean;
  /**
   * How long a read may take while no map is held yet: `MARKET_LOAD_TIMEOUT_MS` by default (see
   * `marketLoadTimeoutMs`). Once a map is held, every read gets `MARKET_LOAD_TIMEOUT_MS` (D10).
   */
  firstLoadTimeoutMs?: number;
  /** A monotonic clock in ms; `performance.now()` by default, which Cache Components allows. */
  now?: () => number;
  warn?: (message: string) => void;
};

/** Medusa can't give a map, and nothing may stand in for it. */
export class MarketMapError extends Error {
  override name = "MarketMapError";
}

/** How long a map is kept (D10). */
const MARKET_MAP_TTL_MS = 30_000;

/**
 * The shortest time between two `expire()` calls that each drop the reads in flight. A webhook is
 * one call per save and a save is several writes, so a burst is normal; a flood of them (a leaked
 * secret, D94) would otherwise start a read of Medusa per call. Inside the gap an expire still
 * marks the held map stale, and the next `get()` after the gap discards what was read since.
 */
export const MARKET_EXPIRE_GAP_MS = 1_000;

/**
 * How long a caller waits for one read of the map before it counts as failed. The SDK call has a
 * timeout of its own (`MEDUSA_REQUEST_TIMEOUT_MS`); this covers anything else that never settles.
 */
export const MARKET_LOAD_TIMEOUT_MS = 10_000;

/**
 * The same wait in `next dev`, where the proxy's first read starts the dev server's compile of the
 * map route and waits for it. That took 8.2 s to over 13 s on the reference Windows PC, so with
 * 10 s the first page after `pnpm dev` started could answer 500 (W2, finding 3). Only the proxy
 * reads the map over HTTP: `getMarketMap` calls Medusa, whose SDK call is capped at 10 s anyway.
 * A production server has no such first read: the map route was prerendered.
 */
export const DEV_MARKET_LOAD_TIMEOUT_MS = 60_000;

/** How long a read of the map may take: longer in development only (D10's rules otherwise). */
export function marketLoadTimeoutMs(env: { NODE_ENV?: string }): number {
  return env.NODE_ENV === "development" ? DEV_MARKET_LOAD_TIMEOUT_MS : MARKET_LOAD_TIMEOUT_MS;
}

/**
 * When the seeded fixtures may stand in for the map (D10, T10 step 4, D94):
 * - an empty or incomplete map: in development, and while `next build` runs, never in
 *   production, where the shop would silently sell in the wrong markets;
 * - a map that can't be read: only while `next build` runs and Medusa is not configured
 *   (`MEDUSA_BACKEND_URL` or the publishable key is unset), because CI builds with no `.env` and no
 *   backend. A build that has Medusa configured and can't read it fails, rather than ship the
 *   fixtures in place of the real markets. The prerendered pages for the seeded keys say so in the
 *   build log, and a running server reads the real map.
 */
export function defaultAllowFallback(env: {
  NODE_ENV?: string;
  NEXT_PHASE?: string;
  MEDUSA_BACKEND_URL?: string;
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?: string;
}): (reason: FallbackReason) => boolean {
  return (reason) => {
    const building = env.NEXT_PHASE === "phase-production-build";
    if (reason === "unusable") return building || env.NODE_ENV !== "production";
    // A blank value in `.env` (`KEY=`) is "not set", as `medusaEnv()` reads it.
    const configured =
      Boolean(env.MEDUSA_BACKEND_URL?.trim()) &&
      Boolean(env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim());
    return building && !configured;
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The market map with an in-process cache (D10). A map is kept for `MARKET_MAP_TTL_MS`; callers
 * that arrive while it is being read share that read. When a read fails, times out or gives an
 * unusable map, the last good map keeps serving (with a warning) rather than taking the shop
 * down; only a first read has nothing to keep, and then it is the fallback, where allowed, or an
 * error. Nothing here imports Payload or the Medusa SDK, so a test can feed it a fake `load`.
 */
export function createMarketSource(options: MarketSourceOptions) {
  const { load, fallback, allowFallback, staleWhileRevalidate } = options;
  const firstLoadTimeoutMs = options.firstLoadTimeoutMs ?? MARKET_LOAD_TIMEOUT_MS;
  const now = options.now ?? (() => performance.now());
  const warn = options.warn ?? ((message: string) => console.warn(message));

  let current: { map: MarketMap; expires: number } | undefined;
  let reading: Promise<MarketMap> | undefined;
  let loading: Promise<MarketMap> | undefined;
  // Each read is numbered when it starts; a read that ends after a later one has been kept (a
  // `fresh()` that overtook it) answers its own caller but does not replace that later map.
  let started = 0;
  let kept = 0;
  // `expire()`: a read numbered up to `staleBefore` began before the change it was told about, so
  // it answers its own caller and is not kept. `lastExpire` and `pendingExpire` are the gap's.
  let staleBefore = 0;
  let lastExpire: number | undefined;
  let pendingExpire = false;

  /** The read in flight. One that timed out is still running, so the next caller joins it. */
  const loadOnce = () => {
    const attempt: Promise<MarketMap> = (loading ??= load().finally(() => {
      // An expire may have started another read since: only clear our own.
      if (loading === attempt) loading = undefined;
    }));
    return attempt;
  };

  const keep = (map: MarketMap, order: number): MarketMap => {
    if (order < kept || order <= staleBefore) return map;
    kept = order;
    current = { map, expires: now() + MARKET_MAP_TTL_MS };
    return map;
  };

  /** Called when the map can't be used: the last good map, the fallback, or the error. */
  function otherwise(
    reason: FallbackReason,
    why: string,
    error: unknown,
    order: number,
  ): MarketMap {
    if (current !== undefined) {
      warn(`markets: ${why}; still serving the map read earlier`);
      return keep(current.map, order);
    }
    if (allowFallback(reason)) {
      warn(
        `markets: ${why}; using the seeded fixtures (run pnpm bootstrap and start Medusa to read the real map)`,
      );
      return keep(fallback, order);
    }
    if (reason === "unreachable") throw error;
    throw new MarketMapError(
      `${why}. Open a country in Medusa Admin (a region's Markets panel), or run pnpm bootstrap.`,
    );
  }

  /** One read of the map through `loader`: `loadOnce` for `get()`, a load of its own for `fresh()`. */
  async function read(loader: () => Promise<MarketMap>): Promise<MarketMap> {
    const order = ++started;
    let map: MarketMap;
    try {
      // The longer wait is for a server that is starting; with a map held, D10's 10 s again.
      const timeoutMs = current === undefined ? firstLoadTimeoutMs : MARKET_LOAD_TIMEOUT_MS;
      map = await withTimeout(loader(), timeoutMs);
    } catch (error) {
      return otherwise(
        "unreachable",
        `the market map could not be read (${describeError(error)})`,
        error,
        order,
      );
    }
    const problems = marketMapProblems(map);
    if (problems.length === 0) return keep(map, order);
    const state = map.countries.length === 0 ? "empty" : "incomplete";
    return otherwise(
      "unusable",
      `the market map is ${state}: ${problems.join("; ")}`,
      undefined,
      order,
    );
  }

  /**
   * Applies an expire that is due: the held map is stale (and stays, as the last good map), and no
   * read begun so far may be kept or joined, because it may have read the map before the change.
   */
  function applyExpire(): void {
    const time = now();
    if (!pendingExpire) return;
    if (lastExpire !== undefined && time - lastExpire < MARKET_EXPIRE_GAP_MS) return;
    pendingExpire = false;
    lastExpire = time;
    // A read that ended inside the gap renewed the map; it may predate the later call.
    if (current !== undefined) current.expires = 0;
    staleBefore = started;
    reading = undefined;
    loading = undefined;
  }

  return {
    /** The market map, from the cache when it is younger than the TTL. */
    async get(): Promise<MarketMap> {
      applyExpire();
      if (current !== undefined && now() < current.expires) return current.map;
      const attempt: Promise<MarketMap> = (reading ??= read(loadOnce).finally(() => {
        // Only clear our own: an expire may have started another read since.
        if (reading === attempt) reading = undefined;
      }));
      // With a map to serve, the caller doesn't wait: the read runs on and renews the map.
      return staleWhileRevalidate && current !== undefined ? current.map : attempt;
    },
    /**
     * Tells the source the map changed in Medusa (the backend's `medusa:markets` event, through
     * `/api/revalidate`). The map held becomes stale but is kept as the last good map, so a Medusa
     * outage right after a save still serves it. The next `get()` starts a read of its own: a read
     * already running may have begun before the save, and is neither joined nor kept (PR 102
     * review, item 1). Calls less than `MARKET_EXPIRE_GAP_MS` apart share one such discard, so a
     * flood of calls costs about one read a second.
     */
    expire(): void {
      if (current !== undefined) current.expires = 0;
      pendingExpire = true;
      applyExpire();
    },
    /**
     * The map as it is now, whatever the TTL, with the same last-good-map and fallback rules,
     * and kept for `get()`. It never joins a read already running, which may have started before
     * the change (PR 102 review, item 1). For a caller that has a cache of its own and was just
     * told the map changed (`getRenderMarketMap`, T71), so it runs about once per change.
     */
    fresh(): Promise<MarketMap> {
      return read(load);
    },
  };
}
