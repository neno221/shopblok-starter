import { beforeEach, describe, expect, it, vi } from "vitest";
import { seeded } from "./test-maps";

const next = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
const maps = vi.hoisted(() => ({ getMarketMap: vi.fn(), getFreshMarketMap: vi.fn() }));
vi.mock("next/cache", () => next);
vi.mock("./get-market-map", () => maps);

const { getRenderMarketMap } = await import("./cached-market-map");

beforeEach(() => {
  vi.clearAllMocks();
  maps.getFreshMarketMap.mockResolvedValue(seeded);
});

describe("getRenderMarketMap (T71)", () => {
  it("computes its entry from the global as it is now, not the 30 s in-process map", async () => {
    expect(await getRenderMarketMap()).toBe(seeded);
    expect(maps.getFreshMarketMap).toHaveBeenCalledOnce();
    expect(maps.getMarketMap).not.toHaveBeenCalled();
  });

  it("is tagged `global:markets`, which a save of the global expires, and kept 30 s", async () => {
    await getRenderMarketMap();
    expect(next.cacheTag).toHaveBeenCalledWith("global:markets");
    expect(next.cacheLife).toHaveBeenCalledWith(expect.objectContaining({ revalidate: 30 }));
  });
});
