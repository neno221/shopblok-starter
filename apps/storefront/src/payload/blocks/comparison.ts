import type { RelationshipFieldSingleValidation, Where } from "payload";
import { relationship } from "payload/shared";
import { hideDeletedExceptHeld } from "../fields/link";
import { sectionBlock } from "./section-block";

/** A relationship's value as its id (a number, or a populated document's). */
const idOf = (value: unknown): unknown =>
  value !== null && typeof value === "object" && "id" in value
    ? (value as { id: unknown }).id
    : value;

/** The products the block compares, by id. */
const comparedIds = (sibling: unknown): unknown[] => {
  const products = (sibling as { products?: unknown } | undefined)?.products;
  return Array.isArray(products) ? products.map(idOf) : [];
};

/**
 * The pick (T82's `highlight` design): Payload's own check first, then that it is one of the
 * products the table compares. The section's contract refuses a pick among none of them too.
 */
const validatePick: RelationshipFieldSingleValidation = async (value, args) => {
  // Payload checks a field only while its condition holds; said here too, for the other designs.
  if ((args.siblingData as { variant?: unknown } | undefined)?.variant !== "highlight") return true;
  const base = await relationship(value, args);
  if (base !== true || value == null) return base;
  return comparedIds(args.siblingData).some((id) => String(id) === String(idOf(value)))
    ? true
    : "Choose one of the products the table compares.";
};

/**
 * `comparison` (SPEC §7.4, D79): handpicked products side by side, with their price, their
 * options' values (Medusa's, in the market's language) and the `metadata` keys the editor names.
 * T82 (M5 plan §1a): the `highlight` design's pick, one of those products, shown and required only
 * for it.
 */
export const ComparisonBlock = sectionBlock({
  slug: "comparison",
  interfaceName: "ComparisonBlock",
  plural: "Comparisons",
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    {
      name: "products",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      required: true,
      minRows: 2,
      maxRows: 4,
      filterOptions: hideDeletedExceptHeld("products"),
      admin: { description: "A column each, in this order." },
    },
    {
      name: "pick",
      type: "relationship",
      relationTo: "products",
      required: true,
      label: "The pick",
      // Only the products the table compares can be picked.
      filterOptions: ({ siblingData }): Where => ({
        id: { in: comparedIds(siblingData).map(String) },
      }),
      validate: validatePick,
      admin: {
        condition: (_: unknown, sibling: { variant?: unknown } | undefined) =>
          sibling?.variant === "highlight",
        description: "Its column is set apart and named “Our pick”.",
      },
    },
    {
      name: "showOptions",
      type: "checkbox",
      label: "A row for each of the products' options (colour, size…)",
      defaultValue: true,
    },
    {
      name: "rows",
      type: "array",
      maxRows: 12,
      labels: { singular: "Row", plural: "Rows" },
      fields: [
        { name: "label", type: "text", localized: true, required: true },
        {
          name: "key",
          type: "text",
          required: true,
          admin: { description: "The key in the products' metadata in Medusa (material)." },
        },
      ],
    },
  ],
});
