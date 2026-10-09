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

/** The countries that are open, in the map's order. */
export function enabledCountries(map: MarketMap): MarketCountry[] {
  return map.countries.filter((country) => country.enabled);
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
      return {
        key: toInternalKey(country.code, language),
        country: country.code,
        language,
        htmlLang: entry?.htmlLang || `${language}-${country.code.toUpperCase()}`,
        medusaLocale: entry?.medusaLocale ?? "",
        ...(domain === undefined ? {} : { domain }),
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
