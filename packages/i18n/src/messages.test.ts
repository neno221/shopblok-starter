import { parse } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { argumentsOf, messagesOf, pluralsOf } from "./icu";
import { catalogs, LOCALES, type Locale } from "./index";

// The catalogs' parity (D43): every locale has English's keys, each message is valid ICU, and each
// has the same arguments as English's, of the same kinds. TypeScript already checks the keys of the
// three object literals against `Messages`; this checks what it cannot see: a renamed or dropped
// `{count}`, a `plural` turned into a plain argument, or a catalog built some other way. The
// helpers are `icu.ts`'s, the ones `ui-strings` (D77) checks an edited message with.

const { designSystem: _chrome, ...englishMessages } = catalogs.en;
const english = messagesOf(englishMessages);
const others = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");

describe("the catalogs (D43)", () => {
  it.each(others)("%s has every key of English's catalog, and no other", (locale) => {
    const keys = [...messagesOf(catalogs[locale]).keys()];
    expect(
      keys.filter((key) => !english.has(key)),
      "keys English does not have",
    ).toEqual([]);
    expect(
      [...english.keys()].filter((key) => !keys.includes(key)),
      "English's keys it lacks",
    ).toEqual([]);
  });

  it.each(LOCALES)("%s's messages are valid ICU and not empty", (locale) => {
    for (const [key, text] of messagesOf(locale === "en" ? englishMessages : catalogs[locale])) {
      expect(text.trim(), `${locale}.${key}`).not.toBe("");
      expect(() => parse(text), `${locale}.${key}`).not.toThrow();
    }
  });

  it.each(others)("%s's messages take English's arguments, of the same kinds", (locale) => {
    const mismatches: string[] = [];
    for (const [key, text] of messagesOf(catalogs[locale])) {
      const source = english.get(key);
      if (source === undefined) continue;
      const theirs = Object.fromEntries(argumentsOf(parse(text)));
      const ours = Object.fromEntries(argumentsOf(parse(source)));
      if (
        JSON.stringify(theirs, Object.keys(theirs).sort()) !==
        JSON.stringify(ours, Object.keys(ours).sort())
      )
        mismatches.push(`${key}: ${JSON.stringify(theirs)}, English ${JSON.stringify(ours)}`);
    }
    expect(mismatches).toEqual([]);
  });

  // next-intl (D62) reads a key as one step of a dotted path (`t("a.b")`) and refuses a key with a
  // dot in it, and it takes a message to be a string; an array or a number would reach the page as
  // a missing message.
  it.each(LOCALES)("%s's keys have no dot and its values are strings or namespaces", (locale) => {
    const problems: string[] = [];
    const visit = (value: object, path: string) => {
      for (const [key, child] of Object.entries(value)) {
        const here = path === "" ? key : `${path}.${key}`;
        if (key.includes(".") || key === "") problems.push(`${here}: a key with a dot or empty`);
        if (typeof child === "object" && child !== null && !Array.isArray(child))
          visit(child, here);
        else if (typeof child !== "string") problems.push(`${here}: ${typeof child}`);
      }
    };
    visit(catalogs[locale], "");
    expect(problems).toEqual([]);
  });

  it.each(LOCALES)("%s's plurals use only its language's CLDR categories", (locale) => {
    const categories = new Set<string>(
      new Intl.PluralRules(locale).resolvedOptions().pluralCategories,
    );
    for (const [key, text] of messagesOf(locale === "en" ? englishMessages : catalogs[locale])) {
      for (const plural of pluralsOf(parse(text))) {
        const unknown = Object.keys(plural.options).filter(
          (option) => !option.startsWith("=") && !categories.has(option),
        );
        expect(unknown, `${locale}.${key}`).toEqual([]);
      }
    }
  });
});
