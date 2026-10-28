import type { CollectionConfig, Field } from "payload";
import { isMedusaSync, staffOrMedusaSync } from "../access/roles";
import {
  deletedInMedusaField,
  handleField,
  medusaIdField,
  medusaUpdatedAtField,
  syncedAtField,
  titleField,
} from "../fields/synced";

type SyncedCollection = {
  slug: "products" | "categories" | "collections";
  labels: { singular: string; plural: string };
  /** The name of its type in `payload-types.ts` (`collections` would make it `Collection`). */
  interfaceName: string;
  /** Synced fields after the common ones (a product's thumbnail, a category's parent and rank). */
  fields?: Field[];
};

/**
 * A collection that follows Medusa (D75): the sync creates and deletes its documents and writes
 * their synced fields; staff may update a document, but only the fields that are not synced (T69
 * adds them). Anyone may read: they hold what the storefront shows anyway.
 */
export function syncedCollection({
  slug,
  labels,
  interfaceName,
  fields = [],
}: SyncedCollection): CollectionConfig {
  return {
    slug,
    labels,
    typescript: { interface: interfaceName },
    admin: {
      group: "Catalog",
      useAsTitle: "title",
      defaultColumns: ["title", "handle", "deletedInMedusa", "syncedAt"],
      description: "Follows Medusa. Edit these fields in Medusa Admin; the sync writes them here.",
    },
    access: {
      read: () => true,
      create: isMedusaSync,
      update: staffOrMedusaSync,
      delete: isMedusaSync,
    },
    fields: [
      medusaIdField(),
      titleField(),
      handleField(),
      ...fields,
      deletedInMedusaField(),
      medusaUpdatedAtField(),
      syncedAtField(),
    ],
  };
}
