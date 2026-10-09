import {
  buildVariants,
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_OPTIONS,
  DEMO_PRODUCTS,
} from "../demo-catalog";
import { SUPPORTED_CURRENCIES, TRANSLATED_LOCALES } from "../markets";

const currencies = SUPPORTED_CURRENCIES.map((c) => c.currency_code);

describe("demo catalog data", () => {
  it("is about 8 products, 3 categories and 2 collections (T07)", () => {
    expect(DEMO_PRODUCTS).toHaveLength(8);
    expect(DEMO_CATEGORIES).toHaveLength(3);
    expect(DEMO_COLLECTIONS).toHaveLength(2);
  });

  it("identifies everything by a unique handle, which is how a second run finds its rows", () => {
    for (const rows of [DEMO_PRODUCTS, DEMO_CATEGORIES, DEMO_COLLECTIONS]) {
      const handles = rows.map((r) => r.handle);

      expect(new Set(handles).size).toBe(handles.length);
      expect(handles.every((h) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(h))).toBe(true);
    }

    expect(DEMO_PRODUCTS.every((p) => p.handle.startsWith("demo-"))).toBe(true);
  });

  it("points every product at a category, a collection, and option values that exist", () => {
    for (const product of DEMO_PRODUCTS) {
      expect(DEMO_CATEGORIES.map((c) => c.handle)).toContain(product.category);
      expect(DEMO_COLLECTIONS.map((c) => c.handle)).toContain(product.collection);
      expect(Object.keys(product.options).length).toBeGreaterThan(0);

      for (const [title, values] of Object.entries(product.options)) {
        const option = DEMO_OPTIONS.find((o) => o.title === title);

        expect(option).toBeDefined();
        expect(values.length).toBeGreaterThan(0);

        for (const value of values) {
          expect(option!.values).toContain(value);
        }
      }
    }
  });

  it("prices every product in all four currencies", () => {
    for (const product of DEMO_PRODUCTS) {
      expect(Object.keys(product.prices).sort()).toEqual([...currencies].sort());
      expect(Object.values(product.prices).every((p) => p > 0)).toBe(true);
    }
  });

  it("translates what T07 lists, into every translated locale, with real text", () => {
    for (const product of DEMO_PRODUCTS) {
      expect(Object.keys(product.translations).sort()).toEqual([...TRANSLATED_LOCALES].sort());

      for (const locale of TRANSLATED_LOCALES) {
        const { title, description } = product.translations[locale];

        expect(title.trim()).not.toBe("");
        expect(description.trim()).not.toBe("");
        expect(title).not.toBe(product.title);
        expect(description).not.toBe(product.description);
      }
    }

    for (const row of [...DEMO_CATEGORIES, ...DEMO_COLLECTIONS, ...DEMO_OPTIONS]) {
      expect(Object.keys(row.translations).sort()).toEqual([...TRANSLATED_LOCALES].sort());
      expect(Object.values(row.translations).every((t) => String(t).trim() !== "")).toBe(true);
    }

    for (const option of DEMO_OPTIONS) {
      for (const [value, byLocale] of Object.entries(option.valueTranslations)) {
        expect(option.values).toContain(value);
        expect(Object.keys(byLocale).sort()).toEqual([...TRANSLATED_LOCALES].sort());
      }
    }
  });
});

describe("buildVariants", () => {
  it("makes one variant per combination of option values", () => {
    const tee = DEMO_PRODUCTS.find((p) => p.handle === "demo-classic-tee")!;
    const variants = buildVariants(tee);

    expect(variants).toHaveLength(4 * 2);
    expect(variants[0].title).toBe("S / Black");
    expect(variants[0].options).toEqual({ Size: "S", Color: "Black" });
    expect(variants.at(-1)!.title).toBe("XL / White");
  });

  it("gives a one-option product one variant per value", () => {
    const cap = DEMO_PRODUCTS.find((p) => p.handle === "demo-canvas-cap")!;

    expect(buildVariants(cap).map((v) => v.title)).toEqual(["Black", "White", "Navy"]);
  });

  it("prices each variant in every currency, as is (no cents), and tracks no stock", () => {
    const [variant] = buildVariants(DEMO_PRODUCTS[0]);

    expect(variant.prices).toEqual([
      { currency_code: "eur", amount: 25 },
      { currency_code: "usd", amount: 28 },
      { currency_code: "gbp", amount: 22 },
      { currency_code: "chf", amount: 26 },
    ]);
    expect(variant.manage_inventory).toBe(false);
  });

  it("derives stable, unique SKUs and the same variants every time", () => {
    const skus = DEMO_PRODUCTS.flatMap((p) => buildVariants(p).map((v) => v.sku));

    expect(new Set(skus).size).toBe(skus.length);
    expect(skus[0]).toBe("DEMO-CLASSIC-TEE-S-BLACK");
    expect(buildVariants(DEMO_PRODUCTS[1])).toEqual(buildVariants(DEMO_PRODUCTS[1]));
  });
});
