import type { MarketMap } from "@shopblok/fixtures";
import type { Market } from "../payload-types";

/** What `updateGlobal({ slug: "markets" })` takes. */
export type MarketsGlobalData = Pick<
  Market,
  "countries" | "languages" | "primaryCountry" | "fallbackMarket"
>;

/**
 * The seeded market map (`@shopblok/fixtures`) as the data of Payload's `markets` global (T10 item
 * 7): `mapFromGlobal` reads exactly this shape. Only the languages that an open country uses get a
 * row under `languages`, so the global doesn't carry rows nothing refers to.
 *
 * The `as` casts are the one place the fixtures' plain strings meet Payload's literal unions of
 * language codes. A code that isn't one of the 42 fails Payload's own select check on save, and
 * `marketMapProblems` (the test) rejects a map whose languages have no row.
 */
export function marketsGlobalData(map: MarketMap): MarketsGlobalData {
  const used = new Set(map.countries.filter((c) => c.enabled).flatMap((c) => c.languages));
  return {
    countries: map.countries.map((country) => ({
      code: country.code,
      enabled: country.enabled,
      languages: country.languages as NonNullable<Market["countries"]>[number]["languages"],
      ...(country.domain === undefined ? {} : { domain: country.domain }),
      ...(country.timeZone === undefined ? {} : { timeZone: country.timeZone }),
    })),
    languages: map.languages
      .filter((language) => used.has(language.code))
      .map((language) => ({
        code: language.code as NonNullable<Market["languages"]>[number]["code"],
        medusaLocale: language.medusaLocale,
        ...(language.htmlLang === undefined ? {} : { htmlLang: language.htmlLang }),
      })),
    primaryCountry: map.primaryCountry,
    fallbackMarket: map.fallbackMarket,
  };
}
