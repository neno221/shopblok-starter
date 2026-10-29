import { withTimeout } from "../with-timeout";
import { mapFromGlobal, marketMapProblems, type MarketsGlobal } from "./global";
import type { MarketMap } from "./types";

/** Why the global could not be used: it was read and is empty or incomplete, or it was not read. */
export type FallbackReason = "unusable" | "unreachable";

export type MarketSourceOptions = {
  /** Reads the `markets` global: Payload's Local API in the app, a fake in tests. */
  load: () => Promise<MarketsGlobal | null | undefined>;
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

/** The global can't give a map, and nothing may stand in for it. */
export class MarketMapError extends Error {
  override name = "MarketMapError";
}

/** How long a map is kept (D10). */
const MARKET_MAP_TTL_MS = 30_000;

/**
 * How long a caller waits for one read of the global before it counts as failed. The pool's own
 * connect timeout (`payload.config.ts`) covers an unreachable host; this covers a connection that
 * goes silent after it was made, and anything else that never settles.
 */
export const MARKET_LOAD_TIMEOUT_MS = 10_000;

/**
 * The same wait in `next dev`, where the first read of a fresh server starts Payload, and the
 * proxy's first read also waits for the map route to compile. That took 8.2 s to over 13 s on the
 * reference Windows PC, so with 10 s the first page after `pnpm dev` started could answer 500 (W2,
 * finding 3). A production server has no such first read: the map route was prerendered.
 */
export const DEV_MARKET_LOAD_TIMEOUT_MS = 60_000;

/** How long a read of the global may take: longer in development only (D10's rules otherwise). */
export function marketLoadTimeoutMs(env: { NODE_ENV?: string }): number {
  return env.NODE_ENV === "development" ? DEV_MARKET_LOAD_TIMEOUT_MS : MARKET_LOAD_TIMEOUT_MS;
}

/**
 * When the seeded fixtures may stand in for the global (D10, T10 step 4):
 * - an empty or incomplete global: in development, and while `next build` runs, never in
 *   production, where the shop would silently sell in the wrong markets;
 * - a global that can't be read: only while `next build` runs and no database is configured
 *   (`PAYLOAD_DATABASE_URL` is unset), because CI builds with no `.env` and no database. A build
 *   that has a database configured and can't read it fails, rather than ship the fixtures in place
 *   of the real markets. The prerendered pages for the seeded keys say so in the build log, and a
 *   running server reads the real map.
 */
export function defaultAllowFallback(env: {
  NODE_ENV?: string;
  NEXT_PHASE?: string;
  PAYLOAD_DATABASE_URL?: string;
}): (reason: FallbackReason) => boolean {
  return (reason) => {
    const building = env.NEXT_PHASE === "phase-production-build";
    if (reason === "unusable") return building || env.NODE_ENV !== "production";
    return building && !env.PAYLOAD_DATABASE_URL;
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The market map with an in-process cache (D10). A map is kept for `MARKET_MAP_TTL_MS`; callers
 * that arrive while it is being read share that read. When a read fails, times out or gives an
 * unusable global, the last good map keeps serving (with a warning) rather than taking the shop
 * down; only a first read has nothing to keep, and then it is the fallback, where allowed, or an
 * error. Nothing here imports Payload, so a test can feed it a fake `load`.
 */
export function createMarketSource(options: MarketSourceOptions) {
  const { load, fallback, allowFallback, staleWhileRevalidate } = options;
  const firstLoadTimeoutMs = options.firstLoadTimeoutMs ?? MARKET_LOAD_TIMEOUT_MS;
  const now = options.now ?? (() => performance.now());
  const warn = options.warn ?? ((message: string) => console.warn(message));

  let current: { map: MarketMap; expires: number } | undefined;
  let reading: Promise<MarketMap> | undefined;
  let loading: Promise<MarketsGlobal | null | undefined> | undefined;
  // Each read is numbered when it starts; a read that ends after a later one has been kept (a
  // `fresh()` that overtook it) answers its own caller but does not replace that later map.
  let started = 0;
  let kept = 0;

  /** The read in flight. One that timed out is still running, so the next caller joins it. */
  const loadOnce = () =>
    (loading ??= load().finally(() => {
      loading = undefined;
    }));

  const keep = (map: MarketMap, order: number): MarketMap => {
    if (order < kept) return map;
    kept = order;
    current = { map, expires: now() + MARKET_MAP_TTL_MS };
    return map;
  };

  /** Called when the global can't be used: the last good map, the fallback, or the error. */
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
      warn(`markets: ${why}; using the seeded fixtures (run pnpm bootstrap to fill the global)`);
      return keep(fallback, order);
    }
    if (reason === "unreachable") throw error;
    throw new MarketMapError(`${why}. Fill in Markets in /admin, or run pnpm bootstrap.`);
  }

  /** One read of the global through `loader`: `loadOnce` for `get()`, a load of its own for `fresh()`. */
  async function read(loader: () => Promise<MarketsGlobal | null | undefined>): Promise<MarketMap> {
    const order = ++started;
    let doc: MarketsGlobal | null | undefined;
    try {
      // The longer wait is for a server that is starting; with a map held, D10's 10 s again.
      const timeoutMs = current === undefined ? firstLoadTimeoutMs : MARKET_LOAD_TIMEOUT_MS;
      doc = await withTimeout(loader(), timeoutMs);
    } catch (error) {
      return otherwise(
        "unreachable",
        `the markets global could not be read (${describeError(error)})`,
        error,
        order,
      );
    }
    const map = mapFromGlobal(doc ?? {});
    const problems = marketMapProblems(map);
    if (problems.length === 0) return keep(map, order);
    const state = map.countries.length === 0 ? "empty" : "incomplete";
    return otherwise(
      "unusable",
      `the markets global is ${state}: ${problems.join("; ")}`,
      undefined,
      order,
    );
  }

  return {
    /** The market map, from the cache when it is younger than the TTL. */
    async get(): Promise<MarketMap> {
      if (current !== undefined && now() < current.expires) return current.map;
      reading ??= read(loadOnce).finally(() => {
        reading = undefined;
      });
      // With a map to serve, the caller doesn't wait: the read runs on and renews the map.
      return staleWhileRevalidate && current !== undefined ? current.map : reading;
    },
    /**
     * The global as it is now, whatever the TTL, with the same last-good-map and fallback rules,
     * and kept for `get()`. It never joins a read already running, which may have started before
     * the change (PR 102 review, item 1). For a caller that has a cache of its own and was just
     * told the global changed (`getRenderMarketMap`, T71), so it runs about once per change.
     */
    fresh(): Promise<MarketMap> {
      return read(load);
    },
  };
}
