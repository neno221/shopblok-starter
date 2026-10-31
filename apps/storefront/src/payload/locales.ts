import { LANGUAGES } from "@shopblok/i18n/languages";
import type { Locale } from "payload";

// The language lists live in `@shopblok/i18n` (M4b, T73): the markets plugin in Medusa checks a
// market's languages against the same list Payload preloads here. The doc comments, and the rule
// that the list only grows, are on `LANGUAGES` there.
// `DEFAULT_LOCALE` too: `LANGUAGES` starts from it.
export { DEFAULT_LOCALE, EU_LANGUAGES, EXTRA_LANGUAGES, LANGUAGES } from "@shopblok/i18n/languages";

/** Right-to-left languages among `LANGUAGES`. */
const RTL_LANGUAGES: ReadonlySet<string> = new Set(["ar", "he"]);

/** The language's name in itself ("Ελληνικά", "Deutsch"), from the runtime's ICU data. */
export function languageLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return name === undefined || name === code ? code : name;
  } catch {
    return code;
  }
}

/** Payload's `localization.locales`. */
export const LOCALES: Locale[] = LANGUAGES.map((code) => ({
  code,
  label: languageLabel(code),
  ...(RTL_LANGUAGES.has(code) ? { rtl: true } : {}),
}));
