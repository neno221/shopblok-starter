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

/** A read that never answers (a database host gone silent) must not hold every caller forever. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer after ${ms / 1000} s`)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
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
  const now = options.now ?? (() => performance.now());
  const warn = options.warn ?? ((message: string) => console.warn(message));

  let current: { map: MarketMap; expires: number } | undefined;
  let reading: Promise<MarketMap> | undefined;
  let loading: Promise<MarketsGlobal | null | undefined> | undefined;

  /** The read in flight. One that timed out is still running, so the next caller joins it. */
  const loadOnce = () =>
    (loading ??= load().finally(() => {
      loading = undefined;
    }));

  const keep = (map: MarketMap): MarketMap => {
    current = { map, expires: now() + MARKET_MAP_TTL_MS };
    return map;
  };

  /** Called when the global can't be used: the last good map, the fallback, or the error. */
  function otherwise(reason: FallbackReason, why: string, error: unknown): MarketMap {
    if (current !== undefined) {
      warn(`markets: ${why}; still serving the map read earlier`);
      return keep(current.map);
    }
    if (allowFallback(reason)) {
      warn(`markets: ${why}; using the seeded fixtures (run pnpm bootstrap to fill the global)`);
      return keep(fallback);
    }
    if (reason === "unreachable") throw error;
    throw new MarketMapError(`${why}. Fill in Markets in /admin, or run pnpm bootstrap.`);
  }

  async function read(): Promise<MarketMap> {
    let doc: MarketsGlobal | null | undefined;
    try {
      doc = await withTimeout(loadOnce(), MARKET_LOAD_TIMEOUT_MS);
    } catch (error) {
      return otherwise(
        "unreachable",
        `the markets global could not be read (${describeError(error)})`,
        error,
      );
    }
    const map = mapFromGlobal(doc ?? {});
    const problems = marketMapProblems(map);
    if (problems.length === 0) return keep(map);
    const state = map.countries.length === 0 ? "empty" : "incomplete";
    return otherwise(
      "unusable",
      `the markets global is ${state}: ${problems.join("; ")}`,
      undefined,
    );
  }

  return {
    /** The market map, from the cache when it is younger than the TTL. */
    async get(): Promise<MarketMap> {
      if (current !== undefined && now() < current.expires) return current.map;
      reading ??= read().finally(() => {
        reading = undefined;
      });
      // With a map to serve, the caller doesn't wait: the read runs on and renews the map.
      return staleWhileRevalidate && current !== undefined ? current.map : reading;
    },
  };
}
