import type { Category } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { toNavigation } from "./navigation";

// D66: the two-level mapping, on a tree the demo seed does not have (its three categories are flat;
// `shell.spec.ts` checks those).
const category = (handle: string, children: Category[] = []): Category => ({
  id: `pcat_${handle}`,
  title: handle[0]!.toUpperCase() + handle.slice(1),
  handle,
  href: `/us/categories/${handle}`,
  children,
});

const tree: Category[] = [
  category("women", [
    category("dresses"),
    category("tops", [category("shirts"), category("tees", [category("deep")])]),
    category("skirts"),
  ]),
  category("sale"),
  category("men", [category("shoes", [category("boots")])]),
];

describe("toNavigation (D66)", () => {
  it("makes a top-level category with no children a plain link", () => {
    expect(toNavigation(tree)[1]).toEqual({
      kind: "link",
      label: "Sale",
      href: "/us/categories/sale",
    });
  });

  it("puts the leaf children in one column titled with the parent, then a column per branch", () => {
    expect(toNavigation(tree)[0]).toEqual({
      kind: "megaMenu",
      label: "Women",
      href: "/us/categories/women",
      featured: [],
      columns: [
        {
          title: "Women",
          href: "/us/categories/women",
          links: [
            { label: "Dresses", href: "/us/categories/dresses" },
            { label: "Skirts", href: "/us/categories/skirts" },
          ],
        },
        {
          title: "Tops",
          href: "/us/categories/tops",
          // Two levels: `tees` is a link, its own child is the category page's.
          links: [
            { label: "Shirts", href: "/us/categories/shirts" },
            { label: "Tees", href: "/us/categories/tees" },
          ],
        },
      ],
    });
  });

  it("has no parent's column when every child is a branch", () => {
    const men = toNavigation(tree)[2];
    expect(men?.kind === "megaMenu" ? men.columns.map((column) => column.title) : []).toEqual([
      "Shoes",
    ]);
  });

  it("keeps the tree's order, and is empty for an empty tree", () => {
    expect(toNavigation(tree).map((item) => item.label)).toEqual(["Women", "Sale", "Men"]);
    expect(toNavigation([])).toEqual([]);
  });
});
