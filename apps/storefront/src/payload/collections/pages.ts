import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";
import { seedKey } from "../fields/seed-key";
import { revalidateOnPublish } from "../hooks/revalidate-on-publish";
import { pageTags } from "../../lib/cms/tags";
import { LAYOUT_BLOCKS } from "../blocks";

/**
 * A page (D12): its title and slug, and its `layout`, the blocks between the header and the footer
 * (T63, D79). T65 adds the page template, its parents and its route.
 */
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
  hooks: revalidateOnPublish({ tags: pageTags }),
  // D74: autosave, scheduled publishing (on the jobs queue) and up to 50 versions per page. The
  // Save Draft button stays next to autosave, so an editor can still save a draft on purpose.
  versions: {
    drafts: { autosave: { showSaveDraftButton: true }, schedulePublish: true },
    maxPerDoc: 50,
  },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true, required: true },
    // SPEC §7.4: every language shares the blocks and their order, and localizes their text (a
    // fully localized layout is M5's). The blocks are the root config's (`payload/blocks/`).
    { name: "layout", type: "blocks", blocks: [], blockReferences: LAYOUT_BLOCKS },
    seedKey(),
  ],
};
