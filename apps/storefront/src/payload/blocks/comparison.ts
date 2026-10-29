import { hideDeletedExceptHeld } from "../fields/link";
import { sectionBlock } from "./section-block";

/**
 * `comparison` (SPEC §7.4, D79): handpicked products side by side, with their price, their
 * options' values (Medusa's, in the market's language) and the `metadata` keys the editor names.
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
