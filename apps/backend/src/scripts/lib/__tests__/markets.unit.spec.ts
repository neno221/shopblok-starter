import {
  MARKET_REGIONS,
  MEDUSA_DEFAULT_STORE_NAME,
  STORE_NAME,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  TRANSLATED_LOCALES,
} from "../markets";

describe("market data", () => {
  // A shop opens a market by editing config/markets.ts, so these tests check that the committed
  // markets are there and the lists hold together, not that they are the only ones.
  it("has the four regions of the plan, with the currencies and countries it lists", () => {
    expect(MARKET_REGIONS.map((r) => [r.name, r.currency_code, [...r.countries].sort()])).toEqual(
      expect.arrayContaining([
        ["Europe", "eur", ["cy", "de", "fr"]],
        ["United States", "usd", ["us"]],
        ["United Kingdom", "gbp", ["gb"]],
        ["Switzerland", "chf", ["ch"]],
      ]),
    );
  });

  it("puts a country in one region only (Medusa refuses a second)", () => {
    const countries = MARKET_REGIONS.flatMap((r) => r.countries);

    expect(new Set(countries).size).toBe(countries.length);
    expect(countries.every((c) => /^[a-z]{2}$/.test(c))).toBe(true);
  });

  it("sells every region in a currency the store supports, with EUR as the one default", () => {
    const supported = SUPPORTED_CURRENCIES.map((c) => c.currency_code);

    expect(new Set(supported).size).toBe(supported.length);
    expect(SUPPORTED_CURRENCIES.filter((c) => c.is_default).map((c) => c.currency_code)).toEqual([
      "eur",
    ]);
    expect(MARKET_REGIONS.every((r) => supported.includes(r.currency_code))).toBe(true);
    expect(MARKET_REGIONS.every((r) => r.standard_shipping > 0)).toBe(true);
  });

  it("has one locale per language (D8), and translates all but English", () => {
    const languages = SUPPORTED_LOCALES.map((locale) => locale.split("-")[0]);

    expect(new Set(languages).size).toBe(languages.length);
    expect([...TRANSLATED_LOCALES]).toEqual(["el-GR", "de-DE", "fr-FR"]);
  });

  it("names the store for the shop, not Medusa", () => {
    expect(STORE_NAME).toBe("Shopbloks Starter");
    expect(MEDUSA_DEFAULT_STORE_NAME).toBe("Medusa Store");
    expect(STORE_NAME).not.toBe(MEDUSA_DEFAULT_STORE_NAME);
  });

  it("uses lower-case ISO 4217 codes and BCP 47 locales that Medusa ships", () => {
    expect(SUPPORTED_CURRENCIES.every((c) => /^[a-z]{3}$/.test(c.currency_code))).toBe(true);
    expect(SUPPORTED_LOCALES.every((l) => /^[a-z]{2}-[A-Z]{2}$/.test(l))).toBe(true);
    expect(SUPPORTED_LOCALES).toEqual(expect.arrayContaining([...TRANSLATED_LOCALES, "en-US"]));
  });
});
