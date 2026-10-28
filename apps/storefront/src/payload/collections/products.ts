import type { TextField } from "payload";
import { synced } from "../fields/synced";
import { syncedCollection } from "./synced-collection";

/** Medusa's products (D75). T69 adds the CMS fields. */
export const Products = syncedCollection({
  slug: "products",
  labels: { singular: "Product", plural: "Products" },
  interfaceName: "Product",
  fields: [
    // The URL Medusa stores (the guide's second gap: it never synced one).
    synced<TextField>({ name: "thumbnail", type: "text" }),
  ],
});
