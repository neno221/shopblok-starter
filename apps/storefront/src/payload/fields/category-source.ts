import type { GroupField } from "payload";
import { imageField } from "../blocks/section-block";
import { hideDeletedExceptHeld } from "./link";

// SPEC §7.5's `categorySource` (D79, T64): the categories a block shows as tiles. Payload stores
// references; the storefront reads the tree from Medusa in the market's language
// (`lib/cms/resolve/categories.ts`), so a tile's name is the category's translated one and its link
// the category's whole path, unless the editor gave the tile a label or a picture of its own.

export const CATEGORY_SOURCE_MODES = ["topLevel", "childrenOf", "handpicked"] as const;

/** The most tiles a block shows (`CategoryShowcaseSection`). */
export const MAX_CATEGORY_TILES = 12;

/** `enum_<the block's table>_cs_<name>`, as the product source's: Postgres' 63 characters. */
const enumName =
  (name: string) =>
  ({ tableName = "source" }: { tableName?: string }) =>
    `enum_${tableName.replace(/_category_source$/, "")}_cs_${name}`;

/**
 * The items' table, `<the block's table>_cs_items`: the default (`…_category_source_items`) puts
 * its indexes and keys past Postgres' 63 characters in the versions' tables. Payload passes the
 * group's table and wraps a custom name as `_<name>_v` for the versions itself, so the versions'
 * prefix (`_pages_v_blocks_…`) is taken off first.
 */
const itemsTable = ({ tableName = "source" }: { tableName?: string }) =>
  `${tableName.replace(/^_(\w+?)_v_blocks_/, "$1_blocks_").replace(/_category_source$/, "")}_cs_items`;

type Sibling = { mode?: string | null };

/**
 * The `categorySource` group: the top-level categories, a category's children, or the editor's
 * own list; and per category an optional label (in each language) and picture. In the handpicked
 * mode `items` is the list, in the editor's order; in the others it holds only the overrides, for
 * any of the categories the mode lists.
 */
export function categorySource(): GroupField {
  return {
    name: "categorySource",
    type: "group",
    label: "Categories",
    admin: { hideGutter: true },
    fields: [
      {
        name: "mode",
        type: "select",
        required: true,
        defaultValue: "topLevel",
        options: [
          { value: "topLevel", label: "The top-level categories" },
          { value: "childrenOf", label: "A category's children" },
          { value: "handpicked", label: "Handpicked" },
        ],
        enumName: enumName("mode"),
      },
      {
        name: "parent",
        type: "relationship",
        relationTo: "categories",
        required: true,
        filterOptions: hideDeletedExceptHeld("parent"),
        admin: { condition: (_: unknown, sibling: Sibling) => sibling?.mode === "childrenOf" },
      },
      {
        name: "items",
        type: "array",
        dbName: itemsTable,
        maxRows: MAX_CATEGORY_TILES,
        labels: { singular: "Category", plural: "Categories" },
        admin: {
          description:
            "Handpicked: the categories, in this order. Otherwise: a label or a picture for any of the categories shown.",
        },
        fields: [
          {
            name: "category",
            type: "relationship",
            relationTo: "categories",
            required: true,
            filterOptions: hideDeletedExceptHeld("category"),
          },
          {
            name: "label",
            type: "text",
            localized: true,
            admin: { description: "Instead of the category's name." },
          },
          imageField("image", {
            description: "Instead of the category's newest product's picture.",
          }),
        ],
      },
      {
        name: "limit",
        type: "number",
        required: true,
        min: 1,
        max: MAX_CATEGORY_TILES,
        defaultValue: 8,
        admin: {
          step: 1,
          condition: (_: unknown, sibling: Sibling) => sibling?.mode !== "handpicked",
        },
      },
    ],
  };
}
