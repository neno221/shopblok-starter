import { markets as seeded } from "@shopblok/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A global with nothing in it: unusable, so the fallback rule decides.
const loadMarketsGlobal = vi.fn(async () => ({ countries: [], languages: [] }));
vi.mock("./payload-loader", () => ({ loadMarketsGlobal }));

// Each test needs a new source: it keeps the last good map in the module.
async function load() {
  vi.resetModules();
  return import("./get-market-map");
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  loadMarketsGlobal.mockClear();
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

  it("has no fallback in production: an empty global is an error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    const { getMarketMap } = await load();
    await expect(getMarketMap()).rejects.toMatchObject({ name: "MarketMapError" });
  });
});
