import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";
import { seedKey } from "../fields/seed-key";
import { revalidateOnPublish } from "../hooks/revalidate-on-publish";

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
  // `pages:<locale>` for the reads of one language, `payload:pages` for every reader.
  hooks: revalidateOnPublish({ tags: (locale) => [`pages:${locale}`, "payload:pages"] }),
  // D74: autosave, scheduled publishing (on the jobs queue) and up to 50 versions per page. The
  // Save Draft button stays next to autosave, so an editor can still save a draft on purpose.
  versions: {
    drafts: { autosave: { showSaveDraftButton: true }, schedulePublish: true },
    maxPerDoc: 50,
  },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true, required: true },
    seedKey(),
  ],
};
