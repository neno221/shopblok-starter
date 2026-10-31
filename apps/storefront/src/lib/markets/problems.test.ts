import type { MarketMap } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { marketMapProblems, toMarketMap } from "./problems";
import {
  brazil,
  brazilAndPortugal,
  greeceTwoLanguages,
  mongolia,
  seeded,
  withDomains,
} from "./test-maps";

describe("marketMapProblems", () => {
  it.each([
    ["seeded", seeded],
    ["Brazil", brazil],
    ["Mongolia", mongolia],
    ["Greece, two languages", greeceTwoLanguages],
    ["domains", withDomains],
    // Two markets share one lang value, because a language override applies to every country.
    ["Brazil and Portugal", brazilAndPortugal],
  ])("finds nothing wrong with %s", (_name, map) => {
    expect(marketMapProblems(map)).toEqual([]);
  });

  it("says why an empty map can't serve a shop", () => {
    expect(
      marketMapProblems({ countries: [], languages: [], primaryCountry: "", fallbackMarket: "" }),
    ).toEqual(["no country is enabled"]);
  });

  const broken = (change: Partial<MarketMap>): string[] =>
    marketMapProblems({ ...seeded, ...change });

  it("lets an unset or stale primary country and fallback market through: both have a fallback", () => {
    // Optional in the admin, and a closed country can leave either pointing at nothing; the shop
    // keeps selling (`primaryCountryCode`, `fallbackMarketOf`), it must not go down for them.
    for (const change of [
      { primaryCountry: "" },
      { primaryCountry: "xx" },
      { fallbackMarket: "" },
      { fallbackMarket: "en-xx" },
      { fallbackMarket: "EN-US" },
    ]) {
      expect(broken(change)).toEqual([]);
    }
  });

  it("flags a country with no language, and a language with no Medusa locale", () => {
    const noLanguage = seeded.countries.map((c) => (c.code === "de" ? { ...c, languages: [] } : c));
    expect(broken({ countries: noLanguage })).toEqual(["country de has no language"]);
    expect(broken({ languages: seeded.languages.filter((l) => l.code !== "fr") })).toEqual([
      "language fr has no Medusa locale",
    ]);
    const blank = seeded.languages.map((l) => (l.code === "el" ? { ...l, medusaLocale: "" } : l));
    expect(broken({ languages: blank })).toEqual(["language el has no Medusa locale"]);
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

  it("flags a country, a language or a domain that appears twice", () => {
    const twice = [...seeded.countries, { code: "us", enabled: true, languages: ["en"] }];
    expect(broken({ countries: twice })).toContain("country us is listed twice");
    const rows = [...seeded.languages, { code: "en", medusaLocale: "en-GB" }];
    expect(broken({ languages: rows })).toContain("language en is listed twice");

    const shared = seeded.countries.map((c) =>
      c.code === "cy" || c.code === "ch" ? { ...c, domain: "shop.com" } : c,
    );
    expect(broken({ countries: shared })).toEqual(["the domain shop.com belongs to two countries"]);
  });
});

describe("toMarketMap (the one shape check of both loaders)", () => {
  const fail = (what: string) => new Error(`the route ${what}`);

  it("keeps both lists and the two settings of a map", () => {
    expect(toMarketMap(seeded, fail)).toEqual(seeded);
  });

  it("turns an unset primary country or fallback market into an empty string, and drops other fields", () => {
    const body = { countries: seeded.countries, languages: seeded.languages, extra: 1 };
    expect(toMarketMap(body, fail)).toEqual({
      countries: seeded.countries,
      languages: seeded.languages,
      primaryCountry: "",
      fallbackMarket: "",
    });
  });

  it.each([[null], [undefined], [{}], [{ countries: [] }], [{ languages: [] }], ["x" as never]])(
    "refuses %j with the caller's error",
    (body) => {
      expect(() => toMarketMap(body, fail)).toThrow("the route did not answer a market map");
    },
  );
});
