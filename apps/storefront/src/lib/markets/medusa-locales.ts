/**
 * Medusa's 51 locale codes (D8, D17): `defaultLocales` in `@medusajs/translation` 2.21.2,
 * `dist/loaders/defaults.js` (the backend installs it). The storefront can't import that file, so
 * the list is copied here, and `medusa-locales.test.ts` reads the installed one and fails when a
 * Medusa release changes it. A `markets` language names one of these as its `medusaLocale`.
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

export type MedusaLocale = (typeof MEDUSA_LOCALES)[number];

export function isMedusaLocale(code: string): code is MedusaLocale {
  return (MEDUSA_LOCALES as readonly string[]).includes(code);
}

/** Medusa's locales for one language: `pt` gives `pt-BR` and `pt-PT`, the owner's choice (D8). */
export function medusaLocalesOf(language: string): MedusaLocale[] {
  return MEDUSA_LOCALES.filter((code) => code.startsWith(`${language}-`));
}
