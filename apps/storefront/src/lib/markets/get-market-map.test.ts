import { markets as seeded } from "@shopblok/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "./types";
import { clearSharedMarketSource, expireMarketMap } from "./shared-source";
import { brazil } from "./test-maps";

// A map with nothing in it: unusable, so the fallback rule decides.
const loadMarketMap = vi.fn(async (): Promise<MarketMap> => ({
  countries: [],
  languages: [],
  primaryCountry: "",
  fallbackMarket: "",
}));
vi.mock("./medusa-loader", () => ({ loadMarketMap }));

// A new copy of the module, as Next makes for a route bundle or a lazy import. The source is shared
// by every copy, so a test that needs a new source clears it first (`fresh`).
async function copy() {
  vi.resetModules();
  return import("./get-market-map");
}
async function load() {
  clearSharedMarketSource();
  return copy();
}

beforeEach(() => {
  clearSharedMarketSource();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  loadMarketMap.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getMarketMap and the environment (lib/env.ts)", () => {
  it("falls back to the seeded fixtures in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getMarketMap } = await load();
    expect(await getMarketMap()).toEqual(seeded);
  });

  it("falls back while next build runs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const { getMarketMap } = await load();
    expect(await getMarketMap()).toEqual(seeded);
  });

  it("has no fallback in production: an empty map is an error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    const { getMarketMap } = await load();
    await expect(getMarketMap()).rejects.toMatchObject({ name: "MarketMapError" });
  });
});

describe("getMarketMap: how long a read may take", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A slow first read: the map arrives after `ms`. Brazil, so no fallback hides. */
  function answerAfter(ms: number) {
    loadMarketMap.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(brazil), ms)),
    );
  }

  // The 60 s first read of `next dev` is the proxy's (it waits for the map route to compile).
  // This source calls Medusa, whose SDK call is capped at 10 s, so 60 s here could never apply
  // (T75 review, item 4).
  it.each(["development", "production"])("gives up after D10's 10 s in %s", async (nodeEnv) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    answerAfter(13_000);
    const { getMarketMap } = await load();
    const failure = expect(getMarketMap()).rejects.toThrow(/no answer after 10 s/);
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
  });
});

describe("getMarketMap: one source per process (T75 review, item 1)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    loadMarketMap.mockResolvedValue(brazil);
  });

  it("is shared by two copies of the module: the admin's lazy import reads what a route read", async () => {
    const route = await load();
    const admin = await copy();
    expect(admin).not.toBe(route);
    expect(await route.getMarketMap()).toEqual(brazil);
    expect(await admin.getMarketMap()).toEqual(brazil);
    expect(loadMarketMap).toHaveBeenCalledTimes(1);
  });

  it("is expired through the shared source, from wherever the webhook is handled", async () => {
    const { getMarketMap } = await load();
    await getMarketMap();
    // `/api/revalidate` imports `shared-source` and never this module.
    expireMarketMap();
    await getMarketMap();
    expect(loadMarketMap).toHaveBeenCalledTimes(2);
  });

  it("expires nothing, and fails nothing, before the map was ever read", () => {
    clearSharedMarketSource();
    expect(() => expireMarketMap()).not.toThrow();
  });
});
