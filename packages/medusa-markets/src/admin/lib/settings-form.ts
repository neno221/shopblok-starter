import { localesOfLanguage } from "./format";
import type { MarketsOverview, SettingsBody } from "./types";

// What the Store drawer starts from and what it sends. A save carries only what the admin changed
// (PR 106 review, item 1): the server checks and writes every field it is sent, and a primary
// country in the body also sets Medusa's own Default region, so a field that is merely re-sent
// can override a choice made elsewhere or be refused for a stored value that has gone stale.

const rowOf = (overview: MarketsOverview, code: string) =>
  overview.languages.find((row) => row.code === code);

/** The language's saved locale is no longer one of the store's (removed in Store → Locales). */
export const localeIsGone = (overview: MarketsOverview, code: string): boolean => {
  const saved = rowOf(overview, code)?.medusa_locale;
  return saved !== undefined && !overview.locales.includes(saved);
};

/**
 * Whether a language's store locale is shown, and chosen in the drawer: the store has two or more
 * locales of it (D8's ambiguous case), or the saved one is gone and has to be replaced.
 */
export const showsLocale = (overview: MarketsOverview, code: string): boolean =>
  localesOfLanguage(overview.locales, code).length >= 2 || localeIsGone(overview, code);

/**
 * The locale a language's form starts from: the saved one while it is still one of the store's,
 * else the first store locale of that language, or "" when the store has none.
 */
export const startLocale = (overview: MarketsOverview, code: string): string => {
  const saved = rowOf(overview, code)?.medusa_locale;
  if (saved !== undefined && overview.locales.includes(saved)) return saved;
  return localesOfLanguage(overview.locales, code)[0] ?? "";
};

/** The form's values. */
export type SettingsForm = {
  primary: string;
  fallback: string;
  /** Per language in use: the `<html lang>` text and the chosen store locale. */
  htmlLang: Record<string, string>;
  locale: Record<string, string>;
  /** Send the primary country although it is unchanged, so the default region follows it. */
  matchDefaultRegion: boolean;
};

/** The body of the save: only the fields whose value differs from what is saved. */
export const settingsBody = (
  overview: MarketsOverview,
  languagesInUse: string[],
  form: SettingsForm,
): SettingsBody => {
  const { settings } = overview;
  const languages = languagesInUse
    .filter((code) => form.locale[code] !== "")
    .filter((code) => {
      const row = rowOf(overview, code);
      return (
        row === undefined ||
        row.medusa_locale !== form.locale[code] ||
        (row.html_lang ?? "") !== form.htmlLang[code]!.trim()
      );
    })
    .map((code) => ({
      code,
      medusa_locale: form.locale[code]!,
      html_lang: form.htmlLang[code]!.trim() === "" ? null : form.htmlLang[code]!.trim(),
    }));
  return {
    ...(form.primary !== "" &&
    (form.primary !== settings.primary_country || form.matchDefaultRegion)
      ? { primary_country: form.primary }
      : {}),
    ...(form.fallback !== "" && form.fallback !== settings.fallback_market
      ? { fallback_market: form.fallback }
      : {}),
    ...(languages.length > 0 ? { languages } : {}),
  };
};
