// A listing page's structured data (SPEC §12, T50): the CollectionPage, its ItemList with the
// page's positions, and the BreadcrumbList.
import { pageFixtures } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { listingJsonLd } from "./listing";

const base = new URL("https://shop.example");
const products = pageFixtures.en.productListing.results.grid.products;

type Graph = {
  "@context": string;
  "@graph": [
    {
      "@type": string;
      "@id": string;
      name: string;
      url: string;
      mainEntity: {
        "@type": string;
        numberOfItems: number;
        itemListElement: { "@type": string; position: number; name: string; url: string }[];
      };
    },
    {
      "@type": string;
      itemListElement: { "@type": string; position: number; name: string; item: string }[];
    },
  ];
};

const build = (firstPosition: number, items = products, total = 30) =>
  listingJsonLd(
    {
      name: "Hoodies",
      href: "/categories/apparel/hoodies/page/2",
      breadcrumbs: {
        trail: [
          { label: "Home", href: "/" },
          { label: "Apparel", href: "/categories/apparel" },
        ],
        current: "Hoodies",
      },
      products: items,
      firstPosition,
      total,
    },
    base,
  ) as Graph;

describe("listingJsonLd", () => {
  it("is a CollectionPage and a BreadcrumbList in one graph, at an absolute self-URL", () => {
    const data = build(1);
    expect(data["@context"]).toBe("https://schema.org");
    const [page, trail] = data["@graph"];
    expect(page["@type"]).toBe("CollectionPage");
    expect(page.name).toBe("Hoodies");
    expect(page.url).toBe("https://shop.example/categories/apparel/hoodies/page/2");
    expect(page["@id"]).toBe("https://shop.example/categories/apparel/hoodies/page/2#page");
    expect(trail["@type"]).toBe("BreadcrumbList");
  });

  it("lists the page's products as an ItemList numbered from the page's first position", () => {
    expect(products.length).toBeGreaterThan(1);
    const { mainEntity } = build(25)["@graph"][0];
    expect(mainEntity["@type"]).toBe("ItemList");
    // The whole listing's size, which the positions run in (PR 78 review, item 5), not the page's.
    expect(mainEntity.numberOfItems).toBe(30);
    expect(mainEntity.itemListElement.map((item) => item.position)).toEqual(
      products.map((_, index) => 25 + index),
    );
    expect(mainEntity.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 25,
      name: products[0]?.title,
      url: new URL(products[0]?.href ?? "", base).toString(),
    });
  });

  it("starts at 1 on the first page, and is an empty list for a page without products", () => {
    expect(build(1)["@graph"][0].mainEntity.itemListElement[0]?.position).toBe(1);
    const empty = build(1, [], 0)["@graph"][0].mainEntity;
    expect(empty.numberOfItems).toBe(0);
    expect(empty.itemListElement).toEqual([]);
  });

  it("has the trail and then the page itself, counted from 1, with absolute URLs", () => {
    const trail = build(1)["@graph"][1].itemListElement;
    expect(trail).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shop.example/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Apparel",
        item: "https://shop.example/categories/apparel",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Hoodies",
        item: "https://shop.example/categories/apparel/hoodies/page/2",
      },
    ]);
  });

  it("takes the site's base from the environment when it is given none", () => {
    const data = listingJsonLd({
      name: "Store",
      href: "/store",
      breadcrumbs: { trail: [], current: "Store" },
      products: [],
      firstPosition: 1,
      total: 0,
    }) as Graph;
    expect(data["@graph"][0].url).toMatch(/^https?:\/\/.+\/store$/);
  });
});
