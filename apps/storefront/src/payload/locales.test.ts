import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE as STORE_DEFAULT_LOCALE, LOCALES as STORE_LOCALES } from "@shopblok/i18n";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  EU_LANGUAGES,
  EXTRA_LANGUAGES,
  LANGUAGES,
  LOCALES,
  languageLabel,
} from "./locales";

/** The `_locales` enum of every saved migration snapshot, oldest first: what the database had. */
function migratedLocales(): { file: string; values: string[] }[] {
  const dir = path.resolve(import.meta.dirname, "../migrations");
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error(`no migration snapshot in ${dir}`);
  return files.map((file) => {
    const snapshot = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
      enums: Record<string, { values: string[] }>;
    };
    const values = snapshot.enums["public._locales"]?.values;
    if (values === undefined) throw new Error(`${file} has no _locales enum`);
    return { file, values };
  });
}

describe("LANGUAGES", () => {
  it("has at least the 42 languages of the plan (D17), the default first, with no duplicate", () => {
    // "At least": the list only grows (S3, L11; the comment in locales.ts says why).
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(42);
    expect(new Set(LANGUAGES).size).toBe(LANGUAGES.length);
    expect(LANGUAGES[0]).toBe(DEFAULT_LOCALE);
  });

  it("has the same languages as the `_locales` enum of the newest saved migration (S3, L10)", () => {
    // A language added here without `payload migrate:create` would pass every other test and fail
    // the first time someone enables it in `markets` or saves a page in it (HTTP 500). The order
    // does not matter to the database, so it does not matter here.
    const newest = migratedLocales().at(-1);
    expect([...LANGUAGES].sort()).toEqual([...(newest?.values ?? [])].sort());
  });

  it("still lists every language any saved migration ever had (S3, L11)", () => {
    // Removing a language together with a regenerated migration keeps the test above green, and
    // is the data-loss case: a Payload that no longer lists a language deletes its content on the
    // next ordinary save. Only a language added later may be missing from the older snapshots.
    for (const { file, values } of migratedLocales()) {
      expect(
        values.filter((code) => !LANGUAGES.includes(code)),
        `${file}: languages dropped from locales.ts`,
      ).toEqual([]);
    }
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
