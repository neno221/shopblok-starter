import type * as ReactModule from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { getCurrentMarket as GetCurrentMarket } from "./current-market";
import { mongolia, seeded } from "./markets/test-maps";
import type { MarketMap } from "./markets/types";

const state = vi.hoisted(() => ({
  key: "",
  map: undefined as unknown as MarketMap,
  rootParamReads: 0,
  mapReads: 0,
}));
vi.mock("next/root-params", () => ({
  market: async () => {
    state.rootParamReads += 1;
    return state.key;
  },
}));
vi.mock("./markets/cached-market-map", () => ({
  getRenderMarketMap: async () => {
    state.mapReads += 1;
    return state.map;
  },
}));
// React's `cache` memoizes per request inside a Server Component render and is a pass-through
// anywhere else, which includes Vitest. This stands in for one request: the first call's result,
// rejection included, answers every later call of the same function.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactModule>()),
  cache: <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
    let held: { result: Result } | undefined;
    return (...args: Args): Result => (held ??= { result: fn(...args) }).result;
  },
}));

let getCurrentMarket: typeof GetCurrentMarket;

beforeEach(async () => {
  // A new module is a new request for the stand-in above.
  vi.resetModules();
  ({ getCurrentMarket } = await import("./current-market"));
  state.rootParamReads = 0;
  state.mapReads = 0;
  state.map = seeded;
});
afterEach(() => {
  state.key = "";
});

describe("getCurrentMarket (PR 70 review, item 7)", () => {
  it("reads the root param and the map once for the layout, the page and next-intl", async () => {
    state.key = "el-cy";
    const [layout, page, intl] = await Promise.all([
      getCurrentMarket(),
      getCurrentMarket(),
      getCurrentMarket(),
    ]);
    expect(layout.key).toBe("el-cy");
    expect(page).toBe(layout);
    expect(intl).toBe(layout);
    expect(state.rootParamReads).toBe(1);
    expect(state.mapReads).toBe(1);
  });

  it("answers an unknown key with the same 404 to every reader, after one lookup", async () => {
    state.key = "xx-yy";
    const reads = await Promise.allSettled([getCurrentMarket(), getCurrentMarket()]);
    for (const read of reads) {
      expect(read).toMatchObject({
        status: "rejected",
        reason: { digest: "NEXT_HTTP_ERROR_FALLBACK;404" },
      });
    }
    expect(state.mapReads).toBe(1);
  });

  it("gives a language with no catalog the English messages' locale and the fixed time zone", async () => {
    state.key = "mn-mn";
    state.map = mongolia;
    expect(await getCurrentMarket()).toMatchObject({
      key: "mn-mn",
      htmlLang: "mn-MN",
      locale: "en",
      timeZone: "UTC",
    });
  });
});
