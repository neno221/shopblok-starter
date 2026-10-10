import type { TextFieldSingleValidation } from "payload";
import type { Payload, PayloadRequest } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEnabledLanguages, filterAvailableLocales } from "../filter-available-locales";
import { Markets, countryCode, medusaLocale } from "./markets";

type Options = Parameters<TextFieldSingleValidation>[1];
// What Payload's own `text` validator reads from the request.
const req = { payload: { config: {} }, t: (key: string) => key };
const optional = { req, required: false } as unknown as Options;
const required = { req, required: true } as unknown as Options;
const message = "Use the two-letter ISO 3166-1 code in lowercase, for example cy";

describe("countryCode", () => {
  it("accepts a two-letter lowercase code", () => {
    expect(countryCode("cy", required)).toBe(true);
    expect(countryCode("ch", optional)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["CY", "c", "cyp", "c1", " cy", "el-cy"]) {
      expect(countryCode(value, optional)).toBe(message);
    }
  });

  it("lets an optional field stay empty (primaryCountry)", () => {
    for (const value of [undefined, null, ""]) expect(countryCode(value, optional)).toBe(true);
  });

  it("keeps Payload's required check for a required field (a country's code)", () => {
    for (const value of [undefined, null, ""]) {
      expect(countryCode(value, required)).toBe("validation:required");
    }
  });
});

describe("medusaLocale (D17)", () => {
  const withLanguage = (code: unknown, required = true) =>
    ({ req, required, siblingData: { code } }) as unknown as Options;

  it("accepts each of Medusa's locales, whichever language the row is for", () => {
    for (const value of ["el-GR", "pt-BR", "pt-PT", "mn-MN", "en-US", "de-CH"]) {
      expect(medusaLocale(value, withLanguage("pt"))).toBe(true);
    }
    // The choice is the owner's: a Croatian shop can serve Medusa's English catalog.
    expect(medusaLocale("en-US", withLanguage("hr"))).toBe(true);
  });

  it("rejects a code Medusa doesn't have, and names the choices for the row's language", () => {
    expect(medusaLocale("pt", withLanguage("pt"))).toBe(
      '"pt" is not a Medusa locale. For pt, use pt-BR or pt-PT.',
    );
    expect(medusaLocale("el-CY", withLanguage("el"))).toBe(
      '"el-CY" is not a Medusa locale. For el, use el-GR.',
    );
    expect(medusaLocale("pt-br", withLanguage("pt"))).toContain("pt-BR or pt-PT");
  });

  it("gives general advice for a language Medusa has no locale for, or no language yet", () => {
    const general = "Use one of Medusa's locales, for example en-US, el-GR or pt-BR.";
    expect(medusaLocale("hr-HR", withLanguage("hr"))).toBe(
      `"hr-HR" is not a Medusa locale. ${general}`,
    );
    expect(medusaLocale("xx", withLanguage(undefined))).toBe(
      `"xx" is not a Medusa locale. ${general}`,
    );
    expect(medusaLocale("xx", { req, required: true } as unknown as Options)).toContain(general);
  });

  it("keeps Payload's required check (the first version of countryCode lost it)", () => {
    for (const value of [undefined, null, ""]) {
      expect(medusaLocale(value, withLanguage("pt"))).toBe("validation:required");
    }
  });

  it("lets an optional field stay empty", () => {
    for (const value of [undefined, null, ""]) {
      expect(medusaLocale(value, withLanguage("pt", false))).toBe(true);
    }
  });
});

describe("saving the markets global", () => {
  beforeEach(() => clearEnabledLanguages());
  afterEach(() => vi.restoreAllMocks());

  it("makes the admin's locale selector read the new languages at once (S3)", async () => {
    // The filter keeps one read of `markets` for a moment; a save must not leave a page that
    // follows it with the old list.
    const findGlobal = vi
      .fn()
      .mockResolvedValueOnce({ countries: [] })
      .mockResolvedValueOnce({ countries: [{ enabled: true, languages: ["de"] }] });
    const payload = { findGlobal, logger: { warn: vi.fn() } } as unknown as Payload;
    const req = { context: {}, payload } as unknown as PayloadRequest;
    const locales = ["en", "de", "el"].map((code) => ({ code, label: code }));
    const codes = async () =>
      (await filterAvailableLocales({ locales, req })).map((locale) => locale.code);

    expect(await codes()).toEqual(["en"]);
    expect(await codes()).toEqual(["en"]);
    expect(findGlobal).toHaveBeenCalledTimes(1);

    const hooks = Markets.hooks?.afterChange ?? [];
    expect(hooks).toHaveLength(1);
    await hooks[0]?.({ doc: {}, global: Markets, previousDoc: {}, req } as never);

    expect(await codes()).toEqual(["en", "de"]);
  });
});
