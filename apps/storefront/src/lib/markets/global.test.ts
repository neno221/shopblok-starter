import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { mapFromGlobal, marketMapProblems, type MarketsGlobal } from "./global";
import { brazil, greeceTwoLanguages, mongolia, seeded, withDomains } from "./test-maps";

/** The seeded map as the global stores it: nulls where Payload has them, and no domain key. */
const seededGlobal: MarketsGlobal = {
  countries: seeded.countries.map((country) => ({ ...country, domain: null })),
  languages: seeded.languages.map((language) => ({ ...language, htmlLang: null })),
  primaryCountry: "cy",
  fallbackMarket: "en-us",
};

describe("mapFromGlobal", () => {
  it("gives the seeded map back from the seeded global (T13 seeds it, T10 reads it)", () => {
    expect(mapFromGlobal(seededGlobal)).toEqual(seeded);
  });

  it("turns an empty global into a map with nothing in it", () => {
    for (const doc of [{}, { countries: null, languages: null }]) {
      expect(mapFromGlobal(doc)).toEqual({
        countries: [],
        languages: [],
        primaryCountry: "",
        fallbackMarket: "",
      });
    }
  });

  it("opens a country unless it says enabled: false", () => {
    const map = mapFromGlobal({
      countries: [
        { code: "cy", enabled: true, languages: ["el"] },
        { code: "us", enabled: null, languages: ["en"] },
        { code: "de", languages: ["de"] },
        { code: "fr", enabled: false, languages: ["fr"] },
      ],
    });
    expect(map.countries.map((c) => [c.code, c.enabled])).toEqual([
      ["cy", true],
      ["us", true],
      ["de", true],
      ["fr", false],
    ]);
  });

  it("keeps a country's domain as a bare host, and a language's lang override", () => {
    const map = mapFromGlobal({
      countries: [{ code: "br", languages: ["pt"], domain: " https://Loja.com.br/ " }],
      languages: [{ code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" }],
    });
    expect(map.countries[0]).toMatchObject({ domain: "loja.com.br" });
    expect(map.languages[0]).toEqual({ code: "pt", medusaLocale: "pt-BR", htmlLang: "pt-BR" });
  });

  it("drops rows with no code, and leaves out an empty domain or override", () => {
    const map = mapFromGlobal({
      countries: [
        { code: "", languages: ["el"] },
        { code: "cy", languages: ["el"], domain: "" },
      ],
      languages: [
        { code: null, medusaLocale: "el-GR" },
        { code: "el", htmlLang: "" },
      ],
    });
    expect(map.countries).toEqual([{ code: "cy", enabled: true, languages: ["el"] }]);
    expect(map.languages).toEqual([{ code: "el", medusaLocale: "" }]);
  });
});

describe("marketMapProblems", () => {
  it.each([
    ["seeded", seeded],
    ["Brazil", brazil],
    ["Mongolia", mongolia],
    ["Greece, two languages", greeceTwoLanguages],
    ["domains", withDomains],
  ])("finds nothing wrong with %s", (_name, map) => {
    expect(marketMapProblems(map)).toEqual([]);
  });

  it("says why an empty global can't serve a shop, and what it is missing", () => {
    expect(marketMapProblems(mapFromGlobal({}))).toEqual([
      "no country is enabled",
      "the primary country is not set",
      "the fallback market is not set",
    ]);
  });

  const broken = (change: Partial<MarketMap>): string[] =>
    marketMapProblems({ ...seeded, ...change });

  it("flags a primary country that isn't open, and a fallback market that isn't a market", () => {
    expect(broken({ primaryCountry: "xx" })).toEqual([
      "the primary country xx is not an enabled country",
    ]);
    expect(broken({ fallbackMarket: "en-xx" })).toEqual([
      "the fallback market en-xx is not a market",
    ]);
    expect(broken({ primaryCountry: "" })).toEqual(["the primary country is not set"]);
  });

  it("flags a country with no language, and a language with no Medusa locale", () => {
    const noLanguage = seeded.countries.map((c) => (c.code === "de" ? { ...c, languages: [] } : c));
    expect(broken({ countries: noLanguage })).toEqual(["country de has no language"]);
    expect(broken({ languages: seeded.languages.filter((l) => l.code !== "fr") })).toEqual([
      "language fr has no Medusa locale under Languages",
    ]);
    const blank = seeded.languages.map((l) => (l.code === "el" ? { ...l, medusaLocale: "" } : l));
    expect(broken({ languages: blank })).toEqual([
      "language el has no Medusa locale under Languages",
    ]);
  });

  it("flags a Medusa locale that Medusa doesn't have (the check of step 3, on stored data)", () => {
    const wrong = seeded.languages.map((l) => (l.code === "el" ? { ...l, medusaLocale: "el" } : l));
    expect(broken({ languages: wrong })).toEqual(['language el: "el" is not a Medusa locale']);
  });

  it("does not ask for a Medusa locale of a language no open country uses", () => {
    const extra = [...seeded.languages, { code: "hr", medusaLocale: "" }];
    expect(broken({ languages: extra })).toEqual([]);
    // English is used by the US and the UK only; closing both leaves it unused.
    const closed = seeded.countries.map((c) =>
      c.code === "us" || c.code === "gb" ? { ...c, enabled: false } : c,
    );
    const without = seeded.languages.filter((l) => l.code !== "en");
    const problems = broken({ countries: closed, languages: without });
    expect(problems.filter((problem) => problem.includes("Medusa locale"))).toEqual([]);
  });

  it("flags a country, a language, a lang value or a domain that appears twice", () => {
    const twice = [...seeded.countries, { code: "us", enabled: true, languages: ["en"] }];
    expect(broken({ countries: twice })).toContain("country us is listed twice");
    const rows = [...seeded.languages, { code: "en", medusaLocale: "en-GB" }];
    expect(broken({ languages: rows })).toContain("language en is listed twice under Languages");

    const override = seeded.languages.map((l) =>
      l.code === "de" ? { ...l, htmlLang: "en-US" } : l,
    );
    expect(broken({ languages: override })).toContain("two markets use the lang value en-US");

    const shared = seeded.countries.map((c) =>
      c.code === "cy" || c.code === "ch" ? { ...c, domain: "shop.com" } : c,
    );
    expect(broken({ countries: shared })).toEqual(["the domain shop.com belongs to two countries"]);
  });
});
