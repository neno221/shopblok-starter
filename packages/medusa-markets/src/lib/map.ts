import type { CountryRow, LanguageRow, MarketMap, SettingsRow } from "./types";

/** By `rank`, the ranked ones first; the rest, and equal ranks, by code. */
function byRank(
  a: { rank: number | null; code: string },
  b: { rank: number | null; code: string },
) {
  return (
    (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) ||
    a.code.localeCompare(b.code)
  );
}

/**
 * The market map the storefront reads (`MarketMap` of `@shopblok/fixtures`), from the module's
 * rows and the countries Medusa's regions hold:
 *
 * - EVERY country that is in a region is listed; one with no row yet (just added to a region) is
 *   closed, `{ enabled: false, languages: [] }`, and gets its row on the first save. A row whose
 *   country left every region stays in the table and is left out here, so putting the country
 *   back restores its settings;
 * - `domain` and `timeZone` are left out when null;
 * - the order is `rank` (the seed sets it from the fixtures' order), then the countries without
 *   one, by code. It drives the switcher and the hreflang list;
 * - `languages` are the language rows some listed country uses, ordered the same way by their
 *   own `rank`.
 *
 * A missing primary country or fallback market is an empty string, as the storefront reads an
 * unset one.
 */
export function buildMarketMap(input: {
  countries: CountryRow[];
  languages: LanguageRow[];
  settings: SettingsRow;
  /** The lowercase codes of every country that is in one of Medusa's regions. */
  regionCountryCodes: Iterable<string>;
}): MarketMap {
  const rows = new Map(input.countries.map((row) => [row.code, row]));
  const listed = [...new Set(input.regionCountryCodes)]
    .map(
      (code) =>
        rows.get(code) ?? {
          code,
          enabled: false,
          languages: [],
          domain: null,
          time_zone: null,
          rank: null,
        },
    )
    .sort(byRank);
  const used = new Set(listed.flatMap((row) => row.languages));

  return {
    countries: listed.map((row) => ({
      code: row.code,
      enabled: row.enabled,
      languages: [...row.languages],
      ...(row.domain ? { domain: row.domain } : {}),
      ...(row.time_zone ? { timeZone: row.time_zone } : {}),
    })),
    languages: [...input.languages]
      .filter((row) => used.has(row.code))
      .sort(byRank)
      .map((row) => ({
        code: row.code,
        medusaLocale: row.medusa_locale,
        ...(row.html_lang ? { htmlLang: row.html_lang } : {}),
      })),
    primaryCountry: input.settings.primary_country ?? "",
    fallbackMarket: input.settings.fallback_market ?? "",
  };
}
