import {
  MARKET_REGIONS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  TRANSLATED_LOCALES,
} from "../markets";

describe("market data", () => {
  it("has the four regions of the plan, with the currencies and countries it lists", () => {
    expect(MARKET_REGIONS.map((r) => [r.name, r.currency_code, [...r.countries].sort()])).toEqual([
      ["Europe", "eur", ["cy", "de", "fr"]],
      ["United States", "usd", ["us"]],
      ["United Kingdom", "gbp", ["gb"]],
      ["Switzerland", "chf", ["ch"]],
    ]);
  });

  it("puts a country in one region only (Medusa refuses a second)", () => {
    const countries = MARKET_REGIONS.flatMap((r) => r.countries);

    expect(new Set(countries).size).toBe(countries.length);
    expect(countries.every((c) => /^[a-z]{2}$/.test(c))).toBe(true);
  });

  it("sells every region in a currency the store supports, with EUR as the one default", () => {
    const supported = SUPPORTED_CURRENCIES.map((c) => c.currency_code);

    expect(supported).toEqual(["eur", "usd", "gbp", "chf"]);
    expect(SUPPORTED_CURRENCIES.filter((c) => c.is_default).map((c) => c.currency_code)).toEqual([
      "eur",
    ]);
    expect(MARKET_REGIONS.every((r) => supported.includes(r.currency_code))).toBe(true);
    expect(MARKET_REGIONS.every((r) => r.standard_shipping > 0)).toBe(true);
  });

  it("has one locale per language (D8), and translates all but English", () => {
    expect([...SUPPORTED_LOCALES]).toEqual(["en-US", "el-GR", "de-DE", "fr-FR"]);
    expect([...TRANSLATED_LOCALES]).toEqual(["el-GR", "de-DE", "fr-FR"]);
  });
});
