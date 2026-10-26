// The seeded market map (SPEC §8.5): the editable part of Payload's `markets` global. Tests use it
// directly; `getMarketMap()` (apps/storefront/src/lib/markets/source.ts) uses it when the global is
// empty or incomplete, in development and while `next build` runs, never in production; and T13's
// `bootstrap` seeds the global from it.
// A market is a country plus a language, and its key is `{language}-{country}` (SPEC §8.1), so
// these seven exist: el-cy, en-us, en-gb, de-de, fr-fr, de-ch and fr-ch.

export type MarketLanguage = {
  /** ISO 639-1, lowercase. */
  code: string;
  /** The Medusa locale this language maps to: one per language (D8). */
  medusaLocale: string;
  /** Overrides `<html lang>`, which is `{language}-{COUNTRY}` when this is left out. */
  htmlLang?: string;
};

export type MarketCountry = {
  /** ISO 3166-1 alpha-2, lowercase. */
  code: string;
  enabled: boolean;
  /** ISO 639-1 codes, the default language first. */
  languages: string[];
  /** A per-country domain: on it the country segment is dropped. */
  domain?: string;
  /**
   * An IANA zone (`Europe/Nicosia`): the zone the country's order dates are written in (D65).
   * Left out, the shop's own zone, UTC, is used.
   */
  timeZone?: string;
};

export type MarketMap = {
  countries: MarketCountry[];
  languages: MarketLanguage[];
  /** The country served at `/`. */
  primaryCountry: string;
  /** The market key for visitors no market matches (hreflang `x-default`). */
  fallbackMarket: string;
};

export const markets: MarketMap = {
  countries: [
    { code: "cy", enabled: true, languages: ["el"], timeZone: "Europe/Nicosia" },
    { code: "us", enabled: true, languages: ["en"], timeZone: "America/New_York" },
    { code: "gb", enabled: true, languages: ["en"], timeZone: "Europe/London" },
    { code: "de", enabled: true, languages: ["de"], timeZone: "Europe/Berlin" },
    { code: "fr", enabled: true, languages: ["fr"], timeZone: "Europe/Paris" },
    { code: "ch", enabled: true, languages: ["de", "fr"], timeZone: "Europe/Zurich" },
  ],
  languages: [
    { code: "en", medusaLocale: "en-US" },
    { code: "el", medusaLocale: "el-GR" },
    { code: "de", medusaLocale: "de-DE" },
    { code: "fr", medusaLocale: "fr-FR" },
  ],
  primaryCountry: "cy",
  fallbackMarket: "en-us",
};
