import { IntlMessageFormat } from "intl-messageformat";

// The formatters: money, dates, numbers, country names and ICU messages. `locale` is always a BCP
// 47 tag such as `el-CY` or `de-CH` (the market's `<html lang>`), so a number or a plural follows the
// market, not only the language. Building an Intl formatter costs far more than one `format()`
// call, and a listing page formats dozens of prices and labels, so each kind keeps the ones it built.
// A client component imports them from `@shopblok/i18n/format` (T35): the package's index also
// carries the four catalogs, which the browser has no use for.

const currencyFormats = new Map<string, Intl.NumberFormat>();

/**
 * Formats an amount in major units: Medusa v2 returns 12.5 for €12.50, so the amount is never
 * divided or multiplied by 100. `currency` is an ISO 4217 code in either case (Medusa's are
 * lowercase).
 */
export function formatMoney(amount: number, currency: string, locale: string): string {
  const key = `${locale}|${currency.toUpperCase()}`;
  let format = currencyFormats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, { style: "currency", currency });
    currencyFormats.set(key, format);
  }
  return format.format(amount);
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Formats a number in the locale (`4,5` in German); `options` as `Intl.NumberFormat` takes them. */
export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format.format(value);
}

/**
 * Formats a range in the locale (`88–92`, `34,6–36,2` in German), as `Intl.NumberFormat`'s
 * `formatRange` writes it: the dash and its spacing are the locale's, so no message carries them
 * (T38: the size guide's measurements). `options` as `Intl.NumberFormat` takes them.
 */
export function formatNumberRange(
  from: number,
  to: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format.formatRange(from, to);
}

const listFormats = new Map<string, Intl.ListFormat>();

/**
 * Joins names into a list in the locale ("Colour and Size", "Χρώμα και Μέγεθος"), with
 * `Intl.ListFormat`: "and" for `conjunction`, "or" for `disjunction`, and commas alone for `unit`
 * ("Black, M": the values of one variant). T38: what is left to choose, and what is chosen.
 */
export function formatList(
  items: readonly string[],
  locale: string,
  type: "conjunction" | "disjunction" | "unit" = "conjunction",
): string {
  const key = `${locale}|${type}`;
  let format = listFormats.get(key);
  if (format === undefined) {
    format = new Intl.ListFormat(locale, { style: "long", type });
    listFormats.set(key, format);
  }
  return format.format(items);
}

const regionNames = new Map<string, Intl.DisplayNames>();

/** A country's name in the locale (`Κύπρος` for `cy` in Greek), from `Intl`, never a literal. */
export function countryName(code: string, locale: string): string {
  let names = regionNames.get(locale);
  if (names === undefined) {
    names = new Intl.DisplayNames(locale, { type: "region" });
    regionNames.set(locale, names);
  }
  const upper = code.toUpperCase();
  return names.of(upper) ?? upper;
}

const languageNames = new Map<string, Intl.DisplayNames>();

/**
 * A language's name in `inLocale` (`Ελληνικά` for `el` in `el`, `Deutsch` for `de` in `de-CH`), from
 * `Intl`, never a literal. The market switcher names each language in its own language, so a shopper
 * who cannot read the page's language can still find theirs. `Intl` writes some languages in
 * lower case (`français`); the caller capitalises for a menu if it wants to. A code `Intl` does not
 * know comes back as it was given.
 */
export function languageName(language: string, inLocale: string): string {
  let names = languageNames.get(inLocale);
  if (names === undefined) {
    names = new Intl.DisplayNames(inLocale, { type: "language" });
    languageNames.set(inLocale, names);
  }
  return names.of(language) ?? language;
}

/** What a message's placeholders take. */
export type MessageValues = Record<string, string | number | Date>;

// One per locale and message. The messages are the catalogs' strings, a fixed set, so the map
// stays as small as the catalogs; a shop's own strings (M4's `ui-strings`) are a fixed set too.
const messageFormats = new Map<string, IntlMessageFormat>();

/**
 * Formats an ICU message (D43): `formatMessage(copy.stock.low, { count: 3 }, "el-CY")` gives
 * "Απομένουν μόνο 3". A plural picks the locale's CLDR category, and `#` is the count in the
 * locale's number format. A placeholder with no value throws, so a missing argument is found by
 * the first test that renders it rather than shown to a shopper as `{count}`.
 */
export function formatMessage(message: string, values: MessageValues, locale: string): string {
  const key = `${locale}\u0000${message}`;
  let format = messageFormats.get(key);
  if (format === undefined) {
    format = new IntlMessageFormat(message, locale);
    messageFormats.set(key, format);
  }
  // Only plain values go in, so the result is a string (rich elements would give an array).
  return String(format.format(values));
}
