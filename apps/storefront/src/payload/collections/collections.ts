import { listingContentFields } from "../fields/catalog-content";
import { metaContentField } from "../seo";
import { syncedCollection } from "./synced-collection";

/** Medusa's product collections (D75), with the shop's picture, banner and intro (D83). */
export const Collections = syncedCollection({
  slug: "collections",
  labels: { singular: "Collection", plural: "Collections" },
  interfaceName: "ProductCollection",
  content: [...listingContentFields(), metaContentField()],
});
