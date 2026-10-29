import type { Field, GroupField } from "payload";
import { hideDeletedExceptHeld } from "./link";

// SPEC §7.5's `productSource` (D79, T64): where a commerce block's products come from. Payload
// stores references only (a collection, a category, handpicked products, a tag's or a type's value)
// and the storefront resolves them per market (`lib/cms/resolve/products.ts`): prices, stock and
// translated titles are Medusa's, in the market's region and language.

/** The modes, in the order the admin lists them. */
export const PRODUCT_SOURCE_MODES = [
  "collection",
  "category",
  "handpicked",
  "newest",
  "onSale",
  "tag",
  "type",
] as const;
export type ProductSourceMode = (typeof PRODUCT_SOURCE_MODES)[number];

/**
 * The orders a source's products come in: the listing's (`newest`, `price-asc`, `price-desc`,
 * `title`) without the search's relevance, in camelCase, as Payload's GraphQL enums want.
 */
export const PRODUCT_SOURCE_SORTS = ["newest", "priceAsc", "priceDesc", "title"] as const;

/** The sorts as the admin lists them. */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "priceAsc", label: "Price, low to high" },
  { value: "priceDesc", label: "Price, high to low" },
  { value: "title", label: "Name, A to Z" },
] satisfies { value: (typeof PRODUCT_SOURCE_SORTS)[number]; label: string }[];

/** What a block does when its source has no product in the market. */
export const EMPTY_BEHAVIORS = ["hide", "message", "newest"] as const;

const MODE_LABELS: Record<ProductSourceMode | "none", string> = {
  none: "No products",
  collection: "A collection",
  category: "A category",
  handpicked: "Handpicked",
  newest: "The newest",
  onSale: "On sale",
  tag: "A tag",
  type: "A product type",
};

/**
 * The Postgres enum of a select: `enum_<the block's table>_ps_<name>`. Payload's default adds
 * `_product_source_<name>` to the block's table, which passes 63 characters for most blocks (as
 * `sectionSettings`' did, T63).
 */
const enumName =
  (name: string) =>
  ({ tableName = "source" }: { tableName?: string }) =>
    `enum_${tableName.replace(/_product_source$/, "")}_ps_${name}`;

type Sibling = { mode?: string | null };
const when =
  (...modes: string[]) =>
  (_: unknown, sibling: Sibling) =>
    modes.includes(sibling?.mode ?? "");
const unless =
  (...modes: string[]) =>
  (_: unknown, sibling: Sibling) =>
    !modes.includes(sibling?.mode ?? "");

export type ProductSourceOptions = {
  /** A "No products" mode, the default: the hero's products are optional. */
  optional?: boolean;
  /** The most products the block shows (SPEC §7.5: 24). */
  max?: number;
  /** How many it shows unless the editor says. */
  defaultLimit?: number;
};

/**
 * The `productSource` group: a mode and what it needs (shown only for that mode, and checked only
 * then), how many, in which order, and (unless optional) what to do when nothing is found. Handpicked products keep
 * the editor's order and number; the pickers hide what Medusa deleted (D85).
 */
export function productSource({
  optional = false,
  max = 24,
  defaultLimit = Math.min(8, max),
}: ProductSourceOptions = {}): GroupField {
  const modes = optional ? (["none", ...PRODUCT_SOURCE_MODES] as const) : PRODUCT_SOURCE_MODES;
  const off = optional ? ["none"] : [];
  const fields: Field[] = [
    {
      name: "mode",
      type: "select",
      required: true,
      defaultValue: optional ? "none" : "newest",
      options: modes.map((value) => ({ value, label: MODE_LABELS[value] })),
      enumName: enumName("mode"),
    },
    {
      name: "collection",
      type: "relationship",
      relationTo: "collections",
      required: true,
      filterOptions: hideDeletedExceptHeld("collection"),
      admin: { condition: when("collection") },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
      filterOptions: hideDeletedExceptHeld("category"),
      admin: { condition: when("category") },
    },
    {
      name: "descendants",
      type: "checkbox",
      label: "Include its subcategories",
      defaultValue: true,
      admin: { condition: when("category") },
    },
    {
      name: "products",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      required: true,
      maxRows: max,
      filterOptions: hideDeletedExceptHeld("products"),
      admin: {
        condition: when("handpicked"),
        description: "Shown in this order.",
      },
    },
    {
      name: "tag",
      type: "text",
      required: true,
      admin: {
        condition: when("tag"),
        description: "The tag's value, as Medusa Admin shows it (summer).",
      },
    },
    {
      name: "type",
      type: "text",
      required: true,
      admin: {
        condition: when("type"),
        description: "The product type's value, as Medusa Admin shows it (Hoodie).",
      },
    },
    {
      name: "limit",
      type: "number",
      required: true,
      min: 1,
      max,
      defaultValue: defaultLimit,
      admin: { step: 1, condition: unless("handpicked", ...off) },
    },
    {
      name: "sort",
      type: "select",
      required: true,
      defaultValue: "newest",
      options: SORT_OPTIONS,
      enumName: enumName("sort"),
      admin: { condition: unless("handpicked", "newest", ...off) },
    },
    // The hero stands without its products, so an optional source has no empty behaviour to pick.
    ...(optional
      ? []
      : [
          {
            name: "emptyBehavior",
            type: "select",
            required: true,
            defaultValue: "hide",
            options: [
              { value: "hide", label: "Hide the block" },
              { value: "message", label: "Say there is nothing yet" },
              { value: "newest", label: "Show the newest products instead" },
            ],
            enumName: enumName("empty"),
            admin: {
              description: "When the source has no product sold in the market.",
            },
          } satisfies Field,
        ]),
  ];
  return {
    name: "productSource",
    type: "group",
    label: "Products",
    admin: { hideGutter: true },
    fields,
  };
}
