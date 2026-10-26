import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLISHABLE_KEY, stubMedusaFetch } from "../../test-support/medusa-fetch";
import { wireHoodie, wireMug } from "../../test-support/medusa-wire";

const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag, cacheLife: vi.fn() }));

const { toProductDto, toStock } = await import("./products");

describe("toStock (D61's three words)", () => {
  it("is in stock for an untracked variant, whatever its count", () => {
    expect(toStock({ id: "v", manage_inventory: false, inventory_quantity: 0 })).toEqual({
      status: "in-stock",
    });
  });

  it("is low under five, with the count, and out at none", () => {
    expect(toStock({ id: "v", manage_inventory: true, inventory_quantity: 3 })).toEqual({
      status: "low",
      quantity: 3,
    });
    expect(toStock({ id: "v", manage_inventory: true, inventory_quantity: 5 })).toEqual({
      status: "in-stock",
    });
    expect(toStock({ id: "v", manage_inventory: true, inventory_quantity: 0 })).toEqual({
      status: "out",
    });
  });

  it("is never out for a variant sold on backorder", () => {
    expect(
      toStock({ id: "v", manage_inventory: true, inventory_quantity: 0, allow_backorder: true }),
    ).toEqual({
      status: "in-stock",
    });
  });
});

describe("toProductDto", () => {
  it("keeps ids and texts, each variant's option values, prices and stock", () => {
    const product = toProductDto(wireHoodie);
    expect(
      product.options.map((option) => [option.id, option.title, option.values.length]),
    ).toEqual([
      ["opt_colour", "Χρώμα", 2],
      ["opt_size", "Μέγεθος", 2],
    ]);
    expect(
      product.variants.map((variant) => [
        variant.id,
        variant.options,
        variant.price?.amount,
        variant.compareAt?.amount,
        variant.stock.status,
        variant.available,
      ]),
    ).toEqual([
      [
        "variant_black_s",
        { opt_size: "optval_s", opt_colour: "optval_black" },
        59,
        undefined,
        "in-stock",
        true,
      ],
      [
        "variant_black_m",
        { opt_size: "optval_m", opt_colour: "optval_black" },
        49,
        59,
        "low",
        true,
      ],
      [
        "variant_navy_s",
        { opt_size: "optval_s", opt_colour: "optval_navy" },
        59,
        undefined,
        "out",
        false,
      ],
    ]);
    expect(product.categories).toEqual([{ id: "pcat_apparel", handle: "apparel", name: "Ρούχα" }]);
  });

  it("keeps no field of the SDK's product it does not name", () => {
    const product = toProductDto({
      ...wireMug,
      ...({ metadata: { secret: 1 }, created_at: "x" } as object),
    });
    expect(Object.keys(product).sort()).toEqual(
      [
        "categories",
        "collectionId",
        "description",
        "handle",
        "id",
        "images",
        "options",
        "subtitle",
        "tagIds",
        "thumbnail",
        "title",
        "variants",
      ].sort(),
    );
  });
});

describe("the product reads, through the SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    cacheTag.mockClear();
    vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("getProduct asks by handle in the region and locale, and tags the handle (D58)", async () => {
    const calls = stubMedusaFetch(() => ({
      body: { products: [wireHoodie], count: 1, offset: 0, limit: 1 },
    }));
    const { getProduct } = await import("./products");
    const product = await getProduct("demo-heritage-hoodie", {
      regionId: "reg_eu",
      locale: "el-GR",
    });
    expect(product?.id).toBe("prod_hoodie");
    const { url, headers } = calls[0]!;
    expect([url.searchParams.get("handle"), url.searchParams.get("region_id")]).toEqual([
      "demo-heritage-hoodie",
      "reg_eu",
    ]);
    expect(url.searchParams.get("fields")).toContain("+variants.inventory_quantity");
    expect(headers.get("x-medusa-locale")).toBe("el-GR");
    expect(cacheTag).toHaveBeenCalledWith("medusa:products", "product:demo-heritage-hoodie");
  });

  it("getProduct is null for a handle the channel does not sell", async () => {
    stubMedusaFetch(() => ({ body: { products: [], count: 0, offset: 0, limit: 1 } }));
    const { getProduct } = await import("./products");
    expect(await getProduct("nope", { regionId: "reg_eu", locale: "el-GR" })).toBeNull();
  });

  it("listProductsByIds keeps the order asked for and drops the ids Medusa did not answer", async () => {
    const calls = stubMedusaFetch(() => ({
      body: { products: [wireMug, wireHoodie], count: 2, offset: 0, limit: 3 },
    }));
    const { listProductsByIds } = await import("./products");
    const products = await listProductsByIds(
      ["prod_hoodie", "prod_gone", "prod_mug", "prod_hoodie"],
      {
        regionId: "reg_eu",
        locale: "el-GR",
      },
    );
    expect(products.map((product) => product.id)).toEqual(["prod_hoodie", "prod_mug"]);
    // The SDK writes a list as `id[0]=…&id[1]=…`, which Medusa reads as `id[]`.
    const ids = [...(calls[0]?.url.searchParams.entries() ?? [])].filter(([key]) =>
      /^id\[\d+\]$/.test(key),
    );
    expect(ids.map(([, value]) => value)).toEqual(["prod_hoodie", "prod_gone", "prod_mug"]);
  });

  it("listProductHandles pages in handle order up to the limit (D58's prerender cap)", async () => {
    const calls = stubMedusaFetch((call) => {
      const offset = Number(call.url.searchParams.get("offset"));
      const limit = Number(call.url.searchParams.get("limit"));
      const all = Array.from({ length: 150 }, (_, index) => ({
        handle: `p-${String(index).padStart(3, "0")}`,
      }));
      return {
        body: { products: all.slice(offset, offset + limit), count: all.length, offset, limit },
      };
    });
    const { listProductHandles } = await import("./products");
    const handles = await listProductHandles(120);
    expect(handles).toHaveLength(120);
    expect(handles.at(-1)).toBe("p-119");
    expect(
      calls.map((call) => [call.url.searchParams.get("order"), call.url.searchParams.get("limit")]),
    ).toEqual([
      ["handle", "100"],
      ["handle", "20"],
    ]);
  });
});
