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

/** `a` and `b` hold the same items in the same order. */
export const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);
