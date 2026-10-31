import { MEDUSA_LOCALES } from "@shopblok/i18n/languages";

/**
 * Medusa's 51 locale codes (D8, D17). The list moved to `@shopblok/i18n/languages` (M4b, T73), where
 * the markets plugin reads it too; `medusa-locales.test.ts` still reads the installed
 * `@medusajs/translation` and fails when a Medusa release changes it. A `markets` language names
 * one of these as its `medusaLocale`.
 */
export { MEDUSA_LOCALES } from "@shopblok/i18n/languages";

export type MedusaLocale = (typeof MEDUSA_LOCALES)[number];

export function isMedusaLocale(code: string): code is MedusaLocale {
  return (MEDUSA_LOCALES as readonly string[]).includes(code);
}

/** Medusa's locales for one language: `pt` gives `pt-BR` and `pt-PT`, the owner's choice (D8). */
export function medusaLocalesOf(language: string): MedusaLocale[] {
  return MEDUSA_LOCALES.filter((code) => code.startsWith(`${language}-`));
}
