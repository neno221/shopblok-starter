import { syncedCollection } from "./synced-collection";

/** Medusa's product collections (D75). T69 adds the CMS fields. */
export const Collections = syncedCollection({
  slug: "collections",
  labels: { singular: "Collection", plural: "Collections" },
  interfaceName: "ProductCollection",
});
