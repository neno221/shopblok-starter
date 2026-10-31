import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "./types";
import {
  createMarketSource,
  defaultAllowFallback,
  DEV_MARKET_LOAD_TIMEOUT_MS,
  MARKET_EXPIRE_GAP_MS,
  MARKET_LOAD_TIMEOUT_MS,
  MarketMapError,
  marketLoadTimeoutMs,
  type FallbackReason,
  type MarketSourceOptions,
} from "./source";
import { brazil, seeded } from "./test-maps";

// Half-filled: the countries are there, but no language has a Medusa locale yet.
const incomplete: MarketMap = { ...seeded, languages: [] };
const empty: MarketMap = { countries: [], languages: [], primaryCountry: "", fallbackMarket: "" };

/** An answer for a read that never settles (a database host gone silent). */
const NEVER = new Promise<never>(() => {});
type Answer = MarketMap | Error | Promise<MarketMap>;

/** A source over a fake loader and a clock the test moves. */
function setup(
  first: Answer,
  allow: (reason: FallbackReason) => boolean = () => false,
  extra: Pick<MarketSourceOptions, "staleWhileRevalidate" | "firstLoadTimeoutMs"> = {},
) {
  const clock = { time: 1_000_000 };
  // What the next reads return, in order; the last answer repeats.
  let answers: Answer[] = [first];
  const load = vi.fn(async () => {
    const answer = answers[0]!;
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
  it("reads the map once and serves the map from memory for 30 s", async () => {
    const { source, load, advance } = setup(seeded);
    const first = await source.get();
    expect(first).toEqual(seeded);
    advance(29_999);
    expect(await source.get()).toBe(first);
    expect(await source.get()).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reads again once 30 s are up, and uses what it finds", async () => {
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(30_000);
    next(brazil);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
    advance(29_999);
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one read between callers that arrive while it runs", async () => {
    const { source, load } = setup(seeded);
    const maps = await Promise.all([source.get(), source.get(), source.get()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(maps[0]).toBe(maps[1]);
    expect(maps[1]).toBe(maps[2]);
  });

  it("keeps a fallback map for the TTL too, so a backend that is down isn't read on every request", async () => {
    const { source, load, advance } = setup(empty, () => true);
    await source.get();
    advance(10_000);
    await source.get();
    expect(load).toHaveBeenCalledTimes(1);
    advance(20_000);
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("fresh: the map as it is now (T71)", () => {
  it("reads past the TTL, and `get()` then serves what it read", async () => {
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(1_000);
    next(brazil);
    expect(await source.fresh()).toEqual(brazil);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never joins a read that started before it: that one may hold the map before a save", async () => {
    const { source, load, next } = setup(seeded);
    next(seeded, brazil);
    const [read, fresh] = await Promise.all([source.get(), source.fresh()]);
    expect(load).toHaveBeenCalledTimes(2);
    expect(read).toEqual(seeded);
    expect(fresh).toEqual(brazil);
  });

  it("is not overtaken by an earlier read that ends after it", async () => {
    let answerEarlier: (map: MarketMap) => void = () => {};
    const earlier = new Promise<MarketMap>((resolve) => (answerEarlier = resolve));
    const { source, advance, next } = setup(seeded);
    await source.get();
    advance(30_000);
    next(earlier, brazil);
    const stale = source.get();
    expect(await source.fresh()).toEqual(brazil);
    answerEarlier(seeded);
    expect(await stale).toEqual(seeded);
    expect(await source.get()).toEqual(brazil);
  });

  it("keeps the last good map when the read fails, as `get()` does", async () => {
    const { source, warn, next } = setup(seeded);
    const first = await source.get();
    next(new Error("connection refused"));
    expect(await source.fresh()).toBe(first);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("still serving the map read earlier"),
    );
  });
});

/** A read the test ends itself: `answer` settles it, `fail` makes it an error. */
function pending() {
  let answer: (map: MarketMap) => void = () => {};
  let fail: (error: Error) => void = () => {};
  const read = new Promise<MarketMap>((resolve, reject) => {
    answer = resolve;
    fail = reject;
  });
  return { read, answer, fail };
}

describe("expire: the map changed in Medusa (T75 review, item 1)", () => {
  it("makes the map held stale at once: the next `get()` reads again, inside the TTL", async () => {
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(1_000);
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(1);
    next(brazil);
    source.expire();
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
    // The new map is kept for a TTL of its own.
    advance(20_000);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not join a read that started before the save", async () => {
    const older = pending();
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(30_000);
    next(older.read, brazil);
    const before = source.get();
    source.expire();
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(3);
    // The old read ends last: it answers its own caller and does not replace the new map.
    older.answer(seeded);
    expect(await before).toEqual(seeded);
    expect(await source.get()).toEqual(brazil);
  });

  it("lets callers after the save share the new read, whichever read ends first", async () => {
    const older = pending();
    const newer = pending();
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(30_000);
    next(older.read, newer.read);
    const before = source.get();
    source.expire();
    const first = source.get();
    // The old read ends while the new one runs: it must not clear the new one's place.
    older.answer(seeded);
    await before;
    const second = source.get();
    newer.answer(brazil);
    expect(await first).toEqual(brazil);
    expect(await second).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not keep a read that began before the save, even when it ends before any new one", async () => {
    const older = pending();
    const { source, load, advance, next } = setup(seeded);
    await source.get();
    advance(30_000);
    next(older.read);
    const before = source.get();
    source.expire();
    older.answer(seeded);
    expect(await before).toEqual(seeded);
    next(brazil);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("keeps the map held as the last good one: an outage right after a save still serves it", async () => {
    const { source, warn, next } = setup(seeded);
    await source.get();
    next(new Error("connection refused"));
    source.expire();
    expect(await source.get()).toEqual(seeded);
    expect(warn.mock.calls[0]?.[0]).toMatch(/connection refused.*still serving the map read earlier/);
  });

  it("with no map held yet only stops a read in flight from being kept", async () => {
    const older = pending();
    const { source, load, next } = setup(seeded);
    next(older.read, brazil);
    const first = source.get();
    source.expire();
    older.answer(seeded);
    expect(await first).toEqual(seeded);
    expect(await source.get()).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("makes a source that serves stale maps (the proxy's) read again for the next caller", async () => {
    const { source, load, next } = setup(seeded, () => false, { staleWhileRevalidate: true });
    await source.get();
    next(brazil);
    source.expire();
    // The caller gets the stale map and the read renews it.
    expect(await source.get()).toEqual(seeded);
    await vi.waitFor(async () => expect(await source.get()).toEqual(brazil));
    expect(load).toHaveBeenCalledTimes(2);
  });

  describe("a flood of calls (the gap)", () => {
    it("costs one read: calls inside the gap do not discard the read they follow", async () => {
      const { source, load, next } = setup(seeded);
      await source.get();
      next(brazil);
      source.expire();
      const reads = [source.get()];
      for (let call = 0; call < 50; call++) {
        source.expire();
        reads.push(source.get());
      }
      expect((await Promise.all(reads)).every((map) => map === brazil)).toBe(true);
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("is not lost: a save inside the gap shows once the gap has passed", async () => {
      const { source, load, advance, next } = setup(seeded);
      await source.get();
      next(brazil);
      source.expire();
      expect(await source.get()).toEqual(brazil);
      // A second save a moment later: the read above may have missed it.
      advance(MARKET_EXPIRE_GAP_MS / 2);
      source.expire();
      expect(load).toHaveBeenCalledTimes(2);
      next(seeded);
      advance(MARKET_EXPIRE_GAP_MS);
      expect(await source.get()).toEqual(seeded);
      expect(load).toHaveBeenCalledTimes(3);
    });

    it("takes a call after the gap at once", async () => {
      const { source, load, advance, next } = setup(seeded);
      await source.get();
      source.expire();
      await source.get();
      advance(MARKET_EXPIRE_GAP_MS);
      next(brazil);
      source.expire();
      expect(await source.get()).toEqual(brazil);
      expect(load).toHaveBeenCalledTimes(3);
    });
  });
});

describe("getMarketMap: an empty or incomplete map", () => {
  it("falls back to the fixtures where allowed, and says so", async () => {
    const { source, warn, allowFallback } = setup(empty, (reason) => reason === "unusable");
    expect(await source.get()).toBe(seeded);
    expect(allowFallback).toHaveBeenCalledWith("unusable");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(
      /market map is empty: no country is enabled.*seeded fixtures/,
    );
  });

  it("falls back for a half-filled map, naming what is missing", async () => {
    const { source, warn } = setup(incomplete, () => true);
    expect(await source.get()).toBe(seeded);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("incomplete");
    expect(message).toContain("language el has no Medusa locale");
  });

  it("serves a map with no primary country or fallback market: both have a fallback", async () => {
    const { source, warn } = setup({
      ...seeded,
      primaryCountry: "",
      fallbackMarket: "",
    });
    expect(await source.get()).toEqual({ ...seeded, primaryCountry: "", fallbackMarket: "" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("is an error where the fallback is not allowed (production), and says what to do", async () => {
    const { source, warn } = setup(empty);
    const attempt = source.get();
    await expect(attempt).rejects.toBeInstanceOf(MarketMapError);
    await expect(attempt).rejects.toThrow(
      /empty.*Open a country in Medusa Admin.*or run pnpm bootstrap/,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not cache the error: the next call reads again, and a fixed map is used", async () => {
    const { source, load, next } = setup(empty);
    await expect(source.get()).rejects.toBeInstanceOf(MarketMapError);
    next(seeded);
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps serving the last good map when the map is later saved half-filled", async () => {
    const { source, advance, next, warn } = setup(brazil);
    await source.get();
    advance(30_000);
    next(incomplete);
    expect(await source.get()).toEqual(brazil);
    expect(warn.mock.calls[0]?.[0]).toMatch(/incomplete.*still serving the map read earlier/);
  });
});

describe("getMarketMap: a map that can't be read", () => {
  it("fails where the fallback is not allowed, with the original error", async () => {
    const down = new Error("connect ECONNREFUSED 127.0.0.1:9000");
    const { source, allowFallback } = setup(down, (reason) => reason === "unusable");
    await expect(source.get()).rejects.toBe(down);
    expect(allowFallback).toHaveBeenCalledWith("unreachable");
  });

  it("falls back where it is allowed (`next build` in CI has no backend)", async () => {
    const { source, warn } = setup(new Error("no backend"), (reason) => reason === "unreachable");
    expect(await source.get()).toBe(seeded);
    expect(warn.mock.calls[0]?.[0]).toMatch(/could not be read \(no backend\).*seeded fixtures/);
  });

  it("keeps serving the last good map through an outage, and recovers", async () => {
    const { source, advance, next, load, warn } = setup(brazil);
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
    next(seeded);
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
    const { source, load, warn, advance, next } = setup(brazil);
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
    const { source, load, advance, next } = setup(brazil);
    await source.get();
    next(NEVER);
    advance(30_000);
    await getAfterTimeout(source);
    advance(30_000);
    expect(await getAfterTimeout(source)).toEqual(brazil);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reads again once the silent read has ended", async () => {
    const { source, load, advance, next } = setup(brazil);
    await source.get();
    next(new Promise<never>((_, fail) => setTimeout(() => fail(new Error("reset")), 20_000)));
    advance(30_000);
    await getAfterTimeout(source);
    await vi.advanceTimersByTimeAsync(20_000);
    next(seeded);
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
    const { source } = setup(seeded);
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
    const { source, load, advance, next } = swr(brazil);
    await source.get();
    advance(30_000);
    next(seeded);
    expect(await source.get()).toEqual(brazil);
    await flush();
    expect(await source.get()).toEqual(seeded);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not make callers wait for a read that never answers, one read for all of them", async () => {
    const { source, load, advance, next } = swr(brazil);
    await source.get();
    next(NEVER);
    advance(30_000);
    const maps = await Promise.all([source.get(), source.get(), source.get()]);
    expect(maps).toEqual([brazil, brazil, brazil]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the old map through a failed background read, and says so after the call returns", async () => {
    const { source, warn, advance, next } = swr(brazil);
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
  it("is 60 s in development, where the first read waits for a compile, and D10's 10 s otherwise", () => {
    expect(marketLoadTimeoutMs({ NODE_ENV: "development" })).toBe(DEV_MARKET_LOAD_TIMEOUT_MS);
    expect(DEV_MARKET_LOAD_TIMEOUT_MS).toBe(60_000);
    for (const NODE_ENV of ["production", "test", undefined]) {
      expect(marketLoadTimeoutMs(NODE_ENV === undefined ? {} : { NODE_ENV }), NODE_ENV).toBe(
        MARKET_LOAD_TIMEOUT_MS,
      );
    }
    expect(MARKET_LOAD_TIMEOUT_MS).toBe(10_000);
  });

  describe("as the source's firstLoadTimeoutMs", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** A first read that answers after 13 s, as the dev server's first compile did on W2's PC. */
    const slowFirstRead = (firstLoadTimeoutMs?: number) => {
      const answer = new Promise<MarketMap>((resolve) => setTimeout(() => resolve(brazil), 13_000));
      const extra = firstLoadTimeoutMs === undefined ? {} : { firstLoadTimeoutMs };
      return setup(answer, undefined, extra);
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

    it("keeps D10's 10 s for the reads after the first, development value or not", async () => {
      const { source, advance, next, warn } = setup(brazil, undefined, {
        firstLoadTimeoutMs: DEV_MARKET_LOAD_TIMEOUT_MS,
      });
      expect(await source.get()).toEqual(brazil);
      next(NEVER);
      advance(30_000);
      const read = source.get();
      await vi.advanceTimersByTimeAsync(MARKET_LOAD_TIMEOUT_MS);
      expect(await read).toEqual(brazil);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/no answer after 10 s/));
    });
  });
});

describe("defaultAllowFallback (D94)", () => {
  const allow = (env: Parameters<typeof defaultAllowFallback>[0]) => {
    const rule = defaultAllowFallback(env);
    return { unusable: rule("unusable"), unreachable: rule("unreachable") };
  };
  const configured = {
    MEDUSA_BACKEND_URL: "https://api.example.com",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_abc",
  };

  it("allows an unusable map in development and test, not in production", () => {
    expect(allow({ NODE_ENV: "development" })).toEqual({ unusable: true, unreachable: false });
    expect(allow({ NODE_ENV: "test" })).toEqual({ unusable: true, unreachable: false });
    expect(allow({ NODE_ENV: "production" })).toEqual({ unusable: false, unreachable: false });
    expect(allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server" })).toEqual({
      unusable: false,
      unreachable: false,
    });
  });

  it("allows both while `next build` runs with no Medusa configured (CI has no .env)", () => {
    expect(allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toEqual({
      unusable: true,
      unreachable: true,
    });
    // Blank values are unset, as `medusaEnv()` reads them; one of the two missing is not configured.
    for (const env of [
      { MEDUSA_BACKEND_URL: "", NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "  " },
      { MEDUSA_BACKEND_URL: "http://localhost:9000" },
      { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_abc" },
    ]) {
      expect(
        allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", ...env }),
      ).toEqual({ unusable: true, unreachable: true });
    }
  });

  it("does not hide an unreadable map from a build that has Medusa configured", () => {
    // A backend that is down, a wrong key or a missing plugin must fail the build, not ship fixtures.
    const env = { NODE_ENV: "production", NEXT_PHASE: "phase-production-build", ...configured };
    expect(allow(env)).toEqual({ unusable: true, unreachable: false });
  });

  it("does not care whether a database is configured: Payload no longer holds the map", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      PAYLOAD_DATABASE_URL: "postgres://shop:secret@db.example/payload",
    };
    expect(allow(env)).toEqual({ unusable: true, unreachable: true });
  });

  it("reads the environment when asked, not when it is made", () => {
    const env: { NODE_ENV?: string } = { NODE_ENV: "development" };
    const rule = defaultAllowFallback(env);
    env.NODE_ENV = "production";
    expect(rule("unusable")).toBe(false);
  });
});
