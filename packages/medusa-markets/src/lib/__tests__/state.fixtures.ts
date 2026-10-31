import type { MarketsState, RegionCountry } from "../types";

const region = (
  id: string,
  name: string,
  currency_code: string,
  codes: string[],
): RegionCountry[] =>
  codes.map((code) => ({
    code,
    name: code.toUpperCase(),
    region_id: id,
    region_name: name,
    currency_code,
  }));

/**
 * Medusa's seeded shop as a check sees it: the four regions, the store's four locales, the six
 * seeded markets and the primary country and fallback market of the fixtures. `at` is in a region
 * (Europe) but has no row, as a country just added to a region does.
 */
export function seededState(overrides: Partial<MarketsState> = {}): MarketsState {
  return {
    regionCountries: [
      ...region("reg_eu", "Europe", "eur", ["cy", "de", "fr", "at"]),
      ...region("reg_us", "United States", "usd", ["us"]),
      ...region("reg_gb", "United Kingdom", "gbp", ["gb"]),
      ...region("reg_ch", "Switzerland", "chf", ["ch"]),
    ],
    storeLocales: ["en-US", "el-GR", "de-DE", "fr-FR"],
    defaultRegionId: "reg_eu",
    countries: [
      {
        code: "cy",
        enabled: true,
        languages: ["el"],
        domain: null,
        time_zone: "Europe/Nicosia",
        rank: 0,
      },
      {
        code: "us",
        enabled: true,
        languages: ["en"],
        domain: null,
        time_zone: "America/New_York",
        rank: 1,
      },
      {
        code: "gb",
        enabled: true,
        languages: ["en"],
        domain: null,
        time_zone: "Europe/London",
        rank: 2,
      },
      {
        code: "de",
        enabled: true,
        languages: ["de"],
        domain: null,
        time_zone: "Europe/Berlin",
        rank: 3,
      },
      {
        code: "fr",
        enabled: true,
        languages: ["fr"],
        domain: null,
        time_zone: "Europe/Paris",
        rank: 4,
      },
      {
        code: "ch",
        enabled: true,
        languages: ["de", "fr"],
        domain: null,
        time_zone: "Europe/Zurich",
        rank: 5,
      },
    ],
    languages: [
      { code: "en", medusa_locale: "en-US", html_lang: null, rank: 0 },
      { code: "el", medusa_locale: "el-GR", html_lang: null, rank: 1 },
      { code: "de", medusa_locale: "de-DE", html_lang: null, rank: 2 },
      { code: "fr", medusa_locale: "fr-FR", html_lang: null, rank: 3 },
    ],
    settings: { primary_country: "cy", fallback_market: "en-us" },
    ...overrides,
  };
}
