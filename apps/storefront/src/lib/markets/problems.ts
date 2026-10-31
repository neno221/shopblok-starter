import { enabledCountries, normalizeHost } from "./market";
import { isMedusaLocale } from "./medusa-locales";
import type { MarketMap } from "./types";

/**
 * A `MarketMap` out of an answer that is not trusted: Medusa's `GET /store/markets` body or the map
 * route's JSON, where another app on the address can answer 200 with its own page or JSON. Both
 * lists must be lists, and an unset primary country or fallback market becomes `""`. The one place
 * the shape is checked, so a later field reaches the render and the proxy alike. `fail` builds the
 * error from "did not answer a market map", with the caller's address and hint around it.
 */
export function toMarketMap(
  body: Partial<MarketMap> | null | undefined,
  fail: (what: string) => Error,
): MarketMap {
  if (!Array.isArray(body?.countries) || !Array.isArray(body.languages)) {
    throw fail("did not answer a market map");
  }
  return {
    countries: body.countries,
    languages: body.languages,
    primaryCountry: body.primaryCountry ?? "",
    fallbackMarket: body.fallbackMarket ?? "",
  };
}

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

/**
 * Why a map can't serve a shop, as sentences for a log or an error. Empty means it can. These are
 * the cross-references that Medusa's checks on save make too (the markets plugin, D91), read again
 * here because Medusa's own screens can change a region or a locale after a save, and the
 * last-good-map rule (`source.ts`) must not take a map that would break the shop.
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
    problems.push(`language ${code} is listed twice`);
  }
  const used = new Set(open.flatMap((country) => country.languages));
  for (const code of used) {
    const entry = map.languages.find((language) => language.code === code);
    if (entry === undefined || entry.medusaLocale === "") {
      problems.push(`language ${code} has no Medusa locale`);
    } else if (!isMedusaLocale(entry.medusaLocale)) {
      problems.push(`language ${code}: "${entry.medusaLocale}" is not a Medusa locale`);
    }
  }

  for (const domain of duplicates(open.flatMap((country) => normalizeHost(country.domain) ?? []))) {
    problems.push(`the domain ${domain} belongs to two countries`);
  }
  return problems;
}
