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
  it("is the whole path, on the first page, when there is no page segment", () => {
    expect(categorySegments(["apparel"])).toEqual({ path: ["apparel"], page: 1 });
    expect(categorySegments(["apparel", "tops"])).toEqual({ path: ["apparel", "tops"], page: 1 });
  });

  it("takes /page/n off the end", () => {
    expect(categorySegments(["apparel", "page", "3"])).toEqual({ path: ["apparel"], page: 3 });
    expect(categorySegments(["apparel", "tops", "page", "12"])).toEqual({
      path: ["apparel", "tops"],
      page: 12,
    });
  });

  it("makes a page that is none a null page (a 404)", () => {
    expect(categorySegments(["apparel", "page", "1"])).toEqual({ path: ["apparel"], page: null });
    expect(categorySegments(["apparel", "page", "x"])).toEqual({ path: ["apparel"], page: null });
  });

  it("does not take a category called page for a page segment", () => {
    expect(categorySegments(["page", "3"])).toEqual({ path: ["page", "3"], page: 1 });
    expect(categorySegments(["apparel", "page"])).toEqual({ path: ["apparel", "page"], page: 1 });
  });

  it("decodes the segments", () => {
    expect(categorySegments(["caf%C3%A9", "page", "2"])).toEqual({ path: ["café"], page: 2 });
  });
});
