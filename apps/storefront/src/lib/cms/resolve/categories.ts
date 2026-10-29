import type { CategoryTile } from "@shopblok/registry/contracts";
import { categoryPaths, type CategoryNode } from "../../medusa/categories";
import type { Hrefs } from "../../view-models/common";
import { mediaImage } from "../shell";
import { categoryTilePicture, type CatalogReads } from "./catalog";
import { findCategory, liveMedusaId } from "./products";
import { text } from "./shared";

// SPEC §7.5's `categorySource`, resolved (T64, D79): the top-level categories, a category's
// children or the editor's list, from Medusa's tree in the market's language. A tile's name is the
// category's translated name and its link the category's whole path (`/categories/apparel/tops`),
// which the Payload document does not hold; the editor's label and picture win when set. Without a
// picture on the block, a tile shows the category's own (its document's `image`, T69), else its
// newest product's (M3's home, T51). A category Medusa deleted, or one the Store API does not
// list, is left out.

/** A `categorySource` group as Payload stores it, read at depth 1. */
export type CategorySourceValue = {
  mode?: string | null;
  parent?: unknown;
  items?: readonly { category?: unknown; label?: string | null; image?: unknown }[] | null;
  limit?: number | null;
};

/** The most tiles a source gives (`CategoryShowcaseSection`). */
export const MAX_TILES = 12;

/** The categories the source lists, in its order (Medusa's rank, or the editor's). */
function nodesOf(value: CategorySourceValue, tree: readonly CategoryNode[]): CategoryNode[] {
  switch (value.mode) {
    case "childrenOf": {
      const id = liveMedusaId(value.parent);
      return id === null ? [] : (findCategory(tree, id)?.children ?? []);
    }
    case "handpicked":
      return (value.items ?? []).flatMap((item) => {
        const id = liveMedusaId(item.category);
        const node = id === null ? undefined : findCategory(tree, id);
        return node === undefined ? [] : [node];
      });
    default:
      return [...tree];
  }
}

/**
 * A `categorySource`'s tiles for the market, at most its limit (the editor's list whole, up to
 * `MAX_TILES`), each category once.
 */
export async function resolveCategorySource(
  value: CategorySourceValue | null | undefined,
  reads: CatalogReads,
  hrefs: Pick<Hrefs, "category">,
): Promise<CategoryTile[]> {
  if (value == null) return [];
  const tree = await reads.categories();
  const paths = new Map(categoryPaths(tree).map((entry) => [entry.node.id, entry.path]));
  const limit =
    value.mode === "handpicked"
      ? MAX_TILES
      : Math.min(
          typeof value.limit === "number" && value.limit >= 1 ? Math.floor(value.limit) : 8,
          MAX_TILES,
        );
  // A category listed twice is shown once, with its first item's label and picture.
  const overrides = new Map<string, NonNullable<CategorySourceValue["items"]>[number]>();
  for (const item of value.items ?? []) {
    const id = liveMedusaId(item.category);
    if (id !== null && !overrides.has(id)) overrides.set(id, item);
  }
  const seen = new Set<string>();
  const nodes = nodesOf(value, tree)
    .filter((node) => !seen.has(node.id) && seen.add(node.id))
    .slice(0, limit);
  return Promise.all(
    nodes.map(async (node): Promise<CategoryTile> => {
      const override = overrides.get(node.id);
      const editorImage = mediaImage(override?.image);
      const image =
        editorImage === undefined
          ? await categoryTilePicture(reads, node)
          : // Decoration, as the product's picture is: the tile's name says where it goes.
            { ...editorImage, alt: "" };
      return {
        label: text(override?.label) ?? node.name,
        href: hrefs.category((paths.get(node.id) ?? [node.handle]).join("/")),
        ...(image === undefined ? {} : { image }),
      };
    }),
  );
}
