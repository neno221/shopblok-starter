import { describe, expect, it } from "vitest";
import {
  compareMarkets,
  readBackendMarkets,
  readMarketMap,
  type BackendMarkets,
  type MarketMapData,
} from "./markets-check.ts";

/** The committed `config/markets.ts` and the seeded fixtures, as plain data. */
const backend: BackendMarkets = {
  currencies: ["eur", "usd", "gbp", "chf"],
  regions: [
    { name: "Europe", currency: "eur", countries: ["cy", "de", "fr"] },
    { name: "United States", currency: "usd", countries: ["us"] },
    { name: "United Kingdom", currency: "gbp", countries: ["gb"] },
    { name: "Switzerland", currency: "chf", countries: ["ch"] },
  ],
  locales: ["en-US", "el-GR", "de-DE", "fr-FR"],
};

const map: MarketMapData = {
  countries: [
    { code: "cy", enabled: true, languages: ["el"] },
    { code: "us", enabled: true, languages: ["en"] },
    { code: "gb", enabled: true, languages: ["en"] },
    { code: "de", enabled: true, languages: ["de"] },
    { code: "fr", enabled: true, languages: ["fr"] },
    { code: "ch", enabled: true, languages: ["de", "fr"] },
  ],
  languages: [
    { code: "en", medusaLocale: "en-US" },
    { code: "el", medusaLocale: "el-GR" },
    { code: "de", medusaLocale: "de-DE" },
    { code: "fr", medusaLocale: "fr-FR" },
  ],
};

describe("compareMarkets", () => {
  it("finds nothing when the two lists agree", () => {
    expect(compareMarkets(backend, map)).toEqual([]);
  });

  it("an open country with no region", () => {
    const withBrazil: MarketMapData = {
      countries: [...map.countries, { code: "br", enabled: true, languages: ["pt"] }],
      languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
    };
    const problems = compareMarkets(backend, withBrazil);
    expect(problems.join("\n")).toContain('country "br" is open in the storefront\'s map');
    expect(problems.join("\n")).toContain("no region in config/markets.ts has it");
    // The language is not in SUPPORTED_LOCALES either: both halves of the missing edit show.
    expect(problems.join("\n")).toContain('"pt-BR", which is not in SUPPORTED_LOCALES');
  });

  it("a closed country needs no region", () => {
    const closed: MarketMapData = {
      ...map,
      countries: [...map.countries, { code: "br", enabled: false, languages: ["pt"] }],
    };
    expect(compareMarkets(backend, closed)).toEqual([]);
  });

  it("a region country the map does not serve, absent or disabled", () => {
    const absent = compareMarkets(backend, {
      ...map,
      countries: map.countries.filter((c) => c.code !== "gb"),
    });
    expect(absent).toEqual([
      'region "United Kingdom" has "gb", which the storefront\'s map does not serve (not listed, or disabled)',
    ]);
    const disabled = compareMarkets(backend, {
      ...map,
      countries: map.countries.map((c) => (c.code === "gb" ? { ...c, enabled: false } : c)),
    });
    expect(disabled).toEqual(absent);
  });

  it("a language whose medusaLocale the store does not have", () => {
    const problems = compareMarkets(backend, {
      ...map,
      languages: map.languages.map((l) =>
        l.code === "el" ? { code: "el", medusaLocale: "el-CY" } : l,
      ),
    });
    expect(problems).toEqual([
      'language "el" uses the Medusa locale "el-CY", which is not in SUPPORTED_LOCALES in config/markets.ts',
    ]);
  });

  it("a language that no open country uses is not checked", () => {
    const problems = compareMarkets(backend, {
      ...map,
      languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
    });
    expect(problems).toEqual([]);
  });

  it("a language with no Medusa locale is the map's own problem, not this comparison's", () => {
    expect(
      compareMarkets(backend, {
        ...map,
        languages: map.languages.map((l) =>
          l.code === "el" ? { code: "el", medusaLocale: "" } : l,
        ),
      }),
    ).toEqual([]);
  });

  it("the backend list against itself: a region in a currency the store lacks, a country twice", () => {
    const broken: BackendMarkets = {
      ...backend,
      regions: [
        ...backend.regions,
        { name: "Brazil", currency: "brl", countries: ["br"] },
        { name: "Germany", currency: "eur", countries: ["de"] },
      ],
    };
    const problems = compareMarkets(broken, map).join("\n");
    expect(problems).toContain('region "Brazil" is in "brl", which is not in SUPPORTED_CURRENCIES');
    expect(problems).toContain('country "de" is in two regions, "Europe" and "Germany"');
  });

  it("D17: Brazil added on both sides agrees", () => {
    const brazilBackend: BackendMarkets = {
      currencies: [...backend.currencies, "brl"],
      regions: [...backend.regions, { name: "Brazil", currency: "brl", countries: ["br"] }],
      locales: [...backend.locales, "pt-BR"],
    };
    const brazilMap: MarketMapData = {
      countries: [...map.countries, { code: "br", enabled: true, languages: ["pt"] }],
      languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
    };
    expect(compareMarkets(brazilBackend, brazilMap)).toEqual([]);
  });
});

describe("readBackendMarkets", () => {
  const exports = {
    SUPPORTED_CURRENCIES: [
      { currency_code: "eur", is_default: true },
      { currency_code: "usd", is_default: false },
    ],
    MARKET_REGIONS: [
      { name: "Europe", currency_code: "eur", countries: ["cy"], standard_shipping: 6 },
    ],
    SUPPORTED_LOCALES: ["en-US", "el-GR"],
  };

  it("reads the three lists", () => {
    expect(readBackendMarkets(exports)).toEqual({
      currencies: ["eur", "usd"],
      regions: [{ name: "Europe", currency: "eur", countries: ["cy"] }],
      locales: ["en-US", "el-GR"],
    });
  });

  it("says which export is not what it expects", () => {
    expect(readBackendMarkets({ ...exports, SUPPORTED_CURRENCIES: ["eur"] })).toContain(
      "SUPPORTED_CURRENCIES",
    );
    expect(readBackendMarkets({ ...exports, MARKET_REGIONS: [{ name: "x" }] })).toContain(
      "MARKET_REGIONS",
    );
    expect(readBackendMarkets({ ...exports, SUPPORTED_LOCALES: undefined })).toContain(
      "SUPPORTED_LOCALES",
    );
  });
});

describe("readMarketMap", () => {
  it("reads the fixtures' shape and keeps what the comparison needs", () => {
    expect(
      readMarketMap({
        countries: [{ code: "cy", enabled: true, languages: ["el"], domain: "shop.cy" }],
        languages: [{ code: "el", medusaLocale: "el-GR", htmlLang: "el-CY" }],
        primaryCountry: "cy",
        fallbackMarket: "el-cy",
      }),
    ).toEqual({
      countries: [{ code: "cy", enabled: true, languages: ["el"] }],
      languages: [{ code: "el", medusaLocale: "el-GR" }],
    });
  });

  it("refuses what is not a map", () => {
    expect(readMarketMap(null)).toBe("the market map is not an object");
    expect(readMarketMap({ countries: [{ code: "cy" }], languages: [] })).toContain("countries");
    expect(readMarketMap({ countries: [], languages: [{ code: "el" }] })).toContain("languages");
  });
});
