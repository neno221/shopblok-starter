import { designSystemFixtures, designSystemLocales, markets } from "@shopblok/fixtures";
import { catalogs, formatMoney, LOCALES } from "@shopblok/i18n";
import { describe, expect, it } from "vitest";
import { createContext } from "./context";

describe("the design-system fixtures (D33)", () => {
  it("have one fixture per store language, the same list as @shopblok/i18n", () => {
    expect([...designSystemLocales]).toEqual([...LOCALES]);
    expect(Object.keys(designSystemFixtures).sort()).toEqual([...LOCALES].sort());
  });

  it("render each locale with the market D33 names: en-US USD, el-CY EUR, de-DE EUR, fr-CH CHF", () => {
    const summary = LOCALES.map((locale) => {
      const { key, htmlLang, currency } = designSystemFixtures[locale].market;
      return [locale, key, htmlLang, currency];
    });
    expect(summary).toEqual([
      ["en", "en-us", "en-US", "USD"],
      ["el", "el-cy", "el-CY", "EUR"],
      ["de", "de-de", "de-DE", "EUR"],
      ["fr", "fr-ch", "fr-CH", "CHF"],
    ]);
  });

  it("name markets that exist in the seeded market map, with the locale as their language", () => {
    for (const locale of LOCALES) {
      const { market } = designSystemFixtures[locale];
      const country = markets.countries.find((candidate) => candidate.code === market.country);
      expect(country?.enabled, market.key).toBe(true);
      expect(country?.languages, market.key).toContain(market.language);
      expect(market.key).toBe(`${market.language}-${market.country}`);
      expect(market.language).toBe(locale);
      expect(market.htmlLang).toBe(`${market.language}-${market.country.toUpperCase()}`);
    }
  });

  it("have long strings that are longer than the ordinary ones, field by field", () => {
    for (const locale of LOCALES) {
      const { ordinary, long } = designSystemFixtures[locale];
      for (const key of Object.keys(ordinary) as (keyof typeof ordinary)[]) {
        expect(ordinary[key].trim(), `${locale}.ordinary.${key}`).not.toBe("");
        expect(long[key].length, `${locale}.long.${key}`).toBeGreaterThan(ordinary[key].length);
      }
    }
  });

  it("have a sale price under the one it replaces, stock and a rating in range", () => {
    for (const locale of LOCALES) {
      const { prices, stock, rating, sizes, colours } = designSystemFixtures[locale];
      expect(prices.sale.amount).toBeLessThan(prices.sale.original);
      expect(prices.sale.original).toBe(prices.regular);
      expect(stock.outOfStock).toBe(0);
      expect(stock.lowStock).toBeLessThanOrEqual(stock.lowThreshold);
      expect(stock.inStock).toBeGreaterThan(stock.lowThreshold);
      expect(rating.value).toBeGreaterThan(0);
      expect(rating.value).toBeLessThanOrEqual(rating.max);
      expect(sizes.some((size) => !size.available)).toBe(true);
      expect(sizes.some((size) => size.available)).toBe(true);
      for (const colour of colours) expect(colour.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("give the same swatches in every locale, named in the locale", () => {
    const hexes = (locale: (typeof LOCALES)[number]) =>
      designSystemFixtures[locale].colours.map((colour) => colour.hex);
    for (const locale of LOCALES) expect(hexes(locale)).toEqual(hexes("en"));
    expect(designSystemFixtures.el.colours[0]?.name).toBe("Μαύρο");
  });

  it("make createContext format money with the fixture's currency and <html lang>", () => {
    for (const locale of LOCALES) {
      const { market } = designSystemFixtures[locale];
      expect(createContext(locale).money(1249.5)).toBe(
        formatMoney(1249.5, market.currency, market.htmlLang),
      );
    }
  });
});

describe("the design-system chrome", () => {
  it("is English only: the other catalogs have no such key", () => {
    expect(Object.keys(catalogs.en)).toContain("designSystem");
    for (const locale of ["el", "de", "fr"] as const) {
      expect(Object.keys(catalogs[locale])).not.toContain("designSystem");
    }
  });
});
