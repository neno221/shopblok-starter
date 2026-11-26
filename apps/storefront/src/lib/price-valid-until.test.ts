import { beforeEach, describe, expect, it, vi } from "vitest";
import { toProductDto, type WireProduct } from "./medusa/products";
import { wireHoodie } from "../test-support/medusa-wire";

// M7 D147 (T110): the offers' `priceValidUntil`. The Store API names the price list a variant's
// price comes from but not when it ends, so `/store/sale-ends` (the backend's) answers that for the
// sale lists the page names; a regular price, a sale without an end and a failed read give none.

const saleEnds = vi.hoisted(() => ({
  answer: {} as Record<string, string>,
  fail: false,
  asked: [] as string[][],
}));

vi.mock("./medusa/sale-ends", () => ({
  getSaleEnds: async (ids: string[]) => {
    saleEnds.asked.push(ids);
    if (saleEnds.fail) throw new Error("Medusa is down");
    return saleEnds.answer;
  },
}));
vi.mock("./cms/catalog", () => ({ readProductContent: async () => null }));

const { priceValidUntil } = await import("./product-read");

type WireVariant = NonNullable<WireProduct["variants"]>[number];

/** The hoodie with each variant's price from the list named (a `sale` one), or a regular price. */
function hoodieWith(lists: Record<string, { id: string; type: string } | null>): WireProduct {
  return {
    ...wireHoodie,
    variants: (wireHoodie.variants ?? []).map((variant): WireVariant => {
      const list = lists[variant.id];
      if (list === undefined || list === null) return variant;
      return {
        ...variant,
        calculated_price: {
          ...variant.calculated_price,
          is_calculated_price_price_list: true,
          calculated_price: { price_list_id: list.id, price_list_type: list.type },
        },
      };
    }),
  };
}

beforeEach(() => {
  saleEnds.answer = {};
  saleEnds.fail = false;
  saleEnds.asked = [];
});

describe("a variant's sale list (toProductDto)", () => {
  it("is the price list of a sale price, and none for a regular or an override price", () => {
    const dto = toProductDto(
      hoodieWith({
        variant_black_m: { id: "plist_summer", type: "sale" },
        variant_navy_s: { id: "plist_vip", type: "override" },
      }),
    );
    const byId = Object.fromEntries(dto.variants.map((v) => [v.id, v.saleListId]));
    expect(byId).toEqual({
      variant_black_s: null,
      variant_black_m: "plist_summer",
      variant_navy_s: null,
    });
  });

  it("is none when the price is not the list's (`is_calculated_price_price_list` false)", () => {
    const wire = hoodieWith({ variant_black_m: { id: "plist_summer", type: "sale" } });
    const variants = (wire.variants ?? []).map((variant) => ({
      ...variant,
      calculated_price:
        variant.calculated_price === null || variant.calculated_price === undefined
          ? variant.calculated_price
          : { ...variant.calculated_price, is_calculated_price_price_list: false },
    }));
    const dto = toProductDto({ ...wire, variants });
    expect(dto.variants.every((v) => v.saleListId === null)).toBe(true);
  });
});

describe("priceValidUntil", () => {
  it("asks for each sale list once and gives each variant on it the end's UTC day", async () => {
    saleEnds.answer = { plist_summer: "2027-01-31T21:59:59.000Z" };
    const product = toProductDto(
      hoodieWith({
        variant_black_s: { id: "plist_summer", type: "sale" },
        variant_black_m: { id: "plist_summer", type: "sale" },
      }),
    );
    expect(await priceValidUntil(product)).toEqual({
      variant_black_s: "2027-01-31",
      variant_black_m: "2027-01-31",
    });
    expect(saleEnds.asked).toEqual([["plist_summer"]]);
  });

  it("asks nothing for a product without a sale list", async () => {
    expect(await priceValidUntil(toProductDto(wireHoodie))).toEqual({});
    expect(saleEnds.asked).toEqual([]);
  });

  it("gives none for a sale without an end", async () => {
    const product = toProductDto(
      hoodieWith({ variant_black_m: { id: "plist_open", type: "sale" } }),
    );
    expect(await priceValidUntil(product)).toEqual({});
  });

  it("gives none, and does not fail the page, when Medusa does not answer", async () => {
    saleEnds.fail = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const product = toProductDto(
      hoodieWith({ variant_black_m: { id: "plist_summer", type: "sale" } }),
    );
    expect(await priceValidUntil(product)).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/no priceValidUntil/));
    warn.mockRestore();
  });
});
