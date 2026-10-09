import { DEFAULT_LOCALE as STORE_DEFAULT_LOCALE, LOCALES as STORE_LOCALES } from "@shopblok/i18n";
import { describe, expect, it } from "vitest";
import { medusaLocaleCodes } from "../test-support/medusa-locale-codes";
import {
  DEFAULT_LOCALE,
  EU_LANGUAGES,
  EXTRA_LANGUAGES,
  LANGUAGES,
  LOCALES,
  MEDUSA_LANGUAGES,
  languageLabel,
} from "./locales";

describe("LANGUAGES", () => {
  it("has the 42 languages of the plan (D17), the default first, with no duplicate", () => {
    expect(LANGUAGES).toHaveLength(42);
    expect(new Set(LANGUAGES).size).toBe(LANGUAGES.length);
    expect(LANGUAGES[0]).toBe(DEFAULT_LOCALE);
  });

  it("holds the 24 EU languages and the seven the plan names", () => {
    expect(EU_LANGUAGES).toHaveLength(24);
    for (const code of [...EU_LANGUAGES, ...EXTRA_LANGUAGES]) expect(LANGUAGES).toContain(code);
  });

  it("agrees with the storefront's own language list on the default and the languages", () => {
    // Two lists in two packages (the storefront's UI catalogs, Payload's content locales).
    expect(DEFAULT_LOCALE).toBe(STORE_DEFAULT_LOCALE);
    for (const code of STORE_LOCALES) expect(LANGUAGES).toContain(code);
  });

  it("holds a plain ISO 639-1 code each, so no country variant needs a migration", () => {
    for (const code of LANGUAGES) expect(code).toMatch(/^[a-z]{2}$/);
  });

  it("covers the language of every locale Medusa ships (D17)", () => {
    const codes = medusaLocaleCodes();
    // 51 in 2.21.2; a floor that catches a pattern that stopped matching, not a new locale.
    expect(codes.length).toBeGreaterThanOrEqual(51);
    const languages = [...new Set(codes.map((code) => code.split("-")[0]!))];
    expect(languages.sort()).toEqual([...MEDUSA_LANGUAGES].sort());
    for (const language of languages) expect(LANGUAGES).toContain(language);
  });
});

describe("LOCALES", () => {
  it("is one locale object per language, in the same order", () => {
    expect(LOCALES.map((locale) => locale.code)).toEqual([...LANGUAGES]);
  });

  it("labels each language in itself, and marks Arabic and Hebrew right-to-left", () => {
    const byCode = Object.fromEntries(LOCALES.map((locale) => [locale.code, locale]));
    expect(byCode["en"]?.label).toBe("English");
    expect(byCode["el"]?.label).toBe("Ελληνικά");
    expect(byCode["de"]?.label).toBe("Deutsch");
    expect(LOCALES.filter((locale) => locale.rtl).map((locale) => locale.code)).toEqual([
      "ar",
      "he",
    ]);
  });
});

describe("languageLabel", () => {
  it("falls back to the code for something ICU does not know", () => {
    expect(languageLabel("zz")).toBe("zz");
    expect(languageLabel("not a code")).toBe("not a code");
  });
});
