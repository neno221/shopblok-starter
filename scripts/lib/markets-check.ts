// D17 and D19: the backend's `apps/backend/src/config/markets.ts` and the storefront's market map
// are two lists edited by hand in M0, and they have to agree (T14). Pure: both arrive as plain data,
// read by `doctor.ts` (the file through `loadExports`, the map from the `markets` global or from
// `@shopblok/fixtures`). The shapes are declared here because `scripts/` cannot import either app
// (T10 item 8, T13 item 6); `readBackendMarkets` and `readMarketMap` check the real data against them,
// so a change to either file shows up as an error from doctor, not as a wrong answer.

export type BackendMarkets = {
  /** `SUPPORTED_CURRENCIES`, as currency codes. */
  currencies: string[];
  /** `MARKET_REGIONS`. */
  regions: { name: string; currency: string; countries: string[] }[];
  /** `SUPPORTED_LOCALES`: the Medusa locales the store has. */
  locales: string[];
};

export type MarketMapData = {
  countries: { code: string; enabled: boolean; languages: string[] }[];
  languages: { code: string; medusaLocale: string }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** The three lists out of the module's exports, or why they are not what doctor expects. */
export function readBackendMarkets(exports: Record<string, unknown>): BackendMarkets | string {
  const { SUPPORTED_CURRENCIES, MARKET_REGIONS, SUPPORTED_LOCALES } = exports;

  if (
    !Array.isArray(SUPPORTED_CURRENCIES) ||
    !SUPPORTED_CURRENCIES.every((c) => isRecord(c) && typeof c.currency_code === "string")
  ) {
    return "SUPPORTED_CURRENCIES is not a list of { currency_code }";
  }
  if (
    !Array.isArray(MARKET_REGIONS) ||
    !MARKET_REGIONS.every(
      (r) =>
        isRecord(r) &&
        typeof r.name === "string" &&
        typeof r.currency_code === "string" &&
        isStringArray(r.countries),
    )
  ) {
    return "MARKET_REGIONS is not a list of { name, currency_code, countries }";
  }
  if (!isStringArray(SUPPORTED_LOCALES)) return "SUPPORTED_LOCALES is not a list of strings";

  return {
    currencies: SUPPORTED_CURRENCIES.map((c) =>
      String((c as Record<string, unknown>).currency_code),
    ),
    regions: MARKET_REGIONS.map((r) => {
      const region = r as Record<string, unknown>;
      return {
        name: String(region.name),
        currency: String(region.currency_code),
        countries: region.countries as string[],
      };
    }),
    locales: SUPPORTED_LOCALES,
  };
}

/** A `MarketMap` (the fixtures, or `mapFromGlobal`'s result) as far as the comparison reads it. */
export function readMarketMap(value: unknown): MarketMapData | string {
  if (!isRecord(value)) return "the market map is not an object";
  const { countries, languages } = value;
  if (
    !Array.isArray(countries) ||
    !countries.every(
      (c) =>
        isRecord(c) &&
        typeof c.code === "string" &&
        typeof c.enabled === "boolean" &&
        isStringArray(c.languages),
    )
  ) {
    return "the market map's countries are not a list of { code, enabled, languages }";
  }
  if (
    !Array.isArray(languages) ||
    !languages.every(
      (l) => isRecord(l) && typeof l.code === "string" && typeof l.medusaLocale === "string",
    )
  ) {
    return "the market map's languages are not a list of { code, medusaLocale }";
  }
  return {
    countries: countries.map((c) => {
      const country = c as Record<string, unknown>;
      return {
        code: String(country.code),
        enabled: country.enabled === true,
        languages: country.languages as string[],
      };
    }),
    languages: languages.map((l) => {
      const language = l as Record<string, unknown>;
      return { code: String(language.code), medusaLocale: String(language.medusaLocale) };
    }),
  };
}

const quoted = (values: readonly string[]): string => values.map((v) => `"${v}"`).join(", ");

/**
 * Where the two lists disagree, as sentences. Empty means they agree. Each is a case from D17:
 *
 * - an open country with no region: its pages render the "no region" message, and nothing else warns;
 * - a region country the map does not serve: the shop sells there, nobody can reach it;
 * - a language whose `medusaLocale` the store does not have: Medusa answers in English;
 * - and the backend list against itself (a region in a currency the store lacks, a country in two
 *   regions), which the seed would trip over later.
 */
export function compareMarkets(backend: BackendMarkets, map: MarketMapData): string[] {
  const problems: string[] = [];
  const open = map.countries.filter((country) => country.enabled);
  const openCodes = new Set(open.map((country) => country.code));
  const regionCountries = new Map<string, string>();

  for (const region of backend.regions) {
    if (!backend.currencies.includes(region.currency)) {
      problems.push(
        `region "${region.name}" is in "${region.currency}", which is not in SUPPORTED_CURRENCIES in config/markets.ts`,
      );
    }
    for (const country of region.countries) {
      const other = regionCountries.get(country);
      if (other !== undefined && other !== region.name) {
        problems.push(
          `country "${country}" is in two regions, "${other}" and "${region.name}", in config/markets.ts`,
        );
      }
      regionCountries.set(country, region.name);
    }
  }

  for (const country of open) {
    if (!regionCountries.has(country.code)) {
      problems.push(
        `country "${country.code}" is open in the storefront's map but no region in config/markets.ts has it (its pages show the no-region message)`,
      );
    }
  }
  for (const region of backend.regions) {
    const unserved = region.countries.filter((country) => !openCodes.has(country));
    if (unserved.length > 0) {
      problems.push(
        `region "${region.name}" has ${quoted(unserved)}, which the storefront's map does not serve (not listed, or disabled)`,
      );
    }
  }

  const used = new Set(open.flatMap((country) => country.languages));
  for (const code of used) {
    const language = map.languages.find((entry) => entry.code === code);
    // A language with no Medusa locale at all is the map's own problem (marketMapProblems says so).
    if (language === undefined || language.medusaLocale === "") continue;
    if (!backend.locales.includes(language.medusaLocale)) {
      problems.push(
        `language "${code}" uses the Medusa locale "${language.medusaLocale}", which is not in SUPPORTED_LOCALES in config/markets.ts`,
      );
    }
  }
  return problems;
}

/** The hint every mismatch shares: which file to edit, and what applies the edit. */
export const MARKETS_FIX =
  "Edit apps/backend/src/config/markets.ts and the markets global (Payload admin, or packages/fixtures for the seed) so they list the same countries and languages (D19); then run `pnpm bootstrap`, which applies the backend side.";
