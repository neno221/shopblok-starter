import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";
import { revalidatePages } from "../hooks/revalidate-pages";

/** A stub (D12): the fields M4's content model grows from, and drafts to test the read rule. */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug", "_status", "updatedAt"] },
  access: {
    // A visitor sees published pages only; staff see drafts as well.
    read: staffOrPublished,
    // Unset, Payload lets any signed-in user through, an integration's API key included, and the
    // versions hold every draft.
    readVersions: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: { afterChange: [revalidatePages] },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true, required: true },
    // S1 prototype: an upload field, so the suite can pick an image from the media drawer.
    { name: "heroImage", type: "upload", relationTo: "media" },
  ],
};
