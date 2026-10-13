import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketsGlobal } from "./global";
import {
  createMarketSource,
  defaultAllowFallback,
  DEV_MARKET_LOAD_TIMEOUT_MS,
  MARKET_LOAD_TIMEOUT_MS,
  MarketMapError,
  marketLoadTimeoutMs,
  type FallbackReason,
  type MarketSourceOptions,
} from "./source";
import { brazil, seeded } from "./test-maps";

/** The seeded map as the global stores it. */
const seededGlobal: MarketsGlobal = {
  countries: seeded.countries,
  languages: seeded.languages,
  primaryCountry: seeded.primaryCountry,
  fallbackMarket: seeded.fallbackMarket,
};
const brazilGlobal: MarketsGlobal = {
  countries: brazil.countries,
  languages: brazil.languages,
  primaryCountry: brazil.primaryCountry,
  fallbackMarket: brazil.fallbackMarket,
};
// Half-filled: the countries are there, but no language has a Medusa locale yet.
const incompleteGlobal: MarketsGlobal = {
  countries: seeded.countries,
  languages: [],
  primaryCountry: seeded.primaryCountry,
  fallbackMarket: seeded.fallbackMarket,
};

/** An answer for a read that never settles (a database host gone silent). */
const NEVER = new Promise<never>(() => {});
type Answer = MarketsGlobal | Error | null | Promise<MarketsGlobal>;

/** A source over a fake loader and a clock the test moves. */
function setup(
  first: Answer,
  allow: (reason: FallbackReason) => boolean = () => false,
  extra: Pick<MarketSourceOptions, "staleWhileRevalidate" | "loadTimeoutMs"> = {},
) {
  const clock = { time: 1_000_000 };
  // What the next reads return, in order; the last answer repeats.
  let answers: Answer[] = [first];
  const load = vi.fn(async () => {
    const answer = answers[0];
    if (answers.length > 1) answers = answers.slice(1);
    if (answer instanceof Error) throw answer;
    return answer;
  });
  const warn = vi.fn();
  const allowFallback = vi.fn(allow);
  const source = createMarketSource({
    load,
    fallback: seeded,
    allowFallback,
    now: () => clock.time,
    warn,
    ...extra,
  });
  return {
    source,
    load,
    warn,
    allowFallback,
    advance: (ms: number) => (clock.time += ms),
    next: (...more: Answer[]) => {
      answers = more;
    },
  };
}

describe("getMarketMap: the 30 s cache (D10)", () => {
  it("reads the global once and serves the map from memory for 30 s", async () => {
    const { source, load, advance } = setup(seededGlobal);
    const first = await source.get();
    expect(first).toEqual(seeded);
    advance(29_999);
    expect(await source.get()).toBe(first);
    expect(await source.get()).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reads again once 30 s are up, and uses what it finds", async () => {
    const { source, load, advance, next } = setup(seededGlobal);
    await source.get();
    advance(30_000);
    next(brazilGlobal);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
    advance(29_999);
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one read between callers that arrive while it runs", async () => {
    const { source, load } = setup(seededGlobal);
    const maps = await Promise.all([source.get(), source.get(), source.get()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(maps[0]).toBe(maps[1]);
    expect(maps[1]).toBe(maps[2]);
  });

  it("keeps a fallback map for the TTL too, so a bare database isn't read on every request", async () => {
    const { source, load, advance } = setup(null, () => true);
    await source.get();
    advance(10_000);
    await source.get();
    expect(load).toHaveBeenCalledTimes(1);
    advance(20_000);
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("getMarketMap: an empty or incomplete global", () => {
  it("falls back to the fixtures where allowed, and says so", async () => {
    const { source, warn, allowFallback } = setup(null, (reason) => reason === "unusable");
    expect(await source.get()).toBe(seeded);
    expect(allowFallback).toHaveBeenCalledWith("unusable");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(
      /markets global is empty: no country is enabled.*seeded fixtures/,
    );
  });

  it("treats an empty array and an empty object the same", async () => {
    for (const doc of [{}, { countries: [], languages: [] }]) {
      const { source } = setup(doc, () => true);
      expect(await source.get()).toBe(seeded);
    }
  });

  it("falls back for a half-filled global, naming what is missing", async () => {
    const { source, warn } = setup(incompleteGlobal, () => true);
    expect(await source.get()).toBe(seeded);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("incomplete");
    expect(message).toContain("language el has no Medusa locale under Languages");
  });

  it("serves a global with no primary country or fallback market: both have a fallback", async () => {
    const { source, warn } = setup({ countries: seeded.countries, languages: seeded.languages });
    expect(await source.get()).toEqual({ ...seeded, primaryCountry: "", fallbackMarket: "" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("is an error where the fallback is not allowed (production), and says what to do", async () => {
    const { source, warn } = setup(null);
    const attempt = source.get();
    await expect(attempt).rejects.toBeInstanceOf(MarketMapError);
    await expect(attempt).rejects.toThrow(
      /empty.*Fill in Markets in \/admin, or run pnpm bootstrap/,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not cache the error: the next call reads again, and a fixed global is used", async () => {
    const { source, load, next } = setup(null);
    await expect(source.get()).rejects.toBeInstanceOf(MarketMapError);
    next(seededGlobal);
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps serving the last good map when the global is later saved half-filled", async () => {
    const { source, advance, next, warn } = setup(brazilGlobal);
    await source.get();
    advance(30_000);
    next(incompleteGlobal);
    expect(await source.get()).toEqual(brazil);
    expect(warn.mock.calls[0]?.[0]).toMatch(/incomplete.*still serving the map read earlier/);
  });
});

describe("getMarketMap: a global that can't be read", () => {
  it("fails where the fallback is not allowed, with the original error", async () => {
    const down = new Error("connect ECONNREFUSED 127.0.0.1:15432");
    const { source, allowFallback } = setup(down, (reason) => reason === "unusable");
    await expect(source.get()).rejects.toBe(down);
    expect(allowFallback).toHaveBeenCalledWith("unreachable");
  });

  it("falls back where it is allowed (`next build` in CI has no database)", async () => {
    const { source, warn } = setup(new Error("no database"), (reason) => reason === "unreachable");
    expect(await source.get()).toBe(seeded);
    expect(warn.mock.calls[0]?.[0]).toMatch(/could not be read \(no database\).*seeded fixtures/);
  });

  it("keeps serving the last good map through an outage, and recovers", async () => {
    const { source, advance, next, load, warn } = setup(brazilGlobal);
    await source.get();
    advance(30_000);
    next(new Error("connection reset"));
    expect(await source.get()).toEqual(brazil);
    expect(warn.mock.calls[0]?.[0]).toMatch(/connection reset.*still serving the map read earlier/);
    // The stale map is kept for a further TTL, so an outage isn't a read per request.
    advance(1_000);
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
    advance(30_000);
    next(seededGlobal);
    expect(await source.get()).toEqual(seeded);
  });
});

describe("getMarketMap: a read that never answers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** One `get()` while the loader stays silent: it settles when the timeout fires. */
  async function getAfterTimeout(source: ReturnType<typeof setup>["source"]) {
    const attempt = source.get();
    await vi.advanceTimersByTimeAsync(MARKET_LOAD_TIMEOUT_MS);
    return attempt;
  }

  it("gives up after the timeout and keeps serving the last good map", async () => {
    const { source, load, warn, advance, next } = setup(brazilGlobal);
    await source.get();
    next(NEVER);
    advance(30_000);
    expect(await getAfterTimeout(source)).toEqual(brazil);
    expect(warn.mock.calls[0]?.[0]).toMatch(
      /no answer after 10 s.*still serving the map read earlier/,
    );
    // The stale map is kept for a further TTL, so callers after it don't wait for a read either.
    advance(1_000);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("joins the read still running at the next TTL instead of starting another", async () => {
    const { source, load, advance, next } = setup(brazilGlobal);
    await source.get();
    next(NEVER);
    advance(30_000);
    await getAfterTimeout(source);
    advance(30_000);
    expect(await getAfterTimeout(source)).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reads again once the silent read has ended", async () => {
    const { source, load, advance, next } = setup(brazilGlobal);
    await source.get();
    next(new Promise<never>((_, fail) => setTimeout(() => fail(new Error("reset")), 20_000)));
    advance(30_000);
    await getAfterTimeout(source);
    await vi.advanceTimersByTimeAsync(20_000);
    next(seededGlobal);
    advance(30_000);
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("is an error for a first read, with nothing to keep and no fallback allowed", async () => {
    const { source } = setup(NEVER);
    const failure = expect(source.get()).rejects.toThrow(/no answer after 10 s/);
    await vi.advanceTimersByTimeAsync(MARKET_LOAD_TIMEOUT_MS);
    await failure;
  });

  it("clears its timer when the read answers in time", async () => {
    const { source } = setup(seededGlobal);
    await source.get();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("getMarketMap: staleWhileRevalidate (the proxy's choice)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const swr = (first: Answer) => setup(first, undefined, { staleWhileRevalidate: true });
  /** Lets the read that `get()` left running in the background finish. */
  const flush = () => vi.advanceTimersByTimeAsync(0);

  it("blocks for a first read, as there is nothing to serve", async () => {
    const { source } = swr(NEVER);
    const failure = expect(source.get()).rejects.toThrow(/no answer after 10 s/);
    await vi.advanceTimersByTimeAsync(MARKET_LOAD_TIMEOUT_MS);
    await failure;
  });

  it("answers with the old map at once past the TTL, and the new one once it is read", async () => {
    const { source, load, advance, next } = swr(brazilGlobal);
    await source.get();
    advance(30_000);
    next(seededGlobal);
    expect(await source.get()).toEqual(brazil);
    await flush();
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not make callers wait for a read that never answers, one read for all of them", async () => {
    const { source, load, advance, next } = swr(brazilGlobal);
    await source.get();
    next(NEVER);
    advance(30_000);
    const maps = await Promise.all([source.get(), source.get(), source.get()]);
    expect(maps).toEqual([brazil, brazil, brazil]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the old map through a failed background read, and says so after the call returns", async () => {
    const { source, warn, advance, next } = swr(brazilGlobal);
    await source.get();
    next(new Error("connection reset"));
    advance(30_000);
    expect(await source.get()).toEqual(brazil);
    expect(warn).not.toHaveBeenCalled();
    await flush();
    expect(warn.mock.calls[0]?.[0]).toMatch(/connection reset.*still serving the map read earlier/);
  });
});

describe("marketLoadTimeoutMs (W2, finding 3)", () => {
  it("is 60 s in development, where the first read starts Payload, and D10's 10 s otherwise", () => {
    expect(marketLoadTimeoutMs({ NODE_ENV: "development" })).toBe(DEV_MARKET_LOAD_TIMEOUT_MS);
    expect(DEV_MARKET_LOAD_TIMEOUT_MS).toBe(60_000);
    for (const NODE_ENV of ["production", "test", undefined]) {
      expect(marketLoadTimeoutMs(NODE_ENV === undefined ? {} : { NODE_ENV }), NODE_ENV).toBe(
        MARKET_LOAD_TIMEOUT_MS,
      );
    }
    expect(MARKET_LOAD_TIMEOUT_MS).toBe(10_000);
  });

  describe("as the source's loadTimeoutMs", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** A first read that answers after 13 s, as Payload's start did on W2's PC. */
    const slowFirstRead = (loadTimeoutMs?: number) => {
      const answer = new Promise<MarketsGlobal>((resolve) =>
        setTimeout(() => resolve(brazilGlobal), 13_000),
      );
      return setup(answer, undefined, loadTimeoutMs === undefined ? {} : { loadTimeoutMs });
    };

    it("lets a first read take 13 s with the development value", async () => {
      const { source } = slowFirstRead(DEV_MARKET_LOAD_TIMEOUT_MS);
      const read = source.get();
      await vi.advanceTimersByTimeAsync(13_000);
      expect(await read).toEqual(brazil);
    });

    it("gives up on it after 10 s by default", async () => {
      const { source } = slowFirstRead();
      const failure = expect(source.get()).rejects.toThrow(/no answer after 10 s/);
      await vi.advanceTimersByTimeAsync(MARKET_LOAD_TIMEOUT_MS);
      await failure;
    });
  });
});

describe("defaultAllowFallback", () => {
  const allow = (env: Parameters<typeof defaultAllowFallback>[0]) => {
    const rule = defaultAllowFallback(env);
    return { unusable: rule("unusable"), unreachable: rule("unreachable") };
  };

  it("allows an unusable global in development and test, not in production", () => {
    expect(allow({ NODE_ENV: "development" })).toEqual({ unusable: true, unreachable: false });
    expect(allow({ NODE_ENV: "test" })).toEqual({ unusable: true, unreachable: false });
    expect(allow({ NODE_ENV: "production" })).toEqual({ unusable: false, unreachable: false });
    expect(allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server" })).toEqual({
      unusable: false,
      unreachable: false,
    });
  });

  it("allows both while `next build` runs with no database configured (CI has no .env)", () => {
    expect(allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toEqual({
      unusable: true,
      unreachable: true,
    });
    expect(
      allow({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
        PAYLOAD_DATABASE_URL: "",
      }),
    ).toEqual({ unusable: true, unreachable: true });
  });

  it("does not hide an unreadable global from a build that has a database configured", () => {
    // A wrong password, a missing table or a bad secret must fail the build, not ship fixtures.
    const env = {
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      PAYLOAD_DATABASE_URL: "postgres://shop:secret@db.example/payload",
    };
    expect(allow(env)).toEqual({ unusable: true, unreachable: false });
  });

  it("reads the environment when asked, not when it is made", () => {
    const env: { NODE_ENV?: string } = { NODE_ENV: "development" };
    const rule = defaultAllowFallback(env);
    env.NODE_ENV = "production";
    expect(rule("unusable")).toBe(false);
  });
});
