import { enabledCountries, normalizeHost } from "./market";
import { isMedusaLocale } from "./medusa-locales";
import type { MarketMap } from "./types";

/**
 * The part of Payload's `markets` global that the library reads: what `findGlobal` returns, as far
 * as it matters here. Everything is optional or nullable because an empty global has no value at
 * all, and the map has to cope with that.
 */
export type MarketsGlobal = {
  countries?:
    | {
        code?: string | null;
        enabled?: boolean | null;
        languages?: string[] | null;
        domain?: string | null;
      }[]
    | null;
  languages?:
    { code?: string | null; medusaLocale?: string | null; htmlLang?: string | null }[] | null;
  primaryCountry?: string | null;
  fallbackMarket?: string | null;
};

/**
 * The `markets` global as a `MarketMap`: nulls become absences, a country is open unless it says
 * `enabled: false` (as `filterAvailableLocales` reads it), and a missing primary country or
 * fallback market becomes an empty string, which `primaryCountryCode` and `fallbackMarketOf` cope
 * with. An empty global gives a map that `marketMapProblems` rejects for having no open country.
 */
export function mapFromGlobal(doc: MarketsGlobal): MarketMap {
  return {
    countries: (doc.countries ?? []).flatMap((country) => {
      if (!country.code) return [];
      const domain = normalizeHost(country.domain);
      return [
        {
          code: country.code,
          enabled: country.enabled !== false,
          languages: country.languages ?? [],
          ...(domain === undefined ? {} : { domain }),
        },
      ];
    }),
    languages: (doc.languages ?? []).flatMap((language) => {
      if (!language.code) return [];
      return [
        {
          code: language.code,
          medusaLocale: language.medusaLocale ?? "",
          ...(language.htmlLang ? { htmlLang: language.htmlLang } : {}),
        },
      ];
    }),
    primaryCountry: doc.primaryCountry ?? "",
    fallbackMarket: doc.fallbackMarket ?? "",
  };
}

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

/**
 * Why a map can't serve a shop, as sentences for a log or an error. Empty means it can. These are
 * the cross-references that the admin's field checks don't make (SETUP.md, T09): the admin lets an
 * owner save a half-filled global, and `getMarketMap()` decides what a half-filled one means.
 *
 * Only what breaks URLs or Medusa calls is a problem. A primary country or fallback market that is
 * unset or no longer open is not: `primaryCountryCode` and `fallbackMarketOf` fall back to the
 * first open country and the primary market, and two markets sharing a `<html lang>` value only
 * share one hreflang entry (`hreflangAlternates` keeps the first). A shop must not go down for those.
 */
export function marketMapProblems(map: MarketMap): string[] {
  const problems: string[] = [];
  const open = enabledCountries(map);

  if (open.length === 0) problems.push("no country is enabled");
  for (const code of duplicates(map.countries.map((country) => country.code))) {
    problems.push(`country ${code} is listed twice`);
  }
  for (const country of open) {
    if (country.languages.length === 0) problems.push(`country ${country.code} has no language`);
  }

  for (const code of duplicates(map.languages.map((language) => language.code))) {
    problems.push(`language ${code} is listed twice under Languages`);
  }
  const used = new Set(open.flatMap((country) => country.languages));
  for (const code of used) {
    const entry = map.languages.find((language) => language.code === code);
    if (entry === undefined || entry.medusaLocale === "") {
      problems.push(`language ${code} has no Medusa locale under Languages`);
    } else if (!isMedusaLocale(entry.medusaLocale)) {
      problems.push(`language ${code}: "${entry.medusaLocale}" is not a Medusa locale`);
    }
  }

  for (const domain of duplicates(open.flatMap((country) => normalizeHost(country.domain) ?? []))) {
    problems.push(`the domain ${domain} belongs to two countries`);
  }
  return problems;
}
