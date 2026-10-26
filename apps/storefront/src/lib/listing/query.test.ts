// The listing's URL query (D59, T50): scopes, filters, sort and page read from a URL, and the
// parameter helpers the links are made with.
import { describe, expect, it } from "vitest";
import {
  changesListing,
  filterCount,
  filterParams,
  parseListingQuery,
  parseScope,
  scopeValue,
  withoutParam,
  withQuery,
  type ListingScope,
} from "./query";

const parse = (search: string) => parseListingQuery(new URLSearchParams(search));

describe("parseScope", () => {
  it("reads the store, a category path and a collection", () => {
    expect(parseScope("store")).toEqual({ kind: "store" });
    expect(parseScope("category:apparel")).toEqual({ kind: "category", path: ["apparel"] });
    expect(parseScope("category:apparel/tops")).toEqual({
      kind: "category",
      path: ["apparel", "tops"],
    });
    expect(parseScope("collection:summer-edit")).toEqual({
      kind: "collection",
      handle: "summer-edit",
    });
  });

  it("is null for nothing, an empty value or a name that is none", () => {
    for (const value of [null, "", "shop", "category", "category:", "collection:", "sale:1"])
      expect(parseScope(value)).toBeNull();
  });

  it("is null for handles with a character a handle has not", () => {
    for (const value of [
      "category:apparel//tops",
      "category:/apparel",
      "category:apparel/",
      "category:a b",
      "category:../x",
      "collection:a/b",
      "collection:a?b",
      "collection:a\nb",
    ])
      expect(parseScope(value)).toBeNull();
  });

  it("takes a path of up to 8 segments, and no more", () => {
    const path = (count: number) => Array.from({ length: count }, (_, i) => `c${i}`).join("/");
    expect(parseScope(`category:${path(8)}`)).toMatchObject({ kind: "category" });
    expect(parseScope(`category:${path(9)}`)).toBeNull();
  });

  it("round-trips through scopeValue", () => {
    const scopes: ListingScope[] = [
      { kind: "store" },
      { kind: "category", path: ["apparel", "tops"] },
      { kind: "collection", handle: "summer_edit-2" },
    ];
    for (const scope of scopes) expect(parseScope(scopeValue(scope))).toEqual(scope);
    expect(scopeValue({ kind: "category", path: ["a", "b"] })).toBe("category:a/b");
    expect(scopeValue({ kind: "collection", handle: "c" })).toBe("collection:c");
    expect(scopeValue({ kind: "store" })).toBe("store");
  });
});

describe("parseListingQuery", () => {
  it("is empty for an empty URL", () => {
    expect(parse("")).toEqual({ query: "", filters: {}, sort: null, page: null, scope: null });
  });

  it("keeps ids of the shape Medusa makes, and drops the others", () => {
    const query = parse(
      "category=pcat_apparel&category=nope&category=pcat_&category=1_x&category=pcat_a-b" +
        `&collection=pcol_basics&collection=${"pcol_" + "x".repeat(65)}&collection=pcol_${"y".repeat(64)}`,
    );
    expect(query.filters.categoryIds).toEqual(["pcat_apparel"]);
    expect(query.filters.collectionIds).toEqual(["pcol_basics", `pcol_${"y".repeat(64)}`]);
  });

  it("leaves a filter out when none of its values is an id", () => {
    expect(parse("category=nope&collection=").filters).toEqual({});
  });

  it("drops repeated values", () => {
    expect(parse("category=pcat_a&category=pcat_b&category=pcat_a").filters.categoryIds).toEqual([
      "pcat_a",
      "pcat_b",
    ]);
  });

  it("keeps at most 50 values of a filter", () => {
    const search = Array.from({ length: 60 }, (_, i) => `category=pcat_${i}`).join("&");
    expect(parse(search).filters.categoryIds).toHaveLength(50);
  });

  it("makes one group per option parameter, ignoring other parameters", () => {
    const query = parse(
      "opt_colour=optval_black&opt_colour=optval_navy&opt_size=optval_m&opt_size=bad" +
        "&opt_empty=bad&opt_=optval_x&opt-x=optval_y&utm=optval_z",
    );
    expect(query.filters.optionValueIds).toEqual([["optval_black", "optval_navy"], ["optval_m"]]);
  });

  it("reads the price range, either bound alone, and ignores empty or negative ones", () => {
    expect(parse("price.min=10&price.max=99.5").filters.price).toEqual({ min: 10, max: 99.5 });
    expect(parse("price.min=10").filters.price).toEqual({ min: 10 });
    expect(parse("price.max=0").filters.price).toEqual({ max: 0 });
    expect(parse("price.min=&price.max=20").filters.price).toEqual({ max: 20 });
    expect(parse("price.min=-5&price.max=20").filters.price).toEqual({ max: 20 });
    expect(parse("price.min=abc&price.max=%20").filters.price).toBeUndefined();
    expect(parse("price.min=Infinity").filters.price).toBeUndefined();
    expect(parse("price.min=-1").filters).toEqual({});
  });

  it("reads sale=1 only", () => {
    expect(parse("sale=1").filters.onSale).toBe(true);
    for (const value of ["0", "true", ""])
      expect(parse(`sale=${value}`).filters.onSale).toBeUndefined();
  });

  it("reads a sort that is one of the four, and none otherwise", () => {
    for (const sort of ["relevance", "newest", "price-asc", "price-desc"])
      expect(parse(`sort=${sort}`).sort).toBe(sort);
    for (const sort of ["title", "PRICE-ASC", "", "x"])
      expect(parse(`sort=${sort}`).sort).toBeNull();
    expect(parse("").sort).toBeNull();
  });

  it("reads a page of 1 to 99999 without a sign or leading zero", () => {
    expect(parse("page=1").page).toBe(1);
    expect(parse("page=12").page).toBe(12);
    expect(parse("page=99999").page).toBe(99999);
    for (const page of ["0", "-1", "01", "1.5", "100000", "x", ""])
      expect(parse(`page=${page}`).page).toBeNull();
  });

  it("trims the query and keeps 200 characters of it", () => {
    expect(parse("q=%20%20black%20hoodie%20").query).toBe("black hoodie");
    expect(parse(`q=${"a".repeat(300)}`).query).toHaveLength(200);
    expect(parse("q=%20%20").query).toBe("");
  });

  it("reads the scope", () => {
    expect(parse("scope=category:apparel/tops").scope).toEqual({
      kind: "category",
      path: ["apparel", "tops"],
    });
    expect(parse("scope=nonsense").scope).toBeNull();
  });
});

describe("filterCount", () => {
  it("counts every value, a price range as one, and the sale as one", () => {
    expect(filterCount({})).toBe(0);
    expect(
      filterCount({
        categoryIds: ["a", "b"],
        collectionIds: ["c"],
        optionValueIds: [["d", "e"], ["f"]],
        price: { min: 1, max: 2 },
        onSale: true,
      }),
    ).toBe(2 + 1 + 3 + 1 + 1);
    expect(filterCount({ price: { min: 1 }, onSale: false })).toBe(1);
  });
});

describe("changesListing", () => {
  it("is false for a clean URL, or one with only a query and a scope", () => {
    expect(changesListing(parse(""))).toBe(false);
    expect(changesListing(parse("q=hoodie&scope=store"))).toBe(false);
    expect(changesListing(parse("sort=bogus&page=0&category=nope"))).toBe(false);
  });

  it("is true for a filter, a sort or a page", () => {
    expect(changesListing(parse("category=pcat_a"))).toBe(true);
    expect(changesListing(parse("sale=1"))).toBe(true);
    expect(changesListing(parse("sort=newest"))).toBe(true);
    expect(changesListing(parse("page=2"))).toBe(true);
  });
});

describe("filterParams", () => {
  it("keeps the filters and the sort, sorted by name then value", () => {
    const params = filterParams(
      new URLSearchParams(
        "sort=newest&sale=1&opt_b=v2&category=pcat_b&category=pcat_a&price.max=9&price.min=1&opt_a=v1&opt_b=v1",
      ),
    );
    expect(params.toString()).toBe(
      "category=pcat_a&category=pcat_b&opt_a=v1&opt_b=v1&opt_b=v2&price.max=9&price.min=1&sale=1&sort=newest",
    );
  });

  it("drops the page, the query, the scope, unknown parameters and empty values", () => {
    const params = filterParams(
      new URLSearchParams("page=2&q=x&scope=store&utm=1&category=&sale=1&sort="),
    );
    expect(params.toString()).toBe("sale=1");
  });

  it("drops a repeated name and value", () => {
    expect(filterParams(new URLSearchParams("category=pcat_a&category=pcat_a")).toString()).toBe(
      "category=pcat_a",
    );
  });

  it("gives equal strings for equal choices in another order", () => {
    expect(filterParams(new URLSearchParams("sale=1&sort=newest")).toString()).toBe(
      filterParams(new URLSearchParams("sort=newest&sale=1")).toString(),
    );
  });
});

describe("withoutParam and withQuery", () => {
  const params = new URLSearchParams("category=a&category=b&sale=1");

  it("removes one value of a parameter, or all of it", () => {
    expect(withoutParam(params, "category", "a").toString()).toBe("category=b&sale=1");
    expect(withoutParam(params, "category").toString()).toBe("sale=1");
    expect(withoutParam(params, "nothing").toString()).toBe(params.toString());
  });

  it("does not change the parameters it was given", () => {
    withoutParam(params, "category");
    expect(params.toString()).toBe("category=a&category=b&sale=1");
  });

  it("puts the query after the path, or leaves the path alone", () => {
    expect(withQuery("/store", new URLSearchParams("sale=1"))).toBe("/store?sale=1");
    expect(withQuery("/store", new URLSearchParams())).toBe("/store");
  });
});
