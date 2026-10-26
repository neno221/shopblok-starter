import type { Category } from "@shopblok/registry/contracts";
import type { CategoryNode } from "../medusa/categories";
import type { Hrefs } from "./common";

/** The category tree as the contracts' `Category` (CategoryTree, the navigation, T48). */
export function toCategories(
  tree: readonly CategoryNode[],
  hrefs: Pick<Hrefs, "category">,
  path: readonly string[] = [],
): Category[] {
  return tree.map((node) => {
    // A child's URL is its whole path (`/categories/apparel/tops`, SPEC §8.1's `[...handle]`).
    const handles = [...path, node.handle];
    return {
      id: node.id,
      title: node.name,
      handle: node.handle,
      href: hrefs.category(handles.join("/")),
      children: toCategories(node.children, hrefs, handles),
    };
  });
}
