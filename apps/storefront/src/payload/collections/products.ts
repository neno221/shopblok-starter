import type { TextField } from "payload";
import { productContentFields } from "../fields/catalog-content";
import { synced } from "../fields/synced";
import { metaContentField } from "../seo";
import { syncedCollection } from "./synced-collection";

/** Medusa's products (D75), with the shop's description and pictures (D83). */
export const Products = syncedCollection({
  slug: "products",
  labels: { singular: "Product", plural: "Products" },
  interfaceName: "Product",
  fields: [
    // The URL Medusa stores (the guide's second gap: it never synced one).
    synced<TextField>({ name: "thumbnail", type: "text" }),
  ],
  content: [...productContentFields(), metaContentField()],
});
