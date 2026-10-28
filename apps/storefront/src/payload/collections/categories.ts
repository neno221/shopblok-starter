import type { NumberField } from "payload";
import { synced, syncedReference } from "../fields/synced";
import { syncedCollection } from "./synced-collection";

/** Medusa's product categories (D75), with their tree. T69 adds the CMS fields. */
export const Categories = syncedCollection({
  slug: "categories",
  labels: { singular: "Category", plural: "Categories" },
  interfaceName: "Category",
  fields: [
    // Written after the category itself, as a Payload id (the sync's second step).
    syncedReference("parent", "categories"),
    synced<NumberField>({ name: "rank", type: "number" }),
  ],
});
