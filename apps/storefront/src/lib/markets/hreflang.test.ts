import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { hreflangAlternates } from "./hreflang";
import {
  brazil,
  brazilAndPortugal,
  cyprusGainsEnglish,
  germanyClosed,
  greeceOnly,
  greeceTwoLanguages,
  mongolia,
  seeded,
  usOnly,
  withDomains,
} from "./test-maps";

describe("hreflangAlternates: SPEC §12, on the seeded map", () => {
  it("lists every market under its lang value, then x-default for the fallback market", () => {
    // SPEC §12 writes the roots as `/us/`, `/ch/`: Next serves them without the slash.
    const expected = {
      "el-CY": "/",
      "en-US": "/us",
      "en-GB": "/gb",
      "de-DE": "/de",
      "fr-FR": "/fr",
      "de-CH": "/ch",
      "fr-CH": "/ch/fr",
      "x-default": "/us",
    };
    const alternates = hreflangAlternates("/", seeded);
    expect(alternates).toEqual(expected);
    // The order is the map's, with x-default last.
    expect(Object.keys(alternates)).toEqual(Object.keys(expected));
  });

  it("carries the page's path into every alternate", () => {
    expect(hreflangAlternates("/products/shirt", seeded)).toEqual({
      "el-CY": "/products/shirt",
      "en-US": "/us/products/shirt",
      "en-GB": "/gb/products/shirt",
      "de-DE": "/de/products/shirt",
      "fr-FR": "/fr/products/shirt",
      "de-CH": "/ch/products/shirt",
      "fr-CH": "/ch/fr/products/shirt",
      "x-default": "/us/products/shirt",
    });
  });

  it("takes a path per market, leaving out a market where the page has none (a CMS page, D80)", () => {
    const paths: Record<string, string | null> = { el: "/sxetika/omada", de: null };
    const pathIn = (language: string) => (language in paths ? paths[language]! : "/about/team");
    expect(hreflangAlternates((market) => pathIn(market.language), seeded)).toEqual({
      "el-CY": "/sxetika/omada",
      "en-US": "/us/about/team",
      "en-GB": "/gb/about/team",
      "fr-FR": "/fr/about/team",
      "fr-CH": "/ch/fr/about/team",
      "x-default": "/us/about/team",
    });
  });

  it("points x-default at the fallback market, wherever it is", () => {
    const toGreek: MarketMap = { ...seeded, fallbackMarket: "el-cy" };
    expect(hreflangAlternates("/", toGreek)["x-default"]).toBe("/");
    const toFrench: MarketMap = { ...seeded, fallbackMarket: "fr-ch" };
    expect(hreflangAlternates("/store", toFrench)["x-default"]).toBe("/ch/fr/store");
  });

  it("points x-default at the primary market when the fallback setting is stale", () => {
    expect(hreflangAlternates("/", { ...seeded, fallbackMarket: "en-xx" })["x-default"]).toBe("/");
  });

  it("leaves a closed country out", () => {
    const alternates = hreflangAlternates("/", germanyClosed);
    expect(Object.keys(alternates)).toEqual([
      "el-CY",
      "en-US",
      "en-GB",
      "fr-FR",
      "de-CH",
      "fr-CH",
      "x-default",
    ]);
  });
});

describe("hreflangAlternates: other maps", () => {
  it("adds /cy/en/ when Cyprus gains English", () => {
    expect(hreflangAlternates("/", cyprusGainsEnglish)).toMatchObject({
      "el-CY": "/",
      "en-CY": "/cy/en",
      "en-US": "/us",
    });
  });

  it("lists the countries on their own domains with absolute URLs (SPEC §12)", () => {
    expect(hreflangAlternates("/store", withDomains)).toEqual({
      "el-CY": "https://shop.com.cy/store",
      "en-US": "/us/store",
      "en-GB": "/gb/store",
      "de-DE": "/de/store",
      "fr-FR": "/fr/store",
      "de-CH": "https://shop.ch/store",
      "fr-CH": "https://shop.ch/fr/store",
      "x-default": "/us/store",
    });
  });

  it("lists a lang value once when two markets share it, for the first in the map's order", () => {
    expect(hreflangAlternates("/store", brazilAndPortugal)).toEqual({
      "pt-BR": "/store",
      "x-default": "/store",
    });
  });

  it("lists the languages of a store with one country", () => {
    expect(hreflangAlternates("/store", greeceTwoLanguages)).toEqual({
      "el-GR": "/store",
      "en-GR": "/en/store",
      "x-default": "/store",
    });
  });
});

describe("hreflangAlternates: a single market has none (SPEC §12)", () => {
  // D17's four shops: one country and one language each, so one market, with no code change.
  it.each([
    ["Brazil", brazil],
    ["Mongolia", mongolia],
    ["US only", usOnly],
    ["Greece only", greeceOnly],
  ])("%s", (_name, map) => {
    expect(hreflangAlternates("/", map)).toEqual({});
    expect(hreflangAlternates("/products/shirt", map)).toEqual({});
  });

  it("also holds when other countries are closed", () => {
    const onlyUs: MarketMap = {
      ...seeded,
      countries: seeded.countries.map((c) => (c.code === "us" ? c : { ...c, enabled: false })),
      primaryCountry: "us",
    };
    expect(hreflangAlternates("/", onlyUs)).toEqual({});
  });
});
