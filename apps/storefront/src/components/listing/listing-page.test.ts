// The listing pages' path helpers (D59, T50): which `/page/n` a path names, and a category's path
// of handles in the catch-all's segments.
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("../../lib/current-market", () => ({ getCurrentMarket: vi.fn() }));

import { categorySegments, pathPage } from "./listing-page";

describe("pathPage", () => {
  it("is 1 without a segment, and the number for a page from 2", () => {
    expect(pathPage(undefined)).toBe(1);
    expect(pathPage("2")).toBe(2);
    expect(pathPage("99999")).toBe(99999);
  });

  it("is null for page 1 (the listing's own address), and for anything that is not a page", () => {
    for (const segment of ["1", "0", "02", "-2", "2.5", "x", "", "100000", "2 "])
      expect(pathPage(segment)).toBeNull();
  });
});

describe("categorySegments", () => {
  const category = (...path: string[]) => ({ kind: "category", path });

  it("is the whole path, on the first page, when there is no page segment", () => {
    expect(categorySegments(["apparel"])).toEqual({ scope: category("apparel"), page: 1 });
    expect(categorySegments(["apparel", "tops"])).toEqual({
      scope: category("apparel", "tops"),
      page: 1,
    });
  });

  it("takes /page/n off the end", () => {
    expect(categorySegments(["apparel", "page", "3"])).toEqual({
      scope: category("apparel"),
      page: 3,
    });
    expect(categorySegments(["apparel", "tops", "page", "12"])).toEqual({
      scope: category("apparel", "tops"),
      page: 12,
    });
  });

  it("makes a page that is none a null page (a 404)", () => {
    expect(categorySegments(["apparel", "page", "1"])).toEqual({
      scope: category("apparel"),
      page: null,
    });
    expect(categorySegments(["apparel", "page", "x"])).toEqual({
      scope: category("apparel"),
      page: null,
    });
  });

  it("does not take a category called page for a page segment", () => {
    expect(categorySegments(["page", "3"])).toEqual({ scope: category("page", "3"), page: 1 });
    expect(categorySegments(["apparel", "page"])).toEqual({
      scope: category("apparel", "page"),
      page: 1,
    });
  });

  // PR 78 review, items 2 and 3: Next has decoded the segments, so they are taken as they come; a
  // segment that is no handle (an encoded slash, a broken escape) is no scope, a 404, never a 500
  // or another category's page.
  it("takes the segments as Next decoded them, and no segment that is not a handle", () => {
    expect(categorySegments(["apparel/tops"])).toEqual({ scope: null, page: 1 });
    expect(categorySegments(["apparel/tops", "page", "2"])).toEqual({ scope: null, page: 2 });
    expect(categorySegments(["%E0%A4%A"])).toEqual({ scope: null, page: 1 });
    expect(categorySegments(["%41pparel"])).toEqual({ scope: null, page: 1 });
  });
});
