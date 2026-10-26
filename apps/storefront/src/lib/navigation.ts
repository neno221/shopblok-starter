import type { Category, Link, MegaMenuColumn, NavItem } from "@shopblok/registry/contracts";

// The header's navigation from Medusa's category tree (D66, SPEC §7.3): a category added in Medusa
// is in the menu without a deploy. Two levels: a top-level category is an item, and its children are
// its mega menu. A child with children of its own is a column of them, titled with its name and
// linked to its page; the children with none are one column, titled with the parent's name, so a
// column is never a heading over a single link to itself. A top-level category with no children is
// a plain link. Deeper levels are left to the category pages (their own CategoryTree).

const asLink = (category: Category): Link => ({ label: category.title, href: category.href });

function columnsOf(parent: Category): MegaMenuColumn[] {
  const leaves = parent.children.filter((child) => child.children.length === 0);
  const branches = parent.children.filter((child) => child.children.length > 0);
  return [
    ...(leaves.length === 0
      ? []
      : [{ title: parent.title, href: parent.href, links: leaves.map(asLink) }]),
    ...branches.map((branch) => ({
      title: branch.title,
      href: branch.href,
      links: branch.children.map(asLink),
    })),
  ];
}

/** The category tree (`toCategories`) as the header's `navigation`, in the tree's order. */
export function toNavigation(tree: readonly Category[]): NavItem[] {
  return tree.map((category): NavItem => {
    const columns = columnsOf(category);
    return columns.length === 0
      ? { kind: "link", label: category.title, href: category.href }
      : {
          kind: "megaMenu",
          label: category.title,
          href: category.href,
          columns,
          featured: [],
        };
  });
}
