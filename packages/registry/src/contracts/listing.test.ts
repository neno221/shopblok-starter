import { describe, expect, it } from "vitest";
import { Breadcrumbs, EmptyStateContent, PageState, SearchQuery, SortState } from "./listing";

// The listing contracts' own rules for SearchField, Breadcrumbs, Pagination, SortSelect and
// EmptyState (T33). `contracts.test.ts` holds the first rules of PageState and SortState; this
// file holds what T33 added: a sort listed twice, a form that would send its sort twice, and the
// shapes the five components take.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const sort = {
  action: "/us/categories/women/women-clothing/women-hoodies",
  name: "sort",
  options: [
    { value: "relevance", label: "Relevance" },
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: low to high" },
  ],
  selected: "newest",
  params: [
    { name: "colour", value: "black" },
    { name: "colour", value: "oatmeal" },
  ],
};

describe("SortState", () => {
  it("takes the same parameter twice (a facet with two values), as a form sends it", () => {
    expect(issues(SortState, sort)).toEqual([]);
  });

  it("refuses a sort listed twice: the select would show two options for one value", () => {
    const options = [...sort.options, { value: "newest", label: "Latest" }];
    expect(issues(SortState, { ...sort, options })).toEqual(["a sort is listed twice"]);
  });

  it("refuses a form that would send its sort twice: as a hidden input and as the select", () => {
    const params = [...sort.params, { name: "sort", value: "price-asc" }];
    expect(issues(SortState, { ...sort, params })).toEqual([
      "the form would send the sort twice: it is also one of the params",
    ]);
    // The parameter's name is the contract's own `name`, whatever it is.
    expect(
      issues(SortState, { ...sort, name: "order", params: [{ name: "order", value: "x" }] }),
    ).toHaveLength(1);
  });

  it("wants two options at least: a select of one is not a choice", () => {
    expect(
      issues(SortState, { ...sort, options: [sort.options[0]], selected: "relevance" }),
    ).not.toEqual([]);
  });

  it("wants a path or an http(s) URL as its action", () => {
    expect(issues(SortState, { ...sort, action: "//evil.example" })).not.toEqual([]);
    expect(issues(SortState, { ...sort, action: "https://shop.example/hoodies" })).toEqual([]);
  });

  it("takes no params at all: a listing with no filters", () => {
    expect(issues(SortState, { ...sort, params: [] })).toEqual([]);
  });
});

describe("PageState", () => {
  it("takes the first, a middle and the last page, and a listing of one page", () => {
    for (const page of [1, 10, 20]) expect(issues(PageState, { page, pageCount: 20 })).toEqual([]);
    expect(issues(PageState, { page: 1, pageCount: 1 })).toEqual([]);
  });

  it("refuses a page that is not a whole number from 1 to the last", () => {
    expect(issues(PageState, { page: 1.5, pageCount: 3 })).not.toEqual([]);
    expect(issues(PageState, { page: 0, pageCount: 3 })).not.toEqual([]);
    expect(issues(PageState, { page: 1, pageCount: 0 })).not.toEqual([]);
    expect(issues(PageState, { page: 5, pageCount: 4 })).toEqual(["page is after the last page"]);
  });
});

describe("Breadcrumbs", () => {
  const trail = [
    { label: "Home", href: "/us" },
    { label: "Women", href: "/us/categories/women" },
  ];

  it("takes a trail from the home page and the current page's name", () => {
    expect(issues(Breadcrumbs, { trail, current: "Clothing" })).toEqual([]);
    expect(issues(Breadcrumbs, { trail: [trail[0]], current: "Women" })).toEqual([]);
  });

  it("wants the home page at least, and a name for the current page", () => {
    expect(issues(Breadcrumbs, { trail: [], current: "Clothing" })).not.toEqual([]);
    expect(issues(Breadcrumbs, { trail, current: "" })).not.toEqual([]);
    expect(issues(Breadcrumbs, { trail })).not.toEqual([]);
  });

  it("wants every step to go somewhere real: a path or an http(s) URL", () => {
    expect(
      issues(Breadcrumbs, { trail: [{ label: "Home", href: "home" }], current: "x" }),
    ).not.toEqual([]);
  });
});

describe("SearchQuery", () => {
  it("takes the search page and the query so far, empty for none", () => {
    expect(issues(SearchQuery, { action: "/us/search", query: "hoodie" })).toEqual([]);
    expect(issues(SearchQuery, { action: "/us/search", query: "" })).toEqual([]);
  });

  it("wants the search page to be a path or an http(s) URL", () => {
    expect(issues(SearchQuery, { action: "search", query: "" })).not.toEqual([]);
    expect(issues(SearchQuery, { action: "javascript:alert(1)", query: "" })).not.toEqual([]);
  });
});

describe("EmptyStateContent", () => {
  it("needs a title, and takes a text and an action as extras", () => {
    expect(issues(EmptyStateContent, { title: "No products match" })).toEqual([]);
    expect(
      issues(EmptyStateContent, {
        title: "No products match",
        text: "Try removing a filter.",
        action: { label: "Clear all filters", href: "/us/categories/hoodies" },
      }),
    ).toEqual([]);
    expect(issues(EmptyStateContent, { text: "Try removing a filter." })).not.toEqual([]);
    expect(issues(EmptyStateContent, { title: "" })).not.toEqual([]);
  });

  it("wants an action to be a link with text and a real href", () => {
    const title = "No products match";
    expect(issues(EmptyStateContent, { title, action: { label: "", href: "/us" } })).not.toEqual(
      [],
    );
    expect(issues(EmptyStateContent, { title, action: { label: "Home", href: "us" } })).not.toEqual(
      [],
    );
  });
});
