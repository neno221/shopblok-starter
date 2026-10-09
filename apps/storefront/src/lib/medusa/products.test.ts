import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLISHABLE_KEY, stubMedusaFetch } from "../../test-support/medusa-fetch";
import { lowestPrice } from "./products";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const priced = (
  calculated_amount: number | null | undefined,
  currency_code: string | null = "eur",
) => ({
  calculated_price: { calculated_amount, currency_code },
});

describe("lowestPrice", () => {
  it("is the lowest calculated price over the variants, in the amount Medusa gives (never ÷100)", () => {
    expect(lowestPrice([priced(25), priced(12.5), priced(40)])).toEqual({
      amount: 12.5,
      currencyCode: "eur",
    });
  });

  it("skips variants that have no price", () => {
    expect(
      lowestPrice([{}, { calculated_price: null }, priced(null), priced(undefined), priced(9)]),
    ).toEqual({
      amount: 9,
      currencyCode: "eur",
    });
  });

  it("keeps a price of zero (a free product is a price)", () => {
    expect(lowestPrice([priced(5), priced(0)])).toEqual({ amount: 0, currencyCode: "eur" });
  });

  it("skips a price with no currency, which cannot be shown", () => {
    expect(lowestPrice([priced(1, null), priced(2, "")])).toBeNull();
  });

  it("is null for no variants", () => {
    expect(lowestPrice([])).toBeNull();
    expect(lowestPrice(undefined)).toBeNull();
    expect(lowestPrice(null)).toBeNull();
  });
});

const wireProduct = (id: string, title: string, amounts: number[], currency = "eur") => ({
  id,
  handle: id.replace("prod_", ""),
  title,
  thumbnail: null,
  variants: amounts.map((amount) => ({
    calculated_price: { calculated_amount: amount, currency_code: currency },
  })),
});

describe("listProducts, through the SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("passes the region, the limit, the fields and the locale header (the market's Medusa locale)", async () => {
    const calls = stubMedusaFetch(() => ({
      body: {
        products: [wireProduct("prod_tee", "Κλασικό μπλουζάκι", [25, 27])],
        count: 1,
        offset: 0,
        limit: 4,
      },
    }));
    const { listProducts } = await import("./products");
    const products = await listProducts({ regionId: "reg_eu", locale: "el-GR", limit: 4 });
    expect(calls).toHaveLength(1);
    const { url, headers } = calls[0]!;
    expect(url.pathname).toBe("/store/products");
    expect(url.searchParams.get("region_id")).toBe("reg_eu");
    expect(url.searchParams.get("limit")).toBe("4");
    expect(url.searchParams.get("fields")).toContain("*variants.calculated_price");
    expect(headers.get("x-medusa-locale")).toBe("el-GR");
    expect(headers.get("x-publishable-api-key")).toBe(PUBLISHABLE_KEY);
    expect(products).toEqual([
      {
        id: "prod_tee",
        handle: "tee",
        title: "Κλασικό μπλουζάκι",
        thumbnail: null,
        price: { amount: 25, currencyCode: "eur" },
      },
    ]);
  });

  it("sends each call's own locale and region: the shared SDK keeps none", async () => {
    const calls = stubMedusaFetch(() => ({
      body: { products: [], count: 0, offset: 0, limit: 4 },
    }));
    const { listProducts } = await import("./products");
    await listProducts({ regionId: "reg_us", locale: "en-US", limit: 4 });
    await listProducts({ regionId: "reg_ch", locale: "fr-FR", limit: 4 });
    await listProducts({ regionId: "reg_us", locale: "de-DE", limit: 2 });
    expect(
      calls.map((call) => [
        call.url.searchParams.get("region_id"),
        call.headers.get("x-medusa-locale"),
        call.url.searchParams.get("limit"),
      ]),
    ).toEqual([
      ["reg_us", "en-US", "4"],
      ["reg_ch", "fr-FR", "4"],
      ["reg_us", "de-DE", "2"],
    ]);
  });

  it("works for a currency the starter has never heard of (D17)", async () => {
    stubMedusaFetch(() => ({
      body: {
        products: [wireProduct("prod_a", "Camiseta", [155], "brl")],
        count: 1,
        offset: 0,
        limit: 4,
      },
    }));
    const { listProducts } = await import("./products");
    const [product] = await listProducts({ regionId: "reg_br", locale: "pt-BR", limit: 4 });
    expect(product?.price).toEqual({ amount: 155, currencyCode: "brl" });
  });

  it("returns no products as an empty list", async () => {
    stubMedusaFetch(() => ({ body: { products: [], count: 0, offset: 0, limit: 4 } }));
    const { listProducts } = await import("./products");
    expect(await listProducts({ regionId: "reg_eu", locale: "en-US", limit: 4 })).toEqual([]);
  });

  it("fails with a MedusaRequestError when the backend does not answer", async () => {
    stubMedusaFetch(() => new TypeError("fetch failed"));
    const { listProducts } = await import("./products");
    await expect(
      listProducts({ regionId: "reg_eu", locale: "en-US", limit: 4 }),
    ).rejects.toMatchObject({
      name: "MedusaRequestError",
      kind: "unreachable",
    });
  });
});
