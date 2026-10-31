// The content languages (D17) and Medusa's locales, moved here from the storefront's
// `payload/locales.ts` and `lib/markets/medusa-locales.ts` (M4b, T73) so that the markets plugin
// checks a market's languages against the same list Payload preloads.
//
// The markets plugin (CommonJS, built by `medusa plugin:build`) cannot load this raw TypeScript, so
// it reads `LANGUAGES` as `languages.json`; `languages.test.ts` fails when the two differ.

/** Payload's default locale, and the one the admin never hides (see `filterAvailableLocales`). */
export const DEFAULT_LOCALE = "en";

/** The 24 official languages of the EU (ISO 639-1). */
export const EU_LANGUAGES = [
  "bg",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "ga",
  "it",
  "lv",
  "lt",
  "mt",
  "pl",
  "pt",
  "ro",
  "sk",
  "sl",
  "es",
  "sv",
] as const;

/**
 * Medusa's 51 locale codes (D8, D17): `defaultLocales` in `@medusajs/translation` 2.21.2,
 * `dist/loaders/defaults.js` (the backend installs it). The storefront can't import that file, so
 * the list is copied here, and the storefront's `medusa-locales.test.ts` reads the installed one
 * and fails when a Medusa release changes it. A `markets` language names one of these as its
 * `medusaLocale`.
 */
export const MEDUSA_LOCALES = [
  "en-US",
  "en-GB",
  "en-AU",
  "en-CA",
  "es-ES",
  "es-MX",
  "es-AR",
  "fr-FR",
  "fr-CA",
  "fr-BE",
  "de-DE",
  "de-AT",
  "de-CH",
  "it-IT",
  "pt-BR",
  "pt-PT",
  "nl-NL",
  "nl-BE",
  "da-DK",
  "sv-SE",
  "nb-NO",
  "fi-FI",
  "pl-PL",
  "lt-LT",
  "cs-CZ",
  "sk-SK",
  "hu-HU",
  "ro-RO",
  "bg-BG",
  "el-GR",
  "tr-TR",
  "ru-RU",
  "uk-UA",
  "ar-SA",
  "ar-AE",
  "ar-EG",
  "he-IL",
  "hi-IN",
  "bn-BD",
  "th-TH",
  "vi-VN",
  "id-ID",
  "ms-MY",
  "tl-PH",
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "ja-JP",
  "ko-KR",
  "ka-GE",
  "mn-MN",
] as const;

/**
 * The language of every locale Medusa ships (D17): the 51 BCP 47 codes in `MEDUSA_LOCALES` give
 * these 36 languages, in order of first appearance. A shop can enable a language in `markets` only
 * if Payload has it, so a language that Medusa can sell in must be in `LANGUAGES`.
 */
const MEDUSA_LANGUAGES: readonly string[] = [
  ...new Set(MEDUSA_LOCALES.map((code) => code.slice(0, code.indexOf("-")))),
];

/** Languages the plan lists beyond the two sets above. Medusa already covers all seven today. */
export const EXTRA_LANGUAGES = ["ar", "ja", "nb", "ru", "tr", "uk", "zh"] as const;

/**
 * Every language Payload preloads: 42 today. They share one `_locales` enum in Postgres (and four
 * more with the same values), so enabling a language in `markets` needs no migration. Country
 * variants such as `de-CH` are not needed, because a market's country comes from the URL. The
 * markets plugin refuses a language outside this list.
 *
 * A language outside this list is one line here, the same in `languages.json`, plus a saved Payload migration
 * (`payload migrate:create`, five `ALTER TYPE … ADD VALUE`, a few milliseconds): SETUP.md, "A
 * language outside the list". **The list only grows.** A Payload that no longer lists a language
 * deletes that language's content the next time a document is saved, and the migration that
 * removes it fails while any content exists (ADR 0003, L11). Switch a language off in the
 * markets, never here. The storefront's `locales.test.ts` compares this list with the saved
 * migrations, so a language added without its migration fails `pnpm test`. English (Payload's
 * default locale) comes first, then the rest in order of first appearance.
 */
export const LANGUAGES: readonly string[] = [
  ...new Set<string>([DEFAULT_LOCALE, ...EU_LANGUAGES, ...MEDUSA_LANGUAGES, ...EXTRA_LANGUAGES]),
];
