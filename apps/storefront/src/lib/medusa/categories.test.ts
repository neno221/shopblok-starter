import { describe, expect, it, vi } from "vitest";
import { wireCategories } from "../../test-support/medusa-wire";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { categoryPaths, flattenCategories, toCategoryTree } = await import("./categories");

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

  it("gives every node its path of handles, in the same order (T50)", () => {
    const tree = toCategoryTree(wireCategories);
    const paths = categoryPaths(tree);
    expect(paths.map(({ node }) => node)).toEqual(flattenCategories(tree));
    for (const { node, path } of paths) expect(path.at(-1)).toBe(node.handle);
    const byHandle = new Map(paths.map(({ node, path }) => [node.handle, path]));
    for (const parent of tree)
      for (const child of parent.children)
        expect(byHandle.get(child.handle)).toEqual([parent.handle, child.handle]);
    expect(paths.some(({ path }) => path.length > 1)).toBe(true);
  });
});
