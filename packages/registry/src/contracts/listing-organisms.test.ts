import { describe, expect, it } from "vitest";
import {
  CompareTray,
  FilterPanel,
  ProductCarousel,
  ProductCardVariant,
  ProductGrid,
  ProductToolbar,
  SearchOverlay,
} from "./listing-organisms";

// The listing organisms' own rules (T37): a recent query or a product listed twice, a filter the GET
// form would send twice, a toolbar's view, a carousel with nothing in it, and a compare tray over its
// limit. `@shopblok/fixtures`' test parses the real data.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });
const image = { src: "/media/hoodie.jpg", alt: "A hoodie", width: 600, height: 800 };

const card = (id: string) => ({
  id,
  handle: id,
  title: `Product ${id}`,
  href: `/products/${id}`,
  images: [image],
  price: { price: eur(49), varies: false },
  badges: [],
  swatches: [],
  variantCount: 1,
  stock: { status: "in-stock" },
});

const sort = {
  action: "/collections/all",
  name: "sort",
  options: [
    { value: "relevance", label: "Relevance" },
    { value: "newest", label: "Newest" },
  ],
  selected: "relevance",
  params: [],
};

const colour = {
  kind: "checkbox",
  id: "colour",
  label: "Colour",
  options: [{ value: "black", label: "Black", count: 4, selected: true }],
};
const price = {
  kind: "range",
  id: "price",
  label: "Price",
  currencyCode: "EUR",
  min: 10,
  max: 90,
};

describe("ProductCardVariant", () => {
  it("names the ten looks of ProductCard (D46)", () => {
    expect(ProductCardVariant.options).toHaveLength(10);
    expect(issues(ProductCardVariant, "quick-add")).toEqual([]);
    expect(issues(ProductCardVariant, "tiny")).not.toEqual([]);
  });
});

describe("SearchOverlay", () => {
  const overlay = {
    search: { action: "/search", query: "hoodie" },
    recent: ["hoodie", "linen shirt"],
    result: {
      query: "hoodie",
      total: 2,
      products: [card("a"), card("b")],
      categories: [{ label: "Hoodies", href: "/categories/hoodies" }],
      suggestions: ["hoodie black"],
    },
    loading: false,
  };

  it("takes a query with its results, and the empty overlay before the first query", () => {
    expect(issues(SearchOverlay, overlay)).toEqual([]);
    expect(
      issues(SearchOverlay, {
        search: { action: "/search", query: "" },
        recent: [],
        loading: false,
      }),
    ).toEqual([]);
  });

  it("refuses a recent query twice, more than eight, and a product twice in the results", () => {
    expect(issues(SearchOverlay, { ...overlay, recent: ["hoodie", "hoodie"] })).toContain(
      "a recent query is listed twice",
    );
    const nine = Array.from({ length: 9 }, (_, index) => `query ${index}`);
    expect(issues(SearchOverlay, { ...overlay, recent: nine })).not.toEqual([]);
    const twice = { ...overlay.result, products: [card("a"), card("a")] };
    expect(issues(SearchOverlay, { ...overlay, result: twice })).toContain(
      "a product is listed twice in the results",
    );
  });
});

describe("FilterPanel", () => {
  const panel = {
    action: "/collections/all",
    groups: [colour, price],
    params: [{ name: "sort", value: "newest" }],
    resultCount: 4,
  };

  it("takes the groups, the listing's other parameters and the count", () => {
    expect(issues(FilterPanel, panel)).toEqual([]);
    const active = {
      filters: [
        { id: "colour:black", group: "Colour", label: "Black", removeHref: "/collections/all" },
      ],
      clearHref: "/collections/all",
    };
    expect(issues(FilterPanel, { ...panel, active })).toEqual([]);
  });

  it("refuses no groups and a group twice", () => {
    expect(issues(FilterPanel, { ...panel, groups: [] })).not.toEqual([]);
    expect(issues(FilterPanel, { ...panel, groups: [colour, colour] })).toContain(
      "a filter group is listed twice",
    );
  });

  it("refuses a parameter that one of the groups' fields also sends, a range's bounds too", () => {
    const twice = "the form would send a filter twice: it is also one of the params";
    expect(issues(FilterPanel, { ...panel, params: [{ name: "colour", value: "red" }] })).toContain(
      twice,
    );
    expect(
      issues(FilterPanel, { ...panel, params: [{ name: "price.min", value: "20" }] }),
    ).toContain(twice);
    expect(issues(FilterPanel, { ...panel, params: [{ name: "price", value: "20" }] })).toEqual([]);
  });
});

describe("ProductToolbar", () => {
  it("takes the count and the sort, with or without the view toggle", () => {
    expect(issues(ProductToolbar, { count: 0, sort })).toEqual([]);
    const view = {
      current: "list",
      gridHref: "/collections/all",
      listHref: "/collections/all?view=list",
    };
    expect(issues(ProductToolbar, { count: 128, sort, view })).toEqual([]);
    expect(
      issues(ProductToolbar, { count: 128, sort, view: { ...view, current: "table" } }),
    ).not.toEqual([]);
  });
});

describe("ProductGrid and ProductCarousel", () => {
  const empty = { title: "No products here yet" };

  it("take the cards in one look; a grid may be empty and a carousel may not", () => {
    const grid = { products: [card("a"), card("b")], variant: "standard", layout: "grid", empty };
    expect(issues(ProductGrid, grid)).toEqual([]);
    expect(issues(ProductGrid, { ...grid, products: [] })).toEqual([]);
    const carousel = { title: "New in", products: [card("a")], variant: "minimal" };
    expect(issues(ProductCarousel, carousel)).toEqual([]);
    expect(issues(ProductCarousel, { ...carousel, products: [] })).not.toEqual([]);
  });

  it("refuse a product twice", () => {
    const products = [card("a"), card("a")];
    expect(issues(ProductGrid, { products, variant: "standard", layout: "list", empty })).toContain(
      "a product is listed twice",
    );
    expect(issues(ProductCarousel, { title: "New in", products, variant: "standard" })).toContain(
      "a product is listed twice",
    );
  });
});

describe("CompareTray", () => {
  const item = (id: string) => ({ id, title: `Product ${id}`, href: `/products/${id}`, image });
  const tray = { items: [item("a"), item("b")], max: 4, compareHref: "/compare?ids=a,b" };

  it("takes the products chosen, none at all too", () => {
    expect(issues(CompareTray, tray)).toEqual([]);
    expect(issues(CompareTray, { ...tray, items: [] })).toEqual([]);
  });

  it("refuses more products than the comparison takes, and a product twice", () => {
    expect(
      issues(CompareTray, { ...tray, max: 2, items: [item("a"), item("b"), item("c")] }),
    ).toContain("more products than the comparison takes");
    expect(issues(CompareTray, { ...tray, items: [item("a"), item("a")] })).toContain(
      "a product is chosen twice",
    );
    expect(issues(CompareTray, { ...tray, max: 5 })).not.toEqual([]);
  });
});
