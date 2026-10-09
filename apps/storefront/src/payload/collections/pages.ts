import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";

/** A stub (D12): the fields M4's content model grows from, and drafts to test the read rule. */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug", "_status", "updatedAt"] },
  access: {
    // A visitor sees published pages only; staff see drafts as well.
    read: staffOrPublished,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true, required: true },
  ],
};
