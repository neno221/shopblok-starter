import type { NumberField } from "payload";
import { listingContentFields } from "../fields/catalog-content";
import { synced, syncedReference } from "../fields/synced";
import { metaContentField } from "../seo";
import { syncedCollection } from "./synced-collection";

/** Medusa's product categories (D75), with their tree, and the shop's picture, banner and intro (D83). */
export const Categories = syncedCollection({
  slug: "categories",
  labels: { singular: "Category", plural: "Categories" },
  interfaceName: "Category",
  fields: [
    // Written after the category itself, as a Payload id (the sync's second step).
    syncedReference("parent", "categories"),
    synced<NumberField>({ name: "rank", type: "number" }),
  ],
  content: [...listingContentFields(), metaContentField()],
});
