import { describe, expect, it } from "vitest";
import { medusaLocaleCodes } from "../../test-support/medusa-locale-codes";
import { MEDUSA_LOCALES, isMedusaLocale, medusaLocalesOf } from "./medusa-locales";

describe("MEDUSA_LOCALES", () => {
  it("is the list in the installed @medusajs/translation, code for code", () => {
    // A Medusa release that adds, drops or renames a locale fails here: update the constant.
    expect([...MEDUSA_LOCALES]).toEqual(medusaLocaleCodes());
  });

  it("has 51 locales, each written language-REGION", () => {
    expect(MEDUSA_LOCALES).toHaveLength(51);
    expect(new Set(MEDUSA_LOCALES).size).toBe(51);
    for (const code of MEDUSA_LOCALES) expect(code).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  });
});

describe("isMedusaLocale", () => {
  it("accepts Medusa's codes exactly as written", () => {
    for (const code of ["en-US", "el-GR", "pt-BR", "pt-PT", "mn-MN", "de-CH"]) {
      expect(isMedusaLocale(code)).toBe(true);
    }
  });

  it("refuses a bare language, another case and a locale Medusa doesn't have", () => {
    for (const code of ["el", "pt", "pt-br", "PT-BR", "el-CY", "en-IE", "", "pt_BR"]) {
      expect(isMedusaLocale(code)).toBe(false);
    }
  });
});

describe("medusaLocalesOf", () => {
  it("lists the owner's choices for a language (D8: pt is pt-BR or pt-PT)", () => {
    expect(medusaLocalesOf("pt")).toEqual(["pt-BR", "pt-PT"]);
    expect(medusaLocalesOf("el")).toEqual(["el-GR"]);
    expect(medusaLocalesOf("de")).toEqual(["de-DE", "de-AT", "de-CH"]);
  });

  it("is empty for a language Medusa has no locale for", () => {
    expect(medusaLocalesOf("hr")).toEqual([]);
    expect(medusaLocalesOf("p")).toEqual([]);
  });
});
