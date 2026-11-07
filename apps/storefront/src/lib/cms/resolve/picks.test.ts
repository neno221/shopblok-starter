import { CartPick } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import {
  cyprus,
  fakeCatalog,
  synced,
  unitedStates,
  type FakeMarket,
} from "../../../test-support/fake-catalog";
import type { ProductDto } from "../../medusa/products";
import { DEFAULT_PICKS, resolvePicks, toPick } from "./picks";
import type { ProductSourceValue } from "./products";

// The `drawer-picks` mini cart's products (T85, D101) against the fake data layer: the market's own
// reads (its region's prices, its language's names), at most four, what the cart holds left out
// and read past, and only the variants that can be bought.

const hrefs = { product: (handle: string) => `/us/products/${handle}` };

async function picks(
  value: ProductSourceValue | null,
  held: string[] = [],
  market: FakeMarket = unitedStates,
) {
  const catalog = fakeCatalog(market);
  return { picks: await resolvePicks(value, catalog.reads, hrefs, new Set(held)), catalog };
}

const ids = (list: { id: string }[]) => list.map((pick) => pick.id);

describe("resolvePicks (T85)", () => {
  it("is the newest four for a source never saved, in the market's currency and language", async () => {
    const us = await picks(null);
    expect(ids(us.picks)).toEqual(["prod_hoodie", "prod_tee", "prod_cap", "prod_mug"]);
    for (const pick of us.picks) {
      expect(CartPick.parse(pick)).toEqual(pick);
      expect(pick.price.price.currencyCode).toBe("USD");
    }
    expect(us.catalog.calls[0]).toEqual({
      read: "search",
      args: [{ filters: {}, sort: "newest", limit: 4 }],
    });
    const cy = await picks(null, [], cyprus);
    expect(cy.picks.map((pick) => pick.price.price.currencyCode)).toEqual([
      "EUR",
      "EUR",
      "EUR",
      "EUR",
    ]);
    expect(cy.picks[0]?.title).toBe("Φούτερ");
    expect(DEFAULT_PICKS).toEqual({ mode: "newest", limit: 4 });
  });

  it("leaves out what the cart holds and reads that many further, so four are still shown", async () => {
    const { picks: found, catalog } = await picks(null, ["prod_hoodie", "prod_cap"], cyprus);
    expect(ids(found)).toEqual(["prod_tee", "prod_mug", "prod_lamp"]);
    expect(catalog.calls[0]?.args).toEqual([{ filters: {}, sort: "newest", limit: 6 }]);
  });

  it("keeps the editor's limit and source, at most four", async () => {
    expect(ids((await picks({ mode: "newest", limit: 2 })).picks)).toEqual([
      "prod_hoodie",
      "prod_tee",
    ]);
    expect(
      ids(
        (await picks({ mode: "collection", collection: synced("col_summer"), limit: 4 })).picks,
      ),
    ).toEqual(["prod_tee", "prod_cap"]);
    const handpicked = await picks(
      {
        mode: "handpicked",
        products: ["prod_mug", "prod_tee", "prod_cap", "prod_hoodie"].map((id) => synced(id)),
      },
      ["prod_tee"],
    );
    expect(ids(handpicked.picks)).toEqual(["prod_mug", "prod_cap", "prod_hoodie"]);
  });

  it("gives nothing when nothing is found: no fallback to the newest", async () => {
    expect((await picks({ mode: "tag", tag: "nope" })).picks).toEqual([]);
  });
});

describe("toPick (T85)", () => {
  const product: ProductDto = {
    id: "prod_x",
    handle: "x",
    title: "X",
    subtitle: null,
    description: "",
    thumbnail: null,
    images: [],
    options: [],
    categories: [],
    collectionId: null,
    tagIds: [],
    variants: [
      ["var_s", "S", true, 10],
      ["var_m", "M", false, 10],
      ["var_l", "", true, 12],
      ["var_xl", "XL", true, null],
    ].map(([id, title, available, amount]) => ({
      id: id as string,
      title: title as string,
      sku: null,
      options: {},
      price: amount === null ? null : { amount: amount as number, currencyCode: "usd" },
      compareAt: null,
      stock: { status: "in-stock" as const },
      available: available as boolean,
      thumbnail: null,
    })),
  };

  it("offers only the variants that are priced and can be bought, each by its name", () => {
    expect(toPick(product, hrefs)?.choices).toEqual([
      { variantId: "var_s", label: "S" },
      // A variant without a title is named for its product.
      { variantId: "var_l", label: "X" },
    ]);
  });

  it("is no pick when no variant can be bought, or none has a price", () => {
    const sold = { ...product, variants: product.variants.map((v) => ({ ...v, available: false })) };
    expect(toPick(sold, hrefs)).toBeNull();
    const unpriced = { ...product, variants: product.variants.map((v) => ({ ...v, price: null })) };
    expect(toPick(unpriced, hrefs)).toBeNull();
  });
});
