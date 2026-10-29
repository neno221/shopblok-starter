import { beforeEach, describe, expect, it, vi } from "vitest";

// `catalogReads` (T64): every read of a market's blocks carries its region and its language, so a
// block on `/us` is priced in USD and named in English whatever the page around it.

const calls = vi.hoisted(() => ({ search: [] as unknown[], products: [] as unknown[] }));

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("../../medusa/search", () => ({
  searchProducts: vi.fn(async (input: unknown) => {
    calls.search.push(input);
    return { ids: ["prod_1"] };
  }),
}));
vi.mock("../../medusa/products", () => ({
  listProductsByIds: vi.fn(async (...args: unknown[]) => {
    calls.products.push(args);
    return [];
  }),
  listProductMetadata: vi.fn(async () => ({})),
}));
vi.mock("../../medusa/categories", () => ({ listCategories: vi.fn(async () => []) }));
vi.mock("../../medusa/collections", () => ({ listCollections: vi.fn(async () => []) }));
vi.mock("../../medusa/product-groups", () => ({
  findProductTagId: vi.fn(async () => null),
  listProductIdsOfType: vi.fn(async () => []),
}));

const { catalogReads } = await import("./market");
const { listProductMetadata } = await import("../../medusa/products");

const market = { medusaLocale: "en-US" } as Parameters<typeof catalogReads>[0]["market"];
const region = { id: "reg_us", name: "US", currencyCode: "usd", countries: ["us"] };

beforeEach(() => {
  calls.search.length = 0;
  calls.products.length = 0;
});

describe("catalogReads (T64)", () => {
  it("searches in the market's language and its region's currency", async () => {
    const reads = catalogReads({ market, region });
    expect(await reads.search({ filters: { onSale: true }, sort: "newest", limit: 4 })).toEqual([
      "prod_1",
    ]);
    expect(calls.search).toEqual([
      {
        locale: "en-US",
        currencyCode: "usd",
        query: "",
        filters: { onSale: true },
        sort: "newest",
        page: 1,
        pageSize: 4,
      },
    ]);
  });

  it("prices the products in the market's region, and reads none for no id", async () => {
    const reads = catalogReads({ market, region });
    await reads.products(["prod_2", "prod_1"]);
    await reads.products([]);
    expect(calls.products).toEqual([
      [["prod_2", "prod_1"], { regionId: "reg_us", locale: "en-US" }],
    ]);
  });

  it("reads the metadata by sorted ids and keys, so one entry serves any order", async () => {
    const reads = catalogReads({ market, region });
    await reads.metadata(["b", "a"], ["fit", "material", "fit"]);
    expect(listProductMetadata).toHaveBeenCalledWith(["a", "b"], ["fit", "material"]);
    expect(await reads.metadata([], ["fit"])).toEqual({});
  });
});
