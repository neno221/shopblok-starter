import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EU_LANGUAGES, EXTRA_LANGUAGES, LANGUAGES, MEDUSA_LOCALES } from "./languages";

describe("languages.json", () => {
  // The markets plugin (CommonJS, built by `medusa plugin:build`) cannot load this package's raw
  // TypeScript, so it reads the same list as JSON (M4b, T73). The two must not drift.
  it("is LANGUAGES, in the same order", () => {
    const json = JSON.parse(readFileSync(new URL("./languages.json", import.meta.url), "utf8"));
    expect(json).toEqual([...LANGUAGES]);
  });

  it("holds 42 languages, English first, with no duplicate", () => {
    expect(LANGUAGES).toHaveLength(42);
    expect(new Set(LANGUAGES).size).toBe(LANGUAGES.length);
    expect(LANGUAGES[0]).toBe("en");
  });

  it("covers the EU's 24, the language of every Medusa locale and the seven extra", () => {
    expect(EU_LANGUAGES).toHaveLength(24);
    for (const code of [...EU_LANGUAGES, ...EXTRA_LANGUAGES]) expect(LANGUAGES).toContain(code);
    for (const locale of MEDUSA_LOCALES) expect(LANGUAGES).toContain(locale.slice(0, 2));
  });
});
