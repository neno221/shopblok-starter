import { describe, expect, it, vi } from "vitest";
import type { MarketsGlobal } from "./global";
import {
  createMarketSource,
  defaultAllowFallback,
  MarketMapError,
  type FallbackReason,
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
// Half-filled: countries are there, the primary country and the fallback market are not.
const incompleteGlobal: MarketsGlobal = {
  countries: seeded.countries,
  languages: seeded.languages,
};

/** A source over a fake loader and a clock the test moves. */
function setup(
  first: MarketsGlobal | Error | null,
  allow: (reason: FallbackReason) => boolean = () => false,
) {
  const clock = { time: 1_000_000 };
  // What the next reads return, in order; the last answer repeats.
  let answers: (MarketsGlobal | Error | null)[] = [first];
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
  });
  return {
    source,
    load,
    warn,
    allowFallback,
    advance: (ms: number) => (clock.time += ms),
    next: (...more: (MarketsGlobal | Error | null)[]) => {
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

  it("reads again after clear()", async () => {
    const { source, load } = setup(seededGlobal);
    await source.get();
    source.clear();
    await source.get();
    expect(load).toHaveBeenCalledTimes(2);
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
    expect(message).toContain("the primary country is not set");
    expect(message).toContain("the fallback market is not set");
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

describe("defaultAllowFallback", () => {
  const allow = (env: { NODE_ENV?: string; NEXT_PHASE?: string }) => {
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

  it("allows both while `next build` runs, which is production with no database in CI", () => {
    expect(allow({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toEqual({
      unusable: true,
      unreachable: true,
    });
  });

  it("reads the environment when asked, not when it is made", () => {
    const env: { NODE_ENV?: string } = { NODE_ENV: "development" };
    const rule = defaultAllowFallback(env);
    env.NODE_ENV = "production";
    expect(rule("unusable")).toBe(false);
  });
});
