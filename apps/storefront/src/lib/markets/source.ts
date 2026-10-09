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
  /** How long a map is kept: 30 s (D10). */
  ttlMs?: number;
  now?: () => number;
  warn?: (message: string) => void;
};

/** The global can't give a map, and nothing may stand in for it. */
export class MarketMapError extends Error {
  override name = "MarketMapError";
}

export const MARKET_MAP_TTL_MS = 30_000;

/**
 * When the seeded fixtures may stand in for the global (D10, T10 step 4):
 * - an empty or incomplete global: in development, and while `next build` runs, never in
 *   production, where the shop would silently sell in the wrong markets;
 * - a global that can't be read: only while `next build` runs, because CI builds with no database.
 *   The prerendered pages for the seeded keys then say so in the build log, and a running server
 *   reads the real map.
 */
export function defaultAllowFallback(env: {
  NODE_ENV?: string;
  NEXT_PHASE?: string;
}): (reason: FallbackReason) => boolean {
  return (reason) =>
    env.NEXT_PHASE === "phase-production-build" ||
    (reason === "unusable" && env.NODE_ENV !== "production");
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The market map with an in-process cache (D10). A map is kept for `ttlMs`; callers that arrive
 * while it is being read share that read. When a read fails or gives an unusable global, the last
 * good map keeps serving (with a warning) rather than taking the shop down; only a first read has
 * nothing to keep, and then it is the fallback, where allowed, or an error. Nothing here imports
 * Payload, so a test can feed it a fake `load`.
 */
export function createMarketSource(options: MarketSourceOptions) {
  const { load, fallback, allowFallback } = options;
  const ttlMs = options.ttlMs ?? MARKET_MAP_TTL_MS;
  const now = options.now ?? Date.now;
  const warn = options.warn ?? ((message: string) => console.warn(message));

  let current: { map: MarketMap; expires: number } | undefined;
  let reading: Promise<MarketMap> | undefined;

  const keep = (map: MarketMap): MarketMap => {
    current = { map, expires: now() + ttlMs };
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
      doc = await load();
    } catch (error) {
      return otherwise(
        "unreachable",
        `the markets global could not be read (${describe(error)})`,
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
      return reading;
    },
    /** Forget the map, so the next `get` reads the global again. */
    clear(): void {
      current = undefined;
    },
  };
}
