import { hideDeletedExceptHeld } from "../fields/link";
import { sectionBlock } from "./section-block";

/** `bundle` (SPEC §7.4, D79): handpicked products that go together; no bundle price in v1. */
export const BundleBlock = sectionBlock({
  slug: "bundle",
  interfaceName: "BundleBlock",
  plural: "Bundles",
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    {
      name: "text",
      type: "textarea",
      localized: true,
      admin: { description: "A blank line starts a new paragraph." },
    },
    {
      name: "products",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      required: true,
      minRows: 2,
      maxRows: 6,
      filterOptions: hideDeletedExceptHeld("products"),
      admin: { description: "Shown in this order." },
    },
  ],
});
