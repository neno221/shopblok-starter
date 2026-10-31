import { markets as seeded } from "@shopblok/fixtures";
import type { Locale, PayloadRequest } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketMap } from "../lib/markets/types";
import {
  FAILED_READ_TTL_MS,
  clearAvailableLocalesMemory,
  enabledLanguages,
  filterAvailableLocales,
  openLanguages,
  pickAvailableLocales,
} from "./filter-available-locales";

// The map is Medusa's (D95); `market-map.ts` reaches it through a lazy import of `get-market-map`.
const getMarketMap = vi.hoisted(() => vi.fn());
vi.mock("../lib/markets/get-market-map", () => ({ getMarketMap }));

const locales: Locale[] = ["en", "el", "de", "fr", "pt"].map((code) => ({ code, label: code }));
const codes = (list: Locale[]) => list.map((locale) => locale.code);

/** A map with these countries open or closed, each with its languages. */
const mapOf = (
  ...countries: [code: string, enabled: boolean, languages: string[]][]
): MarketMap => ({
  countries: countries.map(([code, enabled, languages]) => ({ code, enabled, languages })),
  languages: [],
  primaryCountry: "",
  fallbackMarket: "",
});

describe("enabledLanguages", () => {
  it("collects the languages of the open countries", () => {
    const map = mapOf(["cy", true, ["el"]], ["de", true, ["de", "fr"]], ["br", false, ["pt"]]);
    expect([...enabledLanguages(map)].sort()).toEqual(["de", "el", "fr"]);
  });

  it("treats a map with no country as nothing enabled", () => {
    expect(enabledLanguages(mapOf()).size).toBe(0);
  });

  it("reads the seeded map's languages", () => {
    expect([...enabledLanguages(seeded)].sort()).toEqual(["de", "el", "en", "fr"]);
  });
});

describe("pickAvailableLocales", () => {
  it("keeps the enabled languages and English, in the config's order", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["fr", "el"])))).toEqual(["en", "el", "fr"]);
  });

  it("always offers English, even when only another language is enabled", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["el"])))).toEqual(["en", "el"]);
  });

  it("offers English alone when nothing is enabled, never an empty list", () => {
    expect(codes(pickAvailableLocales(locales, new Set()))).toEqual(["en"]);
  });

  it("still returns something when the list has no English", () => {
    const noEnglish = locales.filter((locale) => locale.code !== "en");
    expect(codes(pickAvailableLocales(noEnglish, new Set()))).toEqual(["el"]);
  });

  it("ignores an enabled language that is not preloaded", () => {
    expect(codes(pickAvailableLocales(locales, new Set(["ga"])))).toEqual(["en"]);
  });
});

const warn = vi.fn();
const requestOf = () => ({ payload: { logger: { warn } } }) as unknown as PayloadRequest;
const offered = async () => codes(await filterAvailableLocales({ locales, req: requestOf() }));

describe("filterAvailableLocales (D95)", () => {
  let now = 0;
  beforeEach(() => {
    clearAvailableLocalesMemory();
    warn.mockReset();
    getMarketMap.mockReset();
    now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });
  afterEach(() => vi.restoreAllMocks());

  it("offers the languages of the open markets in Medusa's map, and English", async () => {
    getMarketMap.mockResolvedValue(mapOf(["cy", true, ["el"]], ["de", true, ["de"]]));
    expect(await offered()).toEqual(["en", "el", "de"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("follows the map: a language opened in Medusa shows up on the next call", async () => {
    getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]]));
    expect(await offered()).toEqual(["en", "el"]);
    // `getMarketMap` has the 30 s cache; this module adds none on top of it.
    getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]], ["at", true, ["de"]]));
    expect(await offered()).toEqual(["en", "el", "de"]);
  });

  describe("when Medusa cannot be read: it never throws (a Medusa outage cannot take the admin down)", () => {
    it("offers the default locale alone, with a warning, before any map was read", async () => {
      getMarketMap.mockRejectedValue(new Error("Medusa at http://localhost:9000 did not answer"));
      expect(await offered()).toEqual(["en"]);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/did not answer.*default locale only/);
    });

    it("keeps the languages of the last good map, with a warning", async () => {
      getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]], ["fr", true, ["fr"]]));
      expect(await offered()).toEqual(["en", "el", "fr"]);
      getMarketMap.mockRejectedValue(new Error("connection reset"));
      expect(await offered()).toEqual(["en", "el", "fr"]);
      expect(warn.mock.calls[0]?.[0]).toMatch(/connection reset.*keeps the languages read earlier/);
    });

    it("does not ask again for a while, so one page's three calls wait for one failure", async () => {
      getMarketMap.mockRejectedValue(new Error("timeout"));
      await offered();
      await offered();
      await offered();
      expect(getMarketMap).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledOnce();
      now += FAILED_READ_TTL_MS - 1;
      await offered();
      expect(getMarketMap).toHaveBeenCalledTimes(1);
      now += 1;
      await offered();
      expect(getMarketMap).toHaveBeenCalledTimes(2);
    });

    it("recovers: the next successful read replaces the fallback", async () => {
      getMarketMap.mockRejectedValueOnce(new Error("down"));
      expect(await offered()).toEqual(["en"]);
      now += FAILED_READ_TTL_MS;
      getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]]));
      expect(await offered()).toEqual(["en", "el"]);
      getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]], ["de", true, ["de"]]));
      expect(await offered()).toEqual(["en", "el", "de"]);
    });

    it("survives a failure that is not an Error", async () => {
      getMarketMap.mockRejectedValue("nope");
      expect(await offered()).toEqual(["en"]);
      expect(warn.mock.calls[0]?.[0]).toContain("nope");
    });

    it("survives a module that cannot be imported at all", async () => {
      const languages = await openLanguages(warn, () => Promise.reject(new Error("no module")));
      expect([...languages]).toEqual([]);
      expect(warn).toHaveBeenCalledOnce();
    });
  });

  it("keeps its memory where every copy of the module sees it (the layout and the page load their own)", async () => {
    getMarketMap.mockResolvedValueOnce(mapOf(["cy", true, ["el"]]));
    await offered();
    vi.resetModules();
    const other = await import("./filter-available-locales");
    getMarketMap.mockRejectedValue(new Error("down"));
    const result = await other.filterAvailableLocales({ locales, req: requestOf() });
    expect(codes(result)).toEqual(["en", "el"]);
  });
});
