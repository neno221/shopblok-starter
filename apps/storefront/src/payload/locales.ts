import type { Locale } from "payload";
import { MEDUSA_LOCALES } from "../lib/markets/medusa-locales";

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
 * The language of every locale Medusa ships (D17): the 51 BCP 47 codes in `MEDUSA_LOCALES` give
 * these 36 languages, in order of first appearance. A shop can enable a language in `markets` only
 * if Payload has it, so a language that Medusa can sell in must be here. `medusa-locales.test.ts`
 * reads Medusa's file and fails when a new release changes the codes.
 */
const MEDUSA_LANGUAGES: readonly string[] = [
  ...new Set(MEDUSA_LOCALES.map((code) => code.slice(0, code.indexOf("-")))),
];

/** Languages the plan lists beyond the two sets above. Medusa already covers all seven today. */
export const EXTRA_LANGUAGES = ["ar", "ja", "nb", "ru", "tr", "uk", "zh"] as const;

/**
 * Every language Payload preloads: 42 today. They share one `_locales` enum in Postgres (and three
 * more with the same values), so enabling a language in `markets` needs no migration. Country
 * variants such as `de-CH` are not needed, because a market's country comes from the URL.
 *
 * A language outside this list is one line here plus a saved migration (`payload migrate:create`,
 * four `ALTER TYPE … ADD VALUE`, a few milliseconds): SETUP.md, "A language outside the list".
 * **The list only grows.** A Payload that no longer lists a language deletes that language's
 * content the next time a document is saved, and the migration that removes it fails while any
 * content exists (ADR 0003, L11). Switch a language off in `markets`, never here.
 * `locales.test.ts` compares this list with the saved migrations, so a language added without its
 * migration fails `pnpm test`. The default locale comes first, then the rest in order of first
 * appearance.
 */
export const LANGUAGES: readonly string[] = [
  ...new Set<string>([DEFAULT_LOCALE, ...EU_LANGUAGES, ...MEDUSA_LANGUAGES, ...EXTRA_LANGUAGES]),
];

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
