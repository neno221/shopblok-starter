import { describe, expect, it } from "vitest";
import {
  compareMarkets,
  MARKETS_FIX,
  marketsCheck,
  readAdminMarkets,
  readBackendMarkets,
  readMarketMap,
  readMarketsOverview,
  type MarketMapData,
  type MarketsOverviewData,
  type OverviewRegion,
} from "./markets-check.ts";

/** The seeded markets as the module's map and Medusa's regions and locales hold them. */
const regions: OverviewRegion[] = [
  { name: "Europe", currency: "eur", countries: ["cy", "de", "fr"] },
  { name: "United States", currency: "usd", countries: ["us"] },
  { name: "United Kingdom", currency: "gbp", countries: ["gb"] },
  { name: "Switzerland", currency: "chf", countries: ["ch"] },
];
const locales = ["en-US", "el-GR", "de-DE", "fr-FR"];

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

const live = { regions, locales };

describe("compareMarkets (D97)", () => {
  it("finds nothing when the map, the regions and the locales agree", () => {
    expect(compareMarkets(live, map)).toEqual([]);
  });

  it("an open country with no region", () => {
    const withBrazil: MarketMapData = {
      countries: [...map.countries, { code: "br", enabled: true, languages: ["pt"] }],
      languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
    };
    const problems = compareMarkets(live, withBrazil).join("\n");
    expect(problems).toContain('country "br" is open in the markets map but no region has it');
    // The language is not among the store's locales either: both halves of the missing edit show.
    expect(problems).toContain(
      'language "pt" uses the Medusa locale "pt-BR", which is not one of the store\'s locales',
    );
  });

  it("a closed country needs no region, and a closed country in a region is how a market waits", () => {
    const closed: MarketMapData = {
      ...map,
      countries: [...map.countries, { code: "br", enabled: false, languages: [] }],
    };
    expect(compareMarkets(live, closed)).toEqual([]);
    const austria: OverviewRegion[] = regions.map((region) =>
      region.name === "Europe" ? { ...region, countries: [...region.countries, "at"] } : region,
    );
    const waiting: MarketMapData = {
      ...map,
      countries: [...map.countries, { code: "at", enabled: false, languages: [] }],
    };
    expect(compareMarkets({ regions: austria, locales }, waiting)).toEqual([]);
  });

  it("a region's country the map does not list, open or not", () => {
    const problems = compareMarkets(live, {
      ...map,
      countries: map.countries.filter((c) => c.code !== "gb"),
    });
    expect(problems).toEqual([
      'region "United Kingdom" has "gb", which the markets map does not list (it lists every country of a region)',
    ]);
  });

  it("a country in two regions", () => {
    const twice: OverviewRegion[] = [
      ...regions,
      { name: "Germany", currency: "eur", countries: ["de"] },
    ];
    expect(compareMarkets({ regions: twice, locales }, map)).toEqual([
      'country "de" is in two regions, "Europe" and "Germany"',
    ]);
  });

  it("a language whose medusaLocale the store does not have", () => {
    const problems = compareMarkets(live, {
      ...map,
      languages: map.languages.map((l) =>
        l.code === "el" ? { code: "el", medusaLocale: "el-CY" } : l,
      ),
    });
    expect(problems).toEqual([
      'language "el" uses the Medusa locale "el-CY", which is not one of the store\'s locales',
    ]);
  });

  it("a language that no open country uses is not checked", () => {
    expect(
      compareMarkets(live, {
        ...map,
        languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
      }),
    ).toEqual([]);
  });

  it("a language with no Medusa locale is the module's own warning, not this comparison's", () => {
    expect(
      compareMarkets(live, {
        ...map,
        languages: map.languages.map((l) =>
          l.code === "el" ? { code: "el", medusaLocale: "" } : l,
        ),
      }),
    ).toEqual([]);
  });

  it("D17: Brazil added in Medusa agrees", () => {
    const brazilRegions: OverviewRegion[] = [
      ...regions,
      { name: "Brazil", currency: "brl", countries: ["br"] },
    ];
    const brazilMap: MarketMapData = {
      countries: [...map.countries, { code: "br", enabled: true, languages: ["pt"] }],
      languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
    };
    expect(
      compareMarkets({ regions: brazilRegions, locales: [...locales, "pt-BR"] }, brazilMap),
    ).toEqual([]);
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

/** What `GET /admin/markets` answers, as far as doctor reads it. */
const answer = {
  map: { ...map, primaryCountry: "cy", fallbackMarket: "en-us" },
  regions: regions.map((region, index) => ({
    id: `reg_${index}`,
    name: region.name,
    currency_code: region.currency,
    countries: region.countries,
  })),
  locales,
  default_region_id: "reg_0",
  problems: [],
};

describe("readMarketsOverview", () => {
  it("reads the route's answer and keeps what the comparison needs", () => {
    expect(readMarketsOverview(answer)).toEqual({ map, regions, locales, problems: [] });
  });

  it("keeps the warnings as sentences", () => {
    const read = readMarketsOverview({
      ...answer,
      problems: [{ code: "no_open_country", message: "no country is open", path: "x" }],
    }) as MarketsOverviewData;
    expect(read.problems).toEqual(["no country is open"]);
  });

  it("says which part is not what doctor expects", () => {
    expect(readMarketsOverview(null)).toBe("the markets overview is not an object");
    expect(readMarketsOverview({ ...answer, map: 1 })).toBe("the market map is not an object");
    expect(readMarketsOverview({ ...answer, regions: [{ name: "x" }] })).toContain("regions");
    expect(readMarketsOverview({ ...answer, locales: "en-US" })).toContain("locales");
    expect(readMarketsOverview({ ...answer, problems: ["x"] })).toContain("problems");
  });
});

describe("marketsCheck (D97)", () => {
  const overview: MarketsOverviewData = { map, regions, locales, problems: [] };
  const read = (over: Partial<MarketsOverviewData> = {}, source = "medusa-exec" as const) =>
    marketsCheck({ ok: true, source, overview: { ...overview, ...over } });

  it("does not read the module when the Postgres check failed", () => {
    const { check, map: handed } = marketsCheck({ skipped: true });
    expect(check).toMatchObject({ id: "markets", level: "warn" });
    expect(check.message).toContain("Medusa was not started");
    expect(handed).toBeUndefined();
  });

  it("is an error, with the cause and the fix, when Medusa could not be read", () => {
    const { check, map: handed } = marketsCheck({
      ok: false,
      cause: "the markets plugin is not built",
      fix: "Run `pnpm bootstrap`.",
    });
    expect(check).toMatchObject({
      id: "markets",
      level: "error",
      message: "could not read it: the markets plugin is not built.",
      fix: "Run `pnpm bootstrap`.",
    });
    expect(handed).toBeUndefined();
  });

  it("warns that a module with no country means the fixtures, and gives no map", () => {
    const { check, map: handed } = read({ map: { countries: [], languages: [] } });
    expect(check.level).toBe("warn");
    expect(check.message).toContain("lists no country");
    expect(check.message).toContain("the markets module (medusa exec)");
    expect(handed).toBeUndefined();
  });

  it("is ok when the module, the regions and the locales agree, and hands the map on", () => {
    const { check, map: handed } = read();
    expect(check).toMatchObject({
      id: "markets",
      level: "ok",
      message:
        "6 open of 6 countries, 4 languages; the map, Medusa's regions and the store's locales agree.",
    });
    expect(handed).toBe(map);
  });

  it("counts a closed country in a region as listed, not as a problem", () => {
    const { check } = read({
      map: { ...map, countries: [...map.countries, { code: "at", enabled: false, languages: [] }] },
      regions: regions.map((region) =>
        region.name === "Europe" ? { ...region, countries: [...region.countries, "at"] } : region,
      ),
    });
    expect(check).toMatchObject({ level: "ok" });
    expect(check.message).toContain("6 open of 7 countries");
  });

  it("warns with the module's own warnings, and still hands the map on", () => {
    const { check, map: handed } = read({ problems: ["country de has no language"] });
    expect(check).toMatchObject({
      level: "warn",
      details: ["country de has no language"],
      fix: MARKETS_FIX,
    });
    expect(handed).toBe(map);
  });

  it("warns with what the map and Medusa's regions disagree about, each once", () => {
    const { check } = read({
      problems: ['country "br" is open in the markets map but no region has it (module)'],
      map: {
        countries: [...map.countries, { code: "br", enabled: true, languages: ["pt"] }],
        languages: [...map.languages, { code: "pt", medusaLocale: "pt-BR" }],
      },
    });
    expect(check.level).toBe("warn");
    expect(check.details).toEqual([
      'country "br" is open in the markets map but no region has it (module)',
      'country "br" is open in the markets map but no region has it (its pages show the no-region message)',
      'language "pt" uses the Medusa locale "pt-BR", which is not one of the store\'s locales',
    ]);
  });

  it("names where it read, for the admin API", () => {
    const { check } = read({ map: { countries: [], languages: [] } }, "admin-api" as never);
    expect(check.message).toContain("GET /admin/markets");
  });
});

describe("readAdminMarkets", () => {
  const response = (status: number, body: unknown): Parameters<typeof readAdminMarkets>[0] => ({
    kind: "response",
    status,
    text: typeof body === "string" ? body : JSON.stringify(body),
  });

  it("reads the overview of a 200", () => {
    expect(readAdminMarkets(response(200, answer))).toEqual({
      ok: true,
      source: "admin-api",
      overview: { map, regions, locales, problems: [] },
    });
  });

  it("gives way to `medusa exec` when the backend did not answer the overview", () => {
    expect(readAdminMarkets(undefined)).toBeUndefined();
    expect(readAdminMarkets({ kind: "refused" })).toBeUndefined();
    expect(
      readAdminMarkets({ kind: "unreachable", reason: "no answer within 5 s" }),
    ).toBeUndefined();
    expect(readAdminMarkets(response(401, { message: "Unauthorized" }))).toBeUndefined();
    expect(readAdminMarkets(response(404, "<html>"))).toBeUndefined();
  });

  it("is an error when a 200 is not the overview: the route and doctor disagree", () => {
    const read = readAdminMarkets(response(200, { markets: {} }));
    expect(read).toMatchObject({ ok: false });
    expect(read && "cause" in read ? read.cause : "").toContain("GET /admin/markets");
  });
});
