import { describe, expect, it } from "vitest";
import { findMarket } from "../../markets/market";
import { seeded } from "../../markets/test-maps";
import {
  cyprus,
  fakeCatalog,
  synced,
  unitedStates,
  type FakeMarket,
} from "../../../test-support/fake-catalog";
import type { CommerceContext } from "./commerce";
import { resolveLayout, type LayoutBlock } from "./sections";

// The commerce blocks resolved for a market (T64): their sources through a fake data layer, their
// view models parsed by the contracts, and left out when they cannot be drawn.

const now = "2026-10-29T12:00:00.000Z";
const us = findMarket(seeded, "en-us")!;

function commerce(market: FakeMarket = unitedStates) {
  const catalog = fakeCatalog(market);
  const context: CommerceContext = {
    reads: catalog.reads,
    hrefs: {
      product: (handle) => `/us/products/${handle}`,
      category: (path) => `/us/categories/${path}`,
      collection: (handle) => `/us/collections/${handle}`,
    },
    now,
    storeHref: "/us/store",
    words: {
      empty: { title: "Nothing here yet", text: "Look again soon.", action: "Shop everything" },
      recentlyViewed: "Recently viewed",
    },
  };
  return { catalog, context };
}

async function resolve(block: Record<string, unknown>, market?: FakeMarket) {
  const { context } = commerce(market);
  const [resolved] = await resolveLayout(
    [{ id: "b1", variant: "standard", ...block } as unknown as LayoutBlock],
    { market: us, map: seeded, commerce: context },
  );
  return resolved;
}

describe("the commerce blocks (T64)", () => {
  it("hero: the countdown only before the offer's end, and its products", async () => {
    const hero = {
      blockType: "hero",
      heading: "Autumn",
      productSource: { mode: "handpicked", products: [synced("prod_cap"), synced("prod_mug")] },
    };
    const running = await resolve({ ...hero, countdownEnd: "2026-11-01T00:00:00.000Z" });
    expect(running?.blockType === "hero" && running.section.countdown).toEqual({
      endsAt: "2026-11-01T00:00:00.000Z",
      now,
    });
    expect(running?.blockType === "hero" && running.section.products.map((p) => p.id)).toEqual([
      "prod_cap",
      "prod_mug",
    ]);
    const ended = await resolve({ ...hero, countdownEnd: "2026-10-01T00:00:00.000Z" });
    expect(ended?.blockType === "hero" && ended.section.countdown).toBeUndefined();
    const alone = await resolve({
      blockType: "hero",
      heading: "Hi",
      productSource: { mode: "none" },
    });
    expect(alone?.blockType === "hero" && alone.section.products).toEqual([]);
  });

  it("productCollection: hidden without products, or the empty state the editor asked for", async () => {
    const block = {
      blockType: "productCollection",
      heading: "Silk",
      display: "grid",
      productSource: { mode: "tag", tag: "silk" },
    };
    expect(await resolve(block)).toBeUndefined();
    const message = await resolve({
      ...block,
      productSource: { ...block.productSource, emptyBehavior: "message" },
    });
    expect(message?.blockType === "productCollection" && message.section.empty).toEqual({
      title: "Nothing here yet",
      text: "Look again soon.",
      action: { label: "Shop everything", href: "/us/store" },
    });
  });

  it("featuredProduct and bundle: left out when their products are gone", async () => {
    expect(
      await resolve({ blockType: "featuredProduct", product: synced("prod_hoodie", true) }),
    ).toBeUndefined();
    const featured = await resolve({
      blockType: "featuredProduct",
      product: synced("prod_hoodie"),
    });
    expect(featured?.blockType === "featuredProduct" && featured.section.image.src).toBe(
      "https://cdn.example/hoodie.jpg",
    );
    const bundle = {
      blockType: "bundle",
      heading: "Together",
      products: [synced("prod_cap"), synced("prod_lamp")],
    };
    // The lamp is not sold in the US: one product is not a bundle.
    expect(await resolve(bundle, unitedStates)).toBeUndefined();
    const cy = await resolve(bundle, cyprus);
    expect(cy?.blockType === "bundle" && cy.section.products.map((p) => p.id)).toEqual([
      "prod_cap",
      "prod_lamp",
    ]);
  });

  it("promoBanner: left out once its offer has ended", async () => {
    const banner = { blockType: "promoBanner", heading: "Ten off", code: "WELCOME10" };
    expect(await resolve({ ...banner, endsAt: "2026-10-29T11:59:59.000Z" })).toBeUndefined();
    const running = await resolve({ ...banner, endsAt: "2026-11-30T00:00:00.000Z" });
    expect(running?.blockType === "promoBanner" && running.section.endsAt).toBe(
      "2026-11-30T00:00:00.000Z",
    );
    expect((await resolve(banner))?.blockType).toBe("promoBanner");
  });

  it("comparison: the price, the options and the metadata the editor named", async () => {
    const resolved = await resolve(
      {
        blockType: "comparison",
        heading: "Which one?",
        products: [synced("prod_hoodie"), synced("prod_cap")],
        rows: [
          { label: "Material", key: " material " },
          { label: "Fit", key: "fit" },
        ],
      },
      cyprus,
    );
    if (resolved?.blockType !== "comparison") throw new Error("no comparison");
    expect(resolved.section.products.map((p) => [p.id, p.price.price])).toEqual([
      ["prod_hoodie", { amount: 59, currencyCode: "EUR" }],
      ["prod_cap", { amount: 19, currencyCode: "EUR" }],
    ]);
    expect(resolved.section.rows).toEqual([
      { label: "Χρώμα", values: ["Black, Navy", null] },
      { label: "Material", values: ["Cotton", "Canvas"] },
      { label: "Fit", values: [null, null] },
    ]);
  });

  it("collectionSpotlight: the collection's translated title and page, or nothing once deleted", async () => {
    const resolved = await resolve(
      { blockType: "collectionSpotlight", collection: synced("col_summer"), limit: 1 },
      cyprus,
    );
    if (resolved?.blockType !== "collectionSpotlight") throw new Error("no spotlight");
    expect(resolved.section.heading).toBe("Καλοκαίρι");
    expect(resolved.section.href).toBe("/us/collections/summer-edit");
    expect(resolved.section.products.map((p) => p.id)).toEqual(["prod_tee"]);
    expect(
      await resolve({ blockType: "collectionSpotlight", collection: synced("col_summer", true) }),
    ).toBeUndefined();
  });

  it("recentlyViewed: the heading only, the catalog's when the editor wrote none", async () => {
    const resolved = await resolve({ blockType: "recentlyViewed" });
    expect(resolved?.blockType === "recentlyViewed" && resolved.section).toEqual({
      settings: {},
      heading: "Recently viewed",
      products: [],
    });
  });

  it("reads the catalog only for the commerce blocks", async () => {
    const { catalog, context } = commerce();
    await resolveLayout(
      [{ blockType: "spacer", id: "s", variant: "standard", size: "small" } as LayoutBlock],
      { market: us, map: seeded, commerce: context },
    );
    expect(catalog.calls).toEqual([]);
  });
});
