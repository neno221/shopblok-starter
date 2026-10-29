import { describe, expect, it } from "vitest";
import {
  cyprus,
  fakeCatalog,
  synced,
  unitedStates,
  type FakeMarket,
} from "../../../test-support/fake-catalog";
import { resolveProductSource, type ProductSourceValue } from "./products";

// `productSource` per mode (T64, SPEC §7.5) against a fake data layer: the market's own reads, so
// a mode reads the region's prices and the language's names, and nothing the market does not sell.

const hrefs = { product: (handle: string) => `/p/${handle}` };

async function resolve(value: ProductSourceValue, market: FakeMarket = unitedStates, max?: number) {
  const catalog = fakeCatalog(market);
  const resolved = await resolveProductSource(
    value,
    catalog.reads,
    hrefs,
    max === undefined ? {} : { max },
  );
  return { resolved, catalog };
}

const ids = (resolved: Awaited<ReturnType<typeof resolve>>["resolved"]) =>
  resolved?.products.map((card) => card.id);

describe("resolveProductSource (T64)", () => {
  it("gives nothing for no source, and null for the hero's `none`", async () => {
    expect((await resolve({ mode: "none" })).resolved).toBeNull();
    expect(await resolveProductSource(null, fakeCatalog(cyprus).reads, hrefs)).toBeNull();
  });

  it("collection: the collection's products, newest first", async () => {
    const { resolved, catalog } = await resolve({
      mode: "collection",
      collection: synced("col_summer"),
    });
    expect(ids(resolved)).toEqual(["prod_tee", "prod_cap"]);
    expect(catalog.calls[0]).toEqual({
      read: "search",
      args: [{ filters: { collectionIds: ["col_summer"] }, sort: "newest", limit: 8 }],
    });
  });

  it("category: with its descendants by default, or only its own products", async () => {
    const apparel = synced("cat_apparel");
    expect(ids((await resolve({ mode: "category", category: apparel })).resolved)).toEqual([
      "prod_hoodie",
      "prod_tee",
    ]);
    expect(
      ids((await resolve({ mode: "category", category: apparel, descendants: false })).resolved),
    ).toEqual([]);
    // A category the Store API does not list has nothing to show.
    expect(
      ids((await resolve({ mode: "category", category: synced("cat_hidden") })).resolved),
    ).toEqual([]);
  });

  it("handpicked: the editor's order, at most the block's most, without deleted products", async () => {
    const products = [synced("prod_mug"), synced("prod_hoodie"), synced("prod_cap")];
    expect(ids((await resolve({ mode: "handpicked", products })).resolved)).toEqual([
      "prod_mug",
      "prod_hoodie",
      "prod_cap",
    ]);
    expect(
      ids((await resolve({ mode: "handpicked", products }, unitedStates, 2)).resolved),
    ).toEqual(["prod_mug", "prod_hoodie"]);
    // D75: a document the sync marked deleted, or one not populated, gives nothing.
    expect(
      ids(
        (
          await resolve({
            mode: "handpicked",
            products: [synced("prod_mug", true), "doc_prod_tee", synced("prod_cap")],
          })
        ).resolved,
      ),
    ).toEqual(["prod_cap"]);
  });

  it("handpicked: a product Medusa deleted since the sync is not shown", async () => {
    const catalog = fakeCatalog(cyprus);
    catalog.deleted.add("prod_hoodie");
    const resolved = await resolveProductSource(
      { mode: "handpicked", products: [synced("prod_hoodie"), synced("prod_mug")] },
      catalog.reads,
      hrefs,
    );
    expect(ids(resolved)).toEqual(["prod_mug"]);
  });

  it("newest and onSale: the shop's newest, and the products a sale price list lowers", async () => {
    expect(ids((await resolve({ mode: "newest", limit: 2 })).resolved)).toEqual([
      "prod_hoodie",
      "prod_tee",
    ]);
    const { resolved, catalog } = await resolve({ mode: "onSale" });
    expect(ids(resolved)).toEqual(["prod_tee"]);
    expect(catalog.calls[0]?.args).toEqual([
      { filters: { onSale: true }, sort: "newest", limit: 8 },
    ]);
  });

  it("tag and type: by the value the editor typed", async () => {
    expect(ids((await resolve({ mode: "tag", tag: " cotton " })).resolved)).toEqual([
      "prod_hoodie",
      "prod_cap",
    ]);
    expect(ids((await resolve({ mode: "tag", tag: "silk" })).resolved)).toEqual([]);
    expect(ids((await resolve({ mode: "type", type: "top", sort: "title" })).resolved)).toEqual([
      "prod_hoodie",
      "prod_tee",
    ]);
    expect(ids((await resolve({ mode: "type", type: "shoe" })).resolved)).toEqual([]);
  });

  it("sorts by price and title in the market's currency and language, up to the limit", async () => {
    expect(ids((await resolve({ mode: "newest", sort: "priceAsc", limit: 3 })).resolved)).toEqual([
      "prod_hoodie",
      "prod_tee",
      "prod_cap",
    ]);
    const { resolved } = await resolve({
      mode: "collection",
      collection: synced("col_summer"),
      sort: "priceAsc",
    });
    expect(ids(resolved)).toEqual(["prod_cap", "prod_tee"]);
    const greek = await resolve(
      { mode: "category", category: synced("cat_tops"), sort: "title" },
      cyprus,
    );
    expect(greek.resolved?.products.map((card) => card.title)).toEqual(["Μπλουζάκι", "Φούτερ"]);
  });

  it("prices each card in the market's region", async () => {
    const value = { mode: "handpicked", products: [synced("prod_hoodie")] };
    const us = (await resolve(value, unitedStates)).resolved?.products[0]?.price;
    const cy = (await resolve(value, cyprus)).resolved?.products[0]?.price;
    expect(us).toMatchObject({ price: { amount: 65, currencyCode: "USD" } });
    expect(cy).toMatchObject({ price: { amount: 59, currencyCode: "EUR" } });
  });

  it("leaves out what the market does not sell", async () => {
    const value = { mode: "category", category: synced("cat_home") };
    expect(ids((await resolve(value, cyprus)).resolved)).toEqual(["prod_mug", "prod_lamp"]);
    expect(ids((await resolve(value, unitedStates)).resolved)).toEqual(["prod_mug"]);
  });

  it("with nothing found: hide, say so, or show the newest", async () => {
    const nothing = { mode: "tag", tag: "silk" };
    expect((await resolve(nothing)).resolved).toEqual({ products: [], empty: "hide" });
    expect((await resolve({ ...nothing, emptyBehavior: "message" })).resolved).toEqual({
      products: [],
      empty: "message",
    });
    const newest = await resolve({ ...nothing, emptyBehavior: "newest", limit: 2 });
    expect(ids(newest.resolved)).toEqual(["prod_hoodie", "prod_tee"]);
  });
});
