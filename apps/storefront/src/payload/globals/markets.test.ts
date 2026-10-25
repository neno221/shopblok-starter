import type { Payload, PayloadRequest, TextFieldSingleValidation } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEnabledLanguages, filterAvailableLocales } from "../filter-available-locales";
import { Markets, countryCode, htmlLang, medusaLocale } from "./markets";

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

describe("htmlLang (PR 70 review, item 1)", () => {
  it("accepts a language tag, as written", () => {
    for (const value of ["pt-BR", "de-CH", "mn", "zh-Hant-TW", "pt-br"]) {
      expect(htmlLang(value, optional)).toBe(true);
    }
  });

  it("rejects what next-intl would hand to Intl and Intl would refuse, and says what to write", () => {
    for (const value of ["pt_BR", "Portuguese", "pt BR", " pt-BR", "pt-", "pt-BR,en"]) {
      expect(htmlLang(value, optional)).toBe(
        `"${value}" is not a language tag. Use a code such as pt-BR or de-CH, or leave it empty.`,
      );
    }
  });

  it("lets the optional field stay empty", () => {
    for (const value of [undefined, null, ""]) expect(htmlLang(value, optional)).toBe(true);
  });

  it("keeps Payload's required check when a field asks for it", () => {
    for (const value of [undefined, null, ""]) {
      expect(htmlLang(value, required)).toBe("validation:required");
    }
  });

  it("is on the language row's field", () => {
    const languages = Markets.fields.find((field) => "name" in field && field.name === "languages");
    const field =
      languages !== undefined && "fields" in languages
        ? languages.fields.find((candidate) => "name" in candidate && candidate.name === "htmlLang")
        : undefined;
    expect(field).toMatchObject({ type: "text", validate: htmlLang });
  });
});

describe("saving the markets global", () => {
  beforeEach(() => {
    clearEnabledLanguages();
    // A frozen clock, so a slow CI machine cannot let the filter's memo expire between two calls.
    vi.spyOn(performance, "now").mockReturnValue(1_000);
  });
  afterEach(() => vi.restoreAllMocks());

  it("makes the admin's locale selector offer the saved languages at once (S3)", async () => {
    // The filter keeps one read of `markets` for a moment, and Payload commits a save after its
    // hooks, so a read in between still gets the old document (`findGlobal` below never changes).
    // Which hooks the global has, and in what order, is not the point (M4 adds one that
    // revalidates the market map): all of them run, as Payload runs them.
    const findGlobal = vi.fn().mockResolvedValue({ countries: [] });
    const payload = { findGlobal, logger: { warn: vi.fn() } } as unknown as Payload;
    const req = { context: {}, payload } as unknown as PayloadRequest;
    const locales = ["en", "de", "el"].map((code) => ({ code, label: code }));
    const codes = async () =>
      (await filterAvailableLocales({ locales, req })).map((locale) => locale.code);

    expect(await codes()).toEqual(["en"]);

    const doc = { countries: [{ enabled: true, languages: ["de"] }] };
    const hooks = Markets.hooks?.afterChange ?? [];
    expect(hooks.length).toBeGreaterThan(0);
    for (const hook of hooks) {
      await hook({ doc, global: Markets, previousDoc: {}, req } as never);
    }

    expect(await codes()).toEqual(["en", "de"]);
  });
});
