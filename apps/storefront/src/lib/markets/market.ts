import type { Market, MarketCountry, MarketMap } from "./types";

/** `el` + `cy` → `el-cy`: the `[market]` segment of the internal route (SPEC §8.1). */
export function toInternalKey(country: string, language: string): string {
  return `${language}-${country}`;
}

/** A host or a domain setting, compared the same way: no scheme, port, path or case. */
export function normalizeHost(value: string | null | undefined): string | undefined {
  const host = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return host === "" ? undefined : host;
}

/**
 * Whether `value` is a language tag `Intl` accepts: `pt-BR`, `de-CH`, `mn`, `zh-Hant-TW`; not
 * `pt_BR`, `Portuguese` or `pt-BR,en`. A market's `<html lang>` is typed into the admin and goes to
 * `Intl` through next-intl (D62) and `formatMoney`, which refuse anything else.
 */
export function isLanguageTag(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

/**
 * Whether `value` is a time zone `Intl.DateTimeFormat` accepts (`Europe/Nicosia`, `UTC`). A
 * country's `timeZone` is typed into the admin (D65) and goes to `Intl` through `formatDate` and
 * next-intl, which throw a RangeError on a name they do not know.
 */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * The `<html lang>` of a market: the language's own value when the owner wrote one that is a
 * language tag, else the language and the country (`pt` in `br` is `pt-BR`). A value that is not a
 * tag is ignored here, where every reader of the map gets it, because the admin's check
 * (`htmlLang` in `payload/globals/markets.ts`) only stops a save made after it existed, and a
 * stored value outlives a change of rules.
 */
function htmlLangOf(stored: string | undefined, language: string, country: string): string {
  return stored !== undefined && isLanguageTag(stored)
    ? stored
    : `${language}-${country.toUpperCase()}`;
}

/** The countries that are open, in the map's order. */
export function enabledCountries(map: MarketMap): MarketCountry[] {
  return map.countries.filter((country) => country.enabled);
}

/** The map without its closed countries: all that may be published (hreflang prints the open ones). */
export function withoutClosedCountries(map: MarketMap): MarketMap {
  return { ...map, countries: enabledCountries(map) };
}

/**
 * Every market of the enabled countries, one per language, in the map's order (so the hreflang
 * list follows the order the owner chose). A language with no row in `map.languages` gets an empty
 * Medusa locale: `marketMapProblems` reports it, and `getMarketMap()` never returns such a map.
 */
export function listMarkets(map: MarketMap): Market[] {
  return enabledCountries(map).flatMap((country) =>
    country.languages.map((language, index): Market => {
      const entry = map.languages.find((candidate) => candidate.code === language);
      const domain = normalizeHost(country.domain);
      const timeZone =
        country.timeZone !== undefined && isTimeZone(country.timeZone)
          ? country.timeZone
          : undefined;
      return {
        key: toInternalKey(country.code, language),
        country: country.code,
        language,
        htmlLang: htmlLangOf(entry?.htmlLang, language, country.code),
        medusaLocale: entry?.medusaLocale ?? "",
        ...(domain === undefined ? {} : { domain }),
        ...(timeZone === undefined ? {} : { timeZone }),
        isDefaultLanguage: index === 0,
      };
    }),
  );
}

export function findMarket(map: MarketMap, key: string): Market | undefined {
  return listMarkets(map).find((market) => market.key === key);
}

/** The country served at `/`. A primary that isn't open (a broken map) gives the first open one. */
export function primaryCountryCode(map: MarketMap): string | undefined {
  const open = enabledCountries(map);
  return open.find((country) => country.code === map.primaryCountry)?.code ?? open[0]?.code;
}

/**
 * The primary country in its default language: what `/` shows. `markets` is `listMarkets(map)`, for
 * a caller that has it already.
 */
export function primaryMarket(
  map: MarketMap,
  markets: Market[] = listMarkets(map),
): Market | undefined {
  const code = primaryCountryCode(map);
  return markets.find((market) => market.country === code && market.isDefaultLanguage);
}

/**
 * The market hreflang `x-default` points to; the primary market when the setting is stale.
 * `markets` is `listMarkets(map)`, for a caller that has it already.
 */
export function fallbackMarketOf(
  map: MarketMap,
  markets: Market[] = listMarkets(map),
): Market | undefined {
  return markets.find((market) => market.key === map.fallbackMarket) ?? primaryMarket(map, markets);
}
