import { languageOfLocale } from "../../lib/formats";

// "The language of a store locale" is the server's rule (`src/lib/formats.ts`, which has no
// framework import): `de-DE` gives `de`, so the panels never offer a locale the checks refuse.

/** The languages of the store's locales, in the locales' order, each once. */
export const storeLanguages = (locales: string[]): string[] => [
  ...new Set(locales.map(languageOfLocale)),
];

/** The store locales of one language (more than one is D8's ambiguous case). */
export const localesOfLanguage = (locales: string[], language: string): string[] =>
  locales.filter((locale) => languageOfLocale(locale) === language);

/** A language's name in the admin's language; the code when `Intl` does not know it. */
export const languageName = (code: string, displayLanguage: string): string => {
  try {
    return new Intl.DisplayNames([displayLanguage], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** A market key (`de-ch`) as "German · Switzerland". */
export const marketName = (
  key: string,
  countryNames: Record<string, string>,
  displayLanguage: string,
): string => {
  const [language = "", country = ""] = key.split("-");
  return `${languageName(language, displayLanguage)} · ${countryNames[country] ?? country.toUpperCase()}`;
};

/** The IANA zones the browser knows, with `current` added when it is not one of them. */
export const timeZoneOptions = (current: string | null): string[] => {
  // `Intl.supportedValuesOf` is ES2022; the plugin's tsconfigs target ES2020 and ES2021.
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  let zones: string[] = [];
  try {
    zones = intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  return current !== null && current !== "" && !zones.includes(current)
    ? [...zones, current].sort()
    : zones;
};

/**
 * A country's own IANA zones (`at` gives `Europe/Vienna`), from the browser's CLDR data:
 * `Intl.Locale`'s `getTimeZones()` (its current name) or `timeZones` (the older getter, which
 * Node 22 has). Empty when the browser has neither (the picker then lists every zone, searchable).
 */
export const countryTimeZones = (country: string): string[] => {
  try {
    const locale = new Intl.Locale(`und-${country.toUpperCase()}`) as Intl.Locale & {
      getTimeZones?: () => string[] | undefined;
      timeZones?: string[];
    };
    return [...(locale.getTimeZones?.() ?? locale.timeZones ?? [])];
  } catch {
    return [];
  }
};

/** A zone or a search as the picker compares them: lowercase, `_` and `/` read as spaces. */
const searchable = (text: string) => text.toLowerCase().replace(/[_/]+/g, " ").trim();

/**
 * The zones that match what was typed, in the order given: every word of the search is in the
 * zone's name (`vienna`, `europe vie`, `new york` and `America/New_York` all find theirs).
 */
export const filterTimeZones = (zones: readonly string[], query: string): string[] => {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...zones];
  return zones.filter((zone) => {
    const name = searchable(zone);
    return words.every((word) => name.includes(word));
  });
};

/** `a` and `b` hold the same items in the same order. */
export const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);
