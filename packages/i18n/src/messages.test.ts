import {
  parse,
  TYPE,
  type MessageFormatElement,
  type PluralElement,
} from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { catalogs, LOCALES, type Locale } from "./index";

// The catalogs' parity (D43): every locale has English's keys, each message is valid ICU, and each
// has the same arguments as English's, of the same kinds. TypeScript already checks the keys of the
// three object literals against `Messages`; this checks what it cannot see: a renamed or dropped
// `{count}`, a `plural` turned into a plain argument, or a catalog built some other way.

/** Every message of a catalog, by its path (`atoms.stock.low`). */
function messagesOf(catalog: object, prefix = ""): Map<string, string> {
  const found = new Map<string, string>();
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") found.set(path, value);
    else for (const [child, text] of messagesOf(value as object, path)) found.set(child, text);
  }
  return found;
}

const kinds: Partial<Record<TYPE, string>> = {
  [TYPE.argument]: "argument",
  [TYPE.number]: "number",
  [TYPE.date]: "date",
  [TYPE.time]: "time",
  [TYPE.select]: "select",
  [TYPE.plural]: "plural",
  [TYPE.tag]: "tag",
};

/** A message's arguments and their kinds (`count: plural`), with those inside plurals and selects. */
function argumentsOf(elements: MessageFormatElement[], into = new Map<string, string>()) {
  for (const element of elements) {
    const kind = kinds[element.type];
    if (kind !== undefined && "value" in element && typeof element.value === "string") {
      const ordinal = element.type === TYPE.plural && element.pluralType === "ordinal";
      into.set(element.value, ordinal ? "selectordinal" : kind);
    }
    if (element.type === TYPE.plural || element.type === TYPE.select)
      for (const option of Object.values(element.options)) argumentsOf(option.value, into);
    if (element.type === TYPE.tag) argumentsOf(element.children, into);
  }
  return into;
}

/** The plural elements of a message, at any depth. */
function pluralsOf(elements: MessageFormatElement[]): PluralElement[] {
  return elements.flatMap((element) => {
    if (element.type === TYPE.plural)
      return [element, ...Object.values(element.options).flatMap((o) => pluralsOf(o.value))];
    if (element.type === TYPE.select)
      return Object.values(element.options).flatMap((o) => pluralsOf(o.value));
    return element.type === TYPE.tag ? pluralsOf(element.children) : [];
  });
}

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
