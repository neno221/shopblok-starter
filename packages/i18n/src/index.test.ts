import { describe, expect, it } from "vitest";

import { catalogs, DEFAULT_LOCALE, formatDate, formatMoney, isLocale, LOCALES } from "./index";

// Intl puts no-break spaces (U+00A0, U+202F) between a number and its symbol or digit groups, and
// which one it picks differs between ICU versions. Compare with plain spaces.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");

describe("formatMoney", () => {
  it.each([
    ["el-CY", "EUR", "1.234,50 €"],
    ["en-US", "USD", "$1,234.50"],
    ["en-GB", "GBP", "£1,234.50"],
    ["de-CH", "CHF", "CHF 1’234.50"],
    ["fr-CH", "CHF", "1 234.50 CHF"],
    // Any currency Medusa sells in formats the same way: a shop that opens Brazil or Mongolia
    // needs no change here.
    ["pt-BR", "BRL", "R$ 1.234,50"],
    ["mn-MN", "MNT", "₮ 1,234.50"],
  ])("formats 1234.5 for %s in %s", (locale, currency, expected) => {
    expect(plain(formatMoney(1234.5, currency, locale))).toBe(expected);
  });

  it("takes the amount in major units, never divided by 100", () => {
    expect(formatMoney(12.5, "EUR", "en-US")).toBe("€12.50");
    expect(formatMoney(1250, "EUR", "en-US")).toBe("€1,250.00");
  });

  it("accepts Medusa's lowercase currency codes", () => {
    expect(formatMoney(10, "eur", "en-US")).toBe(formatMoney(10, "EUR", "en-US"));
  });
});

describe("formatDate", () => {
  const options = { dateStyle: "medium", timeZone: "UTC" } as const;
  const date = new Date(Date.UTC(2026, 9, 9, 12));

  it.each([
    ["en-US", "Oct 9, 2026"],
    ["en-GB", "9 Oct 2026"],
    ["de-CH", "09.10.2026"],
    ["el-CY", "9 Οκτ 2026"],
    ["fr-CH", "9 oct. 2026"],
  ])("formats a date for %s", (locale, expected) => {
    expect(plain(formatDate(date, locale, options))).toBe(expected);
  });

  it("takes an ISO string as well as a Date", () => {
    expect(formatDate("2026-10-09T12:00:00Z", "en-GB", options)).toBe("9 Oct 2026");
  });
});

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
    for (const locale of LOCALES) {
      for (const [key, text] of Object.entries(catalogs[locale].wiring)) {
        expect(text.trim(), `${locale}.wiring.${key}`).not.toBe("");
      }
    }
  });
});
