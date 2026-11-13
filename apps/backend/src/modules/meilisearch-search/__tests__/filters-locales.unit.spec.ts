import { compileFilters, idsOnly } from "../filters";
import { isLocaleCode, localeIndexUid, meilisearchLanguage, splitLocaleIndex } from "../locales";

describe("compileFilters", () => {
  it("writes the storefront's listing filters (T50) as Meilisearch expressions", () => {
    expect(
      compileFilters({
        $and: [
          { category_ids: ["pcat_1", "pcat_2"] },
          { option_value_ids: ["optval_1"] },
          { min_price_eur: { $gte: 10, $lte: 50 } },
          { on_sale_eur: true },
        ],
      }),
    ).toBe(
      '(category_ids IN ["pcat_1", "pcat_2"] AND option_value_ids IN ["optval_1"] AND ' +
        "(min_price_eur >= 10 AND min_price_eur <= 50) AND on_sale_eur = true)",
    );
  });

  it("scopes like the store route: a value, and a list of sales channels", () => {
    expect(compileFilters({ status: "published", sales_channel_ids: { $in: ["sc_1"] } })).toBe(
      'status = "published" AND sales_channel_ids IN ["sc_1"]',
    );
  });

  it("covers every operator Meilisearch can express", () => {
    expect(compileFilters({ a: { $eq: "x" } })).toBe('a = "x"');
    expect(compileFilters({ a: { $ne: "x" } })).toBe('a != "x"');
    expect(compileFilters({ a: { $eq: null } })).toBe("a IS NULL");
    expect(compileFilters({ a: { $ne: null } })).toBe("a IS NOT NULL");
    expect(compileFilters({ a: null })).toBe("a IS NULL");
    expect(compileFilters({ a: { $nin: [1, 2] } })).toBe("a NOT IN [1, 2]");
    expect(compileFilters({ a: { $overlaps: ["x"] } })).toBe('a IN ["x"]');
    expect(compileFilters({ a: { $lt: 1, $gt: 0 } })).toBe("(a < 1 AND a > 0)");
    expect(compileFilters({ a: { $exists: true } })).toBe("a EXISTS");
    expect(compileFilters({ a: { $exists: false } })).toBe("a NOT EXISTS");
    expect(compileFilters({ a: { $contains: ["x", "y"] } })).toBe('a = "x" AND a = "y"');
    expect(compileFilters({ $not: { a: "x" } })).toBe('NOT (a = "x")');
    expect(compileFilters({ $or: [{ a: "x" }, { b: 2 }] })).toBe('(a = "x" OR b = 2)');
    expect(compileFilters({ created_at: { $gte: new Date("2026-01-01T00:00:00Z") } })).toBe(
      'created_at >= "2026-01-01T00:00:00.000Z"',
    );
  });

  it("matches nothing for an empty list of ids, and for an $or with no alternative", () => {
    expect(compileFilters({ id: [] })).toBe("id IN []");
    expect(compileFilters({ $or: [] })).toBe("id IN []");
    expect(compileFilters({ $or: [] }, "sku")).toBe("sku IN []");
  });

  it("treats a condition-free part as no constraint", () => {
    expect(compileFilters({})).toBeUndefined();
    expect(compileFilters({ q: "shirt" })).toBeUndefined();
    expect(compileFilters({ $and: [{}, { a: 1 }] })).toBe("(a = 1)");
    // One alternative that matches everything makes the whole $or match everything.
    expect(compileFilters({ $or: [{}, { a: 1 }] })).toBeUndefined();
  });

  it("escapes quotes and backslashes in strings", () => {
    expect(compileFilters({ a: 'he said "hi" \\ ok' })).toBe('a = "he said \\"hi\\" \\\\ ok"');
  });

  it("refuses what Meilisearch cannot express, rather than approximating it", () => {
    expect(() => compileFilters({ title: { $prefix: "Lin" } })).toThrow(/\$prefix/);
    expect(() => compileFilters({ title: { $like: "inen" } })).toThrow(/\$like/);
    expect(() => compileFilters({ a: { $in: "x" } })).toThrow(/list of values/);
    expect(() => compileFilters({ "a = 1 OR b": 1 })).toThrow(/field path/);
    expect(() => compileFilters({ a: { $gt: Number.NaN } })).toThrow(/number/);
  });
});

describe("idsOnly", () => {
  it("recognises a delete by id, in each of its shapes", () => {
    expect(idsOnly({ id: ["a", "b"] }, "id")).toEqual(["a", "b"]);
    expect(idsOnly({ id: "a" }, "id")).toEqual(["a"]);
    expect(idsOnly({ id: { $in: ["a"] } }, "id")).toEqual(["a"]);
  });

  it("leaves any other filter to the filter path", () => {
    expect(idsOnly({ id: ["a"], status: "draft" }, "id")).toBeUndefined();
    expect(idsOnly({ status: "draft" }, "id")).toBeUndefined();
    expect(idsOnly({ id: { $in: ["a"], $ne: "b" } }, "id")).toBeUndefined();
  });
});

describe("locales", () => {
  it("gives Meilisearch's language for a locale, and none for Mongolian", () => {
    expect(meilisearchLanguage("el-GR")).toBe("el");
    expect(meilisearchLanguage("pt-BR")).toBe("pt");
    expect(meilisearchLanguage("fa-IR")).toBe("fa");
    expect(meilisearchLanguage("mn-MN")).toBeUndefined();
  });

  it("accepts only locale codes, so nothing else reaches an index uid", () => {
    for (const code of ["en-US", "el-GR", "zh-Hans-CN", "fil-PH", "de"]) {
      expect(isLocaleCode(code)).toBe(true);
    }

    for (const code of ["", "en_US", "../x", "en-US/x", "e", "en-US-x-y-z", 42]) {
      expect(isLocaleCode(code)).toBe(false);
    }
  });

  it("names a locale's index after the version, and splits it back", () => {
    expect(localeIndexUid("shop_product_v3", "el-GR")).toBe("shop_product_v3__el-GR");
    expect(splitLocaleIndex("shop_product_v3__el-GR")).toEqual({
      physical: "shop_product_v3",
      locale: "el-GR",
    });
    // A prefix with `__` in it, and a plain index, stay whole.
    expect(splitLocaleIndex("a__b_product_v1__de-DE")).toEqual({
      physical: "a__b_product_v1",
      locale: "de-DE",
    });
    expect(splitLocaleIndex("product_v1")).toEqual({ physical: "product_v1" });
    expect(splitLocaleIndex("movies__en-US")).toEqual({ physical: "movies__en-US" });
  });
});
