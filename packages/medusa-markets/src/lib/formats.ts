/**
 * The format validators of the markets (ported from the storefront's `markets` global, M4b D91):
 * the same rules, so a value one side accepts the other does too.
 */

/** ISO 3166-1 alpha-2, lowercase: how Medusa stores a region's country and how the map names one. */
export const COUNTRY_CODE = /^[a-z]{2}$/;

/** ISO 639-1, lowercase. */
export const LANGUAGE_CODE = /^[a-z]{2}$/;

/** `{language}-{country}`, lowercase: a market's key (SPEC §8.1). */
export const MARKET_KEY = /^[a-z]{2}-[a-z]{2}$/;

export function isCountryCode(value: string): boolean {
  return COUNTRY_CODE.test(value);
}

export function isLanguageCode(value: string): boolean {
  return LANGUAGE_CODE.test(value);
}

export function isMarketKey(value: string): boolean {
  return MARKET_KEY.test(value);
}

/**
 * Whether `value` is a time zone `Intl.DateTimeFormat` accepts (`Europe/Nicosia`, `UTC`). The
 * storefront hands a country's zone to `Intl` through `formatDate` and next-intl, which throw a
 * RangeError on a name they do not know.
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
 * Whether `value` is a language tag `Intl` accepts: `pt-BR`, `de-CH`, `mn`, `zh-Hant-TW`; not
 * `pt_BR`, `Portuguese` or `pt-BR,en`. A market's `<html lang>` goes to `Intl` through next-intl
 * and `formatMoney`, which refuse anything else.
 */
export function isLanguageTag(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
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

const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

/** Whether a normalized host is a hostname (`shop.example.cy`, `localhost`). */
export function isHostname(value: string): boolean {
  return HOSTNAME.test(value);
}

/** The language of a locale code: `de-CH` gives `de`. */
export function languageOfLocale(locale: string): string {
  const dash = locale.indexOf("-");
  return (dash === -1 ? locale : locale.slice(0, dash)).toLowerCase();
}
