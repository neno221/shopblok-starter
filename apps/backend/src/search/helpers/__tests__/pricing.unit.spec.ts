import { SUPPORTED_CURRENCIES } from "../../../config/markets";
import { PRICE_CURRENCIES, priceFields, toProductPricing } from "../pricing";

const storeCurrencies = SUPPORTED_CURRENCIES.map((c) => c.currency_code);

describe("search price currencies", () => {
  it("are the currencies the store sells in, so every market can filter and sort by price", () => {
    expect([...PRICE_CURRENCIES]).toEqual(storeCurrencies);
    expect(storeCurrencies).toEqual(expect.arrayContaining(["eur", "usd", "gbp", "chf"]));
  });

  it("give each currency its own price fields in the index schema", () => {
    const names = Object.keys(priceFields);

    for (const currency of storeCurrencies) {
      for (const field of ["min_price", "max_price", "original_price", "on_sale"]) {
        expect(names).toContain(`${field}_${currency}`);
      }
    }
    expect(names).toHaveLength(storeCurrencies.length * 4);
  });

  it("write a product's price in every currency it has one in, GBP and CHF included", () => {
    const priced = (amount: number, original = amount) => [
      { calculated_price: { calculated_amount: amount, original_amount: original } },
    ];

    const pricing = toProductPricing({
      eur: priced(25),
      usd: priced(28),
      gbp: priced(22, 30),
      chf: priced(26),
    });

    expect(pricing).toMatchObject({
      min_price_gbp: 22,
      max_price_gbp: 22,
      original_price_gbp: 30,
      on_sale_gbp: true,
      min_price_chf: 26,
      on_sale_chf: false,
    });
  });

  it("leave a currency out when the product has no price in it", () => {
    const pricing = toProductPricing({
      eur: [{ calculated_price: { calculated_amount: 25, original_amount: 25 } }],
    });

    expect(pricing).toHaveProperty("min_price_eur", 25);
    expect(pricing).not.toHaveProperty("min_price_gbp");
  });
});
