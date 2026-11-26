import { Redis } from "ioredis";

/**
 * M7 D142 (T108): where the counters live. Medusa's own Redis (`REDIS_URL`, on Railway's private
 * network, never reachable from the internet); in memory, per process, only when `REDIS_URL` is
 * unset, as in development and the backend's integration tests.
 *
 * One call per counter: the count after this request and the time left in its window. In Redis it is
 * one script, so the `INCR` and the window's `PEXPIRE` cannot be split by a crash or a second caller.
 * **When Redis cannot be reached the store answers `undefined`** and the limiter lets the request
 * through (a Redis outage must not stop sign-ins), with one warning a minute.
 */

export type Hit = { count: number; ttlMs: number };

export interface CounterStore {
  /** Adds one to `key` (a new window of `windowMs` when it has none); `undefined`: not counted. */
  hit(key: string, windowMs: number): Promise<Hit | undefined>;
}

export type Warn = (message: string) => void;

/** How often the "Redis cannot be reached" warning may be logged. */
export const WARN_EVERY_MS = 60_000;

/** A warning at most once per `WARN_EVERY_MS`. */
export function throttledWarn(warn: Warn, now: () => number = Date.now): Warn {
  let last = -Infinity;
  return (message) => {
    const at = now();
    if (at - last < WARN_EVERY_MS) return;
    last = at;
    warn(message);
  };
}

/** The in-memory store: a map of windows, swept as it grows. Per process, so per Medusa instance. */
export class MemoryStore implements CounterStore {
  readonly #windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async hit(key: string, windowMs: number): Promise<Hit> {
    const at = this.now();
    if (this.#windows.size > 10_000) {
      for (const [name, window] of this.#windows) if (window.resetAt <= at) this.#windows.delete(name);
    }
    const current = this.#windows.get(key);
    if (current === undefined || current.resetAt <= at) {
      this.#windows.set(key, { count: 1, resetAt: at + windowMs });
      return { count: 1, ttlMs: windowMs };
    }
    current.count += 1;
    return { count: current.count, ttlMs: current.resetAt - at };
  }
}

/**
 * One `INCR`; the first hit of a window sets its `PEXPIRE`; a key that lost its expiry somehow gets
 * one again, so a counter can never outlive its window for good. Answers the count and `PTTL`.
 */
export const HIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

type HitClient = Redis & {
  shopblokRateLimitHit(key: string, windowMs: number): Promise<[number, number]>;
};

/**
 * The Redis store. Its own connection to `REDIS_URL` (Medusa's modules keep theirs), with no offline
 * queue and one try per command: while Redis is down a hit fails at once instead of waiting, and
 * the connection keeps retrying in the background.
 */
export class RedisStore implements CounterStore {
  readonly #client: HitClient;
  readonly #warn: Warn;

  constructor(url: string, warn: Warn) {
    this.#warn = throttledWarn(warn);
    this.#client = new Redis(url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      commandTimeout: 1_000,
      retryStrategy: (times) => Math.min(times * 200, 5_000),
      // The limiter never needs `CLIENT SETNAME`/`INFO` before its first command.
      enableReadyCheck: false,
    }) as HitClient;
    this.#client.defineCommand("shopblokRateLimitHit", { numberOfKeys: 1, lua: HIT_SCRIPT });
    // Without a listener ioredis prints every failed reconnection; the hits below say it once a minute.
    this.#client.on("error", (error: Error) => this.#unreachable(error));
  }

  #unreachable(error: unknown): undefined {
    const reason = error instanceof Error ? error.message : String(error);
    this.#warn(`rate-limit: Redis cannot be reached (${reason}); requests pass without a limit`);
    return undefined;
  }

  async hit(key: string, windowMs: number): Promise<Hit | undefined> {
    if (this.#client.status !== "ready" && this.#client.status !== "connect") {
      return this.#unreachable(new Error(`connection ${this.#client.status}`));
    }
    try {
      const [count, ttl] = await this.#client.shopblokRateLimitHit(key, windowMs);
      return { count: Number(count), ttlMs: Number(ttl) };
    } catch (error) {
      return this.#unreachable(error);
    }
  }

  /** For the tests: closes the connection. */
  async close(): Promise<void> {
    this.#client.disconnect();
  }
}

/** The store for `REDIS_URL`: Redis when it is set (trimmed), memory when it is not. */
export function storeFor(redisUrl: string | undefined, warn: Warn): CounterStore {
  const url = (redisUrl ?? "").trim();
  return url === "" ? new MemoryStore() : new RedisStore(url, warn);
}
