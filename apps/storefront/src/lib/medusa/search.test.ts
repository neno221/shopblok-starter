import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLISHABLE_KEY, stubMedusaFetch } from "../../test-support/medusa-fetch";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { searchBody, toSearchResult } = await import("./search");
type SearchInput = Parameters<typeof searchBody>[0];

const input = (change: Partial<SearchInput> = {}): SearchInput => ({
  locale: "el-GR",
  currencyCode: "eur",
  query: "",
  filters: {},
  sort: "relevance",
  page: 1,
  pageSize: 12,
  ...change,
});

describe("searchBody", () => {
  it("lists every product, newest first, with the facets counted without their own filter", () => {
    expect(searchBody(input())).toEqual({
      entity: "product",
      fields: ["id"],
      filters: {},
      pagination: { skip: 0, take: 12, order: { created_at: "DESC" } },
      search_options: {
        facets: [
          { field: "category_ids", type: "value", limit: 100 },
          { field: "collection_ids", type: "value", limit: 100 },
          { field: "tag_ids", type: "value", limit: 100 },
          { field: "option_value_ids", type: "value", limit: 100 },
          { field: "on_sale_eur", type: "value" },
          { field: "min_price_eur", type: "stats" },
        ],
        disjunctive_facets: true,
      },
    });
  });

  it("never sends search_options.locales: the backend's middleware owns the locale (T43)", () => {
    expect(JSON.stringify(searchBody(input({ query: "κούπα" })))).not.toContain("locales");
  });

  it("keeps the engine's ranking for a query, and pages", () => {
    const body = searchBody(input({ query: "  κούπα ", page: 3 }));
    expect(body.filters).toEqual({ q: "κούπα" });
    expect(body.pagination).toEqual({ skip: 24, take: 12 });
  });

  it("ANDs the groups and ORs the values in one, one option per group", () => {
    const body = searchBody(
      input({
        filters: {
          categoryIds: ["pcat_apparel"],
          optionValueIds: [["optval_black", "optval_navy"], ["optval_m"], []],
          price: { min: 20 },
          onSale: true,
        },
        sort: "price-desc",
      }),
    );
    expect(body.filters).toEqual({
      $and: [
        { category_ids: ["pcat_apparel"] },
        { option_value_ids: ["optval_black", "optval_navy"] },
        { option_value_ids: ["optval_m"] },
        { min_price_eur: { $gte: 20 } },
        { on_sale_eur: true },
      ],
    });
    expect(body.pagination).toMatchObject({ order: { min_price_eur: "DESC" } });
  });

  it("refuses a currency that is not a code, since a field name is built from it", () => {
    expect(() => searchBody(input({ currencyCode: "eur;drop" }))).toThrow(/currency code/);
  });
});

describe("toSearchResult", () => {
  it("keeps the ids in order, the counts, the on-sale count and the price range", () => {
    const result = toSearchResult(input({ pageSize: 2 }), {
      hits: [{ id: "prod_b" }, { id: "prod_a" }],
      facets: {
        category_ids: { type: "value", values: [{ value: "pcat_apparel", count: 4 }] },
        option_value_ids: { type: "value", values: [{ value: "optval_black", count: 2 }] },
        on_sale_eur: {
          type: "value",
          values: [
            { value: "false", count: 6 },
            { value: "true", count: 2 },
          ],
        },
        min_price_eur: { type: "stats", min: 12, max: 59, count: 8 },
      },
      metadata: { count: 8 },
    });
    expect(result).toEqual({
      ids: ["prod_b", "prod_a"],
      total: 8,
      page: 1,
      pageCount: 4,
      facets: {
        categoryIds: [{ value: "pcat_apparel", count: 4 }],
        collectionIds: [],
        tagIds: [],
        optionValueIds: [{ value: "optval_black", count: 2 }],
        onSale: 2,
      },
      priceRange: { min: 12, max: 59 },
    });
  });

  it("has one page and no range when nothing matches", () => {
    expect(toSearchResult(input(), { hits: [], facets: {}, metadata: { count: 0 } })).toMatchObject(
      {
        pageCount: 1,
        priceRange: null,
      },
    );
  });
});

describe("searchProducts, through the SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts the body with the locale header", async () => {
    const calls = stubMedusaFetch(() => ({
      body: { results: [{ hits: [{ id: "prod_mug" }], facets: {}, metadata: { count: 1 } }] },
    }));
    const { searchProducts } = await import("./search");
    const result = await searchProducts(input({ query: "κούπα" }));
    expect(result.ids).toEqual(["prod_mug"]);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url.pathname).toBe("/store/search");
    expect(calls[0]?.headers.get("x-medusa-locale")).toBe("el-GR");
    expect(calls[0]?.body).toMatchObject({ entity: "product", filters: { q: "κούπα" } });
  });
});
