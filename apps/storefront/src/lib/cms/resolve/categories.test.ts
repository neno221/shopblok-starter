import { describe, expect, it } from "vitest";
import { cyprus, fakeCatalog, synced, unitedStates } from "../../../test-support/fake-catalog";
import { resolveCategorySource } from "./categories";

// `categorySource` per mode (T64, SPEC §7.5) against a fake data layer.

const hrefs = { category: (path: string) => `/c/${path}` };
const picture = {
  url: "/api/media/file/1",
  alt: "Editor's",
  width: 600,
  height: 800,
};

describe("resolveCategorySource (T64)", () => {
  it("topLevel: the tree's roots in the market's language, with their whole paths", async () => {
    const tiles = await resolveCategorySource(
      { mode: "topLevel" },
      fakeCatalog(cyprus).reads,
      hrefs,
    );
    expect(tiles.map((tile) => [tile.label, tile.href])).toEqual([
      ["Ρούχα", "/c/apparel"],
      ["Αξεσουάρ", "/c/accessories"],
      ["Σπίτι", "/c/home"],
    ]);
  });

  it("childrenOf: a category's children, by their path under it", async () => {
    const tiles = await resolveCategorySource(
      { mode: "childrenOf", parent: synced("cat_apparel") },
      fakeCatalog(unitedStates).reads,
      hrefs,
    );
    expect(tiles.map((tile) => [tile.label, tile.href])).toEqual([["Tops", "/c/apparel/tops"]]);
  });

  it("handpicked: the editor's order, labels and pictures, without deleted categories", async () => {
    const tiles = await resolveCategorySource(
      {
        mode: "handpicked",
        items: [
          { category: synced("cat_home"), label: "For the house", image: picture },
          { category: synced("cat_accessories", true) },
          { category: synced("cat_tops"), label: " " },
          { category: synced("cat_home") },
        ],
      },
      fakeCatalog(unitedStates).reads,
      hrefs,
    );
    expect(tiles).toEqual([
      {
        label: "For the house",
        href: "/c/home",
        image: { src: picture.url, alt: "", width: 600, height: 800 },
      },
      {
        label: "Tops",
        href: "/c/apparel/tops",
        image: {
          src: "https://cdn.example/hoodie.jpg",
          alt: "",
          width: expect.any(Number),
          height: expect.any(Number),
        },
      },
    ]);
  });

  it("pictures a tile with its newest product's, its children's included, or none", async () => {
    const tiles = await resolveCategorySource(
      { mode: "topLevel", limit: 2 },
      fakeCatalog(unitedStates).reads,
      hrefs,
    );
    expect(tiles.map((tile) => tile.image?.src)).toEqual([
      "https://cdn.example/hoodie.jpg",
      // The cap has no picture: the tile has none, never the placeholder.
      undefined,
    ]);
  });

  it("gives no tile for no source or a missing parent", async () => {
    const reads = fakeCatalog(cyprus).reads;
    expect(await resolveCategorySource(null, reads, hrefs)).toEqual([]);
    expect(
      await resolveCategorySource({ mode: "childrenOf", parent: synced("cat_gone") }, reads, hrefs),
    ).toEqual([]);
  });

  it("pictures a tile with the category's own picture first (T69), then its newest product's", async () => {
    const catalog = fakeCatalog(unitedStates);
    const own = {
      src: "/api/media/file/cap.webp",
      alt: "Caps on a shelf",
      width: 800,
      height: 600,
    };
    catalog.categoryImages.set("accessories", own);
    const tiles = await resolveCategorySource({ mode: "topLevel", limit: 2 }, catalog.reads, hrefs);
    expect(tiles.map((tile) => tile.image)).toEqual([
      expect.objectContaining({ src: "https://cdn.example/hoodie.jpg" }),
      // Decoration, as a product's picture is on a tile: the name says where it goes.
      { ...own, alt: "" },
    ]);
    // A category with its own picture asks the search for none.
    const searched = catalog.calls
      .filter((call) => call.read === "search")
      .map((call) => call.args);
    expect(searched).toHaveLength(1);
  });

  it("an editor's picture on the block wins over the category's own", async () => {
    const catalog = fakeCatalog(unitedStates);
    catalog.categoryImages.set("home", {
      src: "/api/media/file/home.webp",
      alt: "",
      width: 800,
      height: 600,
    });
    const [tile] = await resolveCategorySource(
      { mode: "handpicked", items: [{ category: synced("cat_home"), image: picture }] },
      catalog.reads,
      hrefs,
    );
    expect(tile?.image?.src).toBe(picture.url);
  });
});
