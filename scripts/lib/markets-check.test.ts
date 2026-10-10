import { describe, expect, it } from "vitest";
import {
  compareMarkets,
  MARKETS_FIX,
  marketsGlobalCheck,
  marketsSyncCheck,
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

describe("marketsGlobalCheck", () => {
  it("does not read a global when the Postgres check failed", () => {
    const { check, map: read } = marketsGlobalCheck({ skipped: true });
    expect(check).toMatchObject({ id: "markets-global", level: "warn" });
    expect(check.message).toContain("Payload was not started");
    expect(read).toBeUndefined();
  });

  it("is an error, with the cause and the fix, when Payload could not be read", () => {
    const { check, map: read } = marketsGlobalCheck({
      ok: false,
      cause: "the payload database does not exist",
      fix: "Run `pnpm bootstrap`.",
    });
    expect(check).toMatchObject({
      level: "error",
      message: "could not read it: the payload database does not exist.",
      fix: "Run `pnpm bootstrap`.",
    });
    expect(read).toBeUndefined();
  });

  it("warns that an empty global means the fixtures, and gives no map", () => {
    const { check, map: read } = marketsGlobalCheck({
      ok: true,
      map: { countries: [], languages: [] },
      problems: [],
    });
    expect(check.level).toBe("warn");
    expect(check.message).toContain("seeded fixtures");
    expect(read).toBeUndefined();
  });

  it("is ok for a filled global and hands its map on", () => {
    const { check, map: read } = marketsGlobalCheck({
      ok: true,
      map,
      problems: [],
    });
    expect(check).toMatchObject({
      level: "ok",
      message: "6 open countries, 4 languages.",
    });
    expect(read).toBe(map);
  });

  it("warns with the reasons when the map cannot serve a shop, and still hands it on", () => {
    const { check, map: read } = marketsGlobalCheck({
      ok: true,
      map,
      problems: ["country de has no language"],
    });
    expect(check).toMatchObject({
      level: "warn",
      details: ["country de has no language"],
    });
    expect(read).toBe(map);
  });
});

describe("marketsSyncCheck", () => {
  const backendFile = {
    exports: {
      SUPPORTED_CURRENCIES: backend.currencies.map((currency_code) => ({
        currency_code,
      })),
      MARKET_REGIONS: backend.regions.map((r) => ({
        name: r.name,
        currency_code: r.currency,
        countries: r.countries,
      })),
      SUPPORTED_LOCALES: backend.locales,
    },
  };

  it("is ok when the backend and the global agree", () => {
    const result = marketsSyncCheck({
      backendFile,
      fixtures: map,
      global: map,
    });
    expect(result.check).toMatchObject({ id: "markets-sync", level: "ok" });
    expect(result.check.message).toContain("the markets global");
    expect(result.backend).toEqual(backend);
    expect(result.map).toBe(map);
  });

  it("compares with the seeded fixtures when the global is empty or unread", () => {
    const result = marketsSyncCheck({
      backendFile,
      fixtures: map,
      global: undefined,
    });
    expect(result.check.level).toBe("ok");
    expect(result.check.message).toContain("the seeded fixtures");
    expect(result.map).toBe(map);
  });

  it("warns with every difference and the fix when they disagree (D17)", () => {
    const open = {
      ...map,
      countries: [...map.countries, { code: "br", enabled: true, languages: ["en"] }],
    };
    const result = marketsSyncCheck({
      backendFile,
      fixtures: map,
      global: open,
    });
    expect(result.check).toMatchObject({ level: "warn", fix: MARKETS_FIX });
    expect(result.check.message).toContain("disagree (D17)");
    expect(result.check.details?.length).toBeGreaterThan(0);
  });

  it("warns when the backend's file cannot be read, and still hands on the map for --online", () => {
    const result = marketsSyncCheck({
      backendFile: { error: "boom" },
      fixtures: map,
      global: undefined,
    });
    expect(result.check.message).toBe("could not read apps/backend/src/config/markets.ts (boom).");
    expect(result.backend).toBeUndefined();
    expect(result.map).toBe(map);
  });

  it("warns when the file is not what doctor expects", () => {
    const result = marketsSyncCheck({
      backendFile: { exports: {} },
      fixtures: map,
      global: map,
    });
    expect(result.check.message).toContain("is not what doctor expects");
    expect(result.backend).toBeUndefined();
  });

  it("warns with the reason when there is no global and the fixtures cannot be read", () => {
    const result = marketsSyncCheck({
      backendFile,
      fixtures: "could not read packages/fixtures/src/markets.ts (boom)",
      global: undefined,
    });
    expect(result.check.message).toBe("could not read packages/fixtures/src/markets.ts (boom)");
    expect(result.map).toBeUndefined();
    expect(result.backend).toEqual(backend);
  });
});
