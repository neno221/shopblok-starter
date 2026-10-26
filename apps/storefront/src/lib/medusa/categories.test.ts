import { describe, expect, it, vi } from "vitest";
import { wireCategories } from "../../test-support/medusa-wire";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { flattenCategories, toCategoryTree } = await import("./categories");

describe("toCategoryTree (D66: the navigation's two levels)", () => {
  it("nests the children under their parent, each level in rank order", () => {
    const tree = toCategoryTree(wireCategories);
    expect(tree.map((node) => [node.handle, node.children.map((child) => child.handle)])).toEqual([
      ["apparel", ["knitwear", "tops"]],
      ["home", []],
      ["orphan", []],
    ]);
  });

  it("makes a category whose parent is not listed a root, so it is not lost", () => {
    expect(toCategoryTree(wireCategories).some((node) => node.id === "pcat_orphan")).toBe(true);
  });

  it("leaves out a row with no handle or name", () => {
    expect(
      toCategoryTree([
        { id: "pcat_x", handle: "", name: "X" },
        { id: "pcat_y", handle: "y" },
      ]),
    ).toEqual([]);
  });

  it("flattens parents before their children", () => {
    expect(flattenCategories(toCategoryTree(wireCategories)).map((node) => node.handle)).toEqual([
      "apparel",
      "knitwear",
      "tops",
      "home",
      "orphan",
    ]);
  });
});
