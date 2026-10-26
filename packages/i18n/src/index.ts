import { designSystem } from "./design-system";
import { de } from "./messages/de";
import { el } from "./messages/el";
import { en, type Messages } from "./messages/en";
import { fr } from "./messages/fr";

// The locale list, the formatters (format.ts) and the message catalogs (messages/, D43): the pages'
// templates, the atoms' and, from M2, the molecules' and organisms' copy, and the
// design-system pages' English chrome (design-system.ts).

export {
  countryName,
  formatDate,
  formatList,
  formatMessage,
  formatMoney,
  formatNumber,
  formatNumberRange,
  languageName,
} from "./format";
export type { MessageValues } from "./format";
export { addressFormat, addressLines, hasAddressFormat, postalCodePattern } from "./address-format";
export type {
  AddressFieldName,
  AddressFormat,
  AddressLine,
  AddressLineKind,
  AddressLinesInput,
  CityName,
  PostalCodeName,
  ProvinceName,
} from "./address-format";
export type { Messages };

/** The store languages (SPEC §8.5) as ISO 639-1 codes. English is the base language. */
export const LOCALES = ["en", "el", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** The authoring language, and the fallback for a missing translation. */
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// English's catalog also holds the design-system chrome (English only, D33).
const english = { ...en, designSystem };

/** Every locale's catalog. */
export const catalogs = { en: english, el, de, fr } satisfies Record<Locale, Messages>;
