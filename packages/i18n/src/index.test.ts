import { describe, expect, it } from "vitest";
import { catalogs, DEFAULT_LOCALE, isLocale, LOCALES } from "./index";

describe("locales and catalogs", () => {
  it("lists the four store languages, English first", () => {
    expect(LOCALES).toEqual(["en", "el", "de", "fr"]);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("narrows strings to locales", () => {
    expect(isLocale("el")).toBe(true);
    expect(isLocale("el-GR")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("has a non-empty string for every key in every catalog", () => {
    const walk = (value: unknown, path: string): void => {
      if (typeof value === "string") expect(value.trim(), path).not.toBe("");
      else
        for (const [key, child] of Object.entries(value as object)) walk(child, `${path}.${key}`);
    };
    for (const locale of LOCALES) walk(catalogs[locale], locale);
  });

  it("has a non-empty string for every key of the design-system chrome (English only, D33)", () => {
    const walk = (value: unknown, path: string): void => {
      if (typeof value === "string") expect(value.trim(), path).not.toBe("");
      else
        for (const [key, child] of Object.entries(value as object)) walk(child, `${path}.${key}`);
    };
    walk(catalogs.en.designSystem, "en.designSystem");
    for (const locale of ["el", "de", "fr"] as const) {
      expect("designSystem" in catalogs[locale], locale).toBe(false);
    }
  });
});
