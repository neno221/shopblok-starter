import "server-only";
import { CATALOG_LIFE, cached } from "../cache";
import { localeHeaders, medusaRequest } from "./sdk";

/** A category with its children, in the language asked for. */
export type CategoryNode = {
  id: string;
  handle: string;
  name: string;
  children: CategoryNode[];
};

/** A row of `/store/product-categories`, flat: the tree is built from `parent_category_id`. */
export type WireCategory = {
  id: string;
  handle?: string | null;
  name?: string | null;
  rank?: number | null;
  parent_category_id?: string | null;
};

/**
 * The flat rows as a tree, each level in Medusa's `rank` order (then by name). A row whose parent
 * is not in the list (an inactive or internal parent the Store API leaves out) becomes a root, so
 * no published category is lost. Rows without a handle or a name are left out.
 */
export function toCategoryTree(rows: readonly WireCategory[]): CategoryNode[] {
  const usable = rows.filter(
    (row): row is WireCategory & { handle: string; name: string } =>
      typeof row.handle === "string" &&
      row.handle !== "" &&
      typeof row.name === "string" &&
      row.name !== "",
  );
  const ids = new Set(usable.map((row) => row.id));
  const byRank = (a: WireCategory, b: WireCategory) =>
    (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
    (a.name ?? "").localeCompare(b.name ?? "");
  const childrenOf = (parent: string | null): CategoryNode[] =>
    usable
      .filter((row) =>
        parent === null
          ? row.parent_category_id == null || !ids.has(row.parent_category_id)
          : row.parent_category_id === parent,
      )
      .sort(byRank)
      .map((row) => ({
        id: row.id,
        handle: row.handle,
        name: row.name,
        children: childrenOf(row.id),
      }));
  return childrenOf(null);
}

/** Every node of the tree, parents before their children. */
export function flattenCategories(tree: readonly CategoryNode[]): CategoryNode[] {
  return tree.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

const CATEGORY_FIELDS = "id,handle,name,rank,parent_category_id";
const PAGE_SIZE = 100;

async function fetchCategories(locale: string): Promise<CategoryNode[]> {
  const rows: WireCategory[] = [];
  let offset = 0;
  for (;;) {
    const page = await medusaRequest((sdk) =>
      sdk.store.category.list(
        { fields: CATEGORY_FIELDS, limit: PAGE_SIZE, offset },
        localeHeaders(locale),
      ),
    );
    rows.push(...(page.product_categories as unknown as WireCategory[]));
    offset += page.product_categories.length;
    if (page.product_categories.length === 0 || offset >= page.count) break;
  }
  return toCategoryTree(rows);
}

/**
 * The category tree in a locale: the navigation (D66), the listing pages' handles and the search's
 * labels for `category_ids` (D63). One read per locale, tagged `navigation` too, so a category
 * added in Medusa reaches the menu through the subscriber (T49).
 */
export const listCategories = cached(fetchCategories, {
  name: "medusa:categories",
  tags: ["medusa:categories", "navigation", "search"],
  life: CATALOG_LIFE,
});
