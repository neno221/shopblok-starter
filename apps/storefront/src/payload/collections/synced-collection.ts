import type { CollectionConfig, Field } from "payload";
import { catalogContentTag, linkedTags } from "../../lib/cms/tags";
import { isMedusaSync, staffOrMedusaSync } from "../access/roles";
import {
  deletedInMedusaField,
  handleField,
  medusaIdField,
  medusaUpdatedAtField,
  syncedAtField,
  titleField,
} from "../fields/synced";
import { revalidateOnPublish, revalidateWhenChanged } from "../hooks/revalidate-on-publish";

type SyncedCollection = {
  slug: "products" | "categories" | "collections";
  labels: { singular: string; plural: string };
  /** The name of its type in `payload-types.ts` (`collections` would make it `Collection`). */
  interfaceName: string;
  /** Synced fields after the common ones (a product's thumbnail, a category's parent and rank). */
  fields?: Field[];
  /** The shop's own content on the document (T69, `fields/catalog-content.ts`), after the synced fields. */
  content?: Field[];
};

/**
 * A collection that follows Medusa (D75): the sync creates and deletes its documents and writes
 * their synced fields; staff may update a document, but only its content fields (T69), which the
 * sync may not write. Anyone may read: they hold what the storefront shows anyway.
 *
 * **No drafts:** a save is what the shop shows. The sync updates a document over the REST API
 * without `draft`, and Payload builds such an update on the document's latest version
 * (`getLatestCollectionVersion`), so with drafts on, a product event in Medusa would publish
 * whatever draft an editor had pending. Live preview needs drafts (autosave) to show anything
 * before a save, so these collections have none either (SETUP.md, "Catalog content (T69)").
 */
export function syncedCollection({
  slug,
  labels,
  interfaceName,
  fields = [],
  content = [],
}: SyncedCollection): CollectionConfig {
  // The content globals, the pages' blocks and the catalog's rich texts embed a linked document's
  // handle and whether Medusa deleted it (T61, T63, T69): a rename or a delete in Medusa refreshes
  // them, so neither the header, a page nor another product's description links to a page that is
  // gone.
  const embedded = revalidateWhenChanged({
    fields: ["handle", "deletedInMedusa"],
    tags: linkedTags,
  });
  // The document's own content read (T69, `lib/cms/catalog.ts`), under its old and its new handle.
  const own = revalidateOnPublish({
    tags: (_locale, doc) =>
      typeof doc["handle"] === "string" && doc["handle"] !== ""
        ? [catalogContentTag(slug, doc["handle"])]
        : [],
  });
  return {
    slug,
    labels,
    typescript: { interface: interfaceName },
    admin: {
      group: "Catalog",
      useAsTitle: "title",
      defaultColumns: ["title", "handle", "deletedInMedusa", "syncedAt"],
      description:
        "Follows Medusa: its name, handle and the other greyed-out fields are edited in Medusa Admin, and the sync writes them here. The fields below them are the shop's own content, and a save shows on the shop at once.",
    },
    access: {
      read: () => true,
      create: isMedusaSync,
      update: staffOrMedusaSync,
      delete: isMedusaSync,
    },
    hooks: {
      beforeChange: own.beforeChange,
      afterChange: [...embedded.afterChange, ...own.afterChange],
      afterDelete: [...embedded.afterDelete, ...own.afterDelete],
    },
    fields: [
      medusaIdField(),
      titleField(),
      handleField(),
      ...fields,
      ...content,
      deletedInMedusaField(),
      medusaUpdatedAtField(),
      syncedAtField(),
    ],
  };
}
