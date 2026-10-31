import { markets as seeded } from "@shopblok/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "./types";
import { brazil } from "./test-maps";

// A map with nothing in it: unusable, so the fallback rule decides.
const loadMarketMap = vi.fn(async (): Promise<MarketMap> => ({
  countries: [],
  languages: [],
  primaryCountry: "",
  fallbackMarket: "",
}));
vi.mock("./medusa-loader", () => ({ loadMarketMap }));

// Each test needs a new source: it keeps the last good map in the module.
async function load() {
  vi.resetModules();
  return import("./get-market-map");
}

beforeEach(() => {
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

describe("getMarketMap: how long the first read may take (W2, finding 3)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A slow first read in `next dev`: the map arrives after `ms`. Brazil, so no fallback hides. */
  function answerAfter(ms: number) {
    loadMarketMap.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(brazil), ms)),
    );
  }

  it("waits in development for a first read that takes 13 s", async () => {
    vi.stubEnv("NODE_ENV", "development");
    answerAfter(13_000);
    const { getMarketMap } = await load();
    const read = getMarketMap();
    await vi.advanceTimersByTimeAsync(13_000);
    expect(await read).toEqual(brazil);
  });

  it("keeps D10's 10 s in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    answerAfter(13_000);
    const { getMarketMap } = await load();
    const failure = expect(getMarketMap()).rejects.toThrow(/no answer after 10 s/);
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
  });
});
