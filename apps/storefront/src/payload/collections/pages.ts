import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";
import { seedKey } from "../fields/seed-key";
import { slugField } from "../fields/slug";
import { keepRefusalReason } from "../hooks/keep-refusal-reason";
import { revalidateOnPublish } from "../hooks/revalidate-on-publish";
import {
  keepPageWithChildren,
  nestedPageFields,
  populateBreadcrumbs,
  resaveInEveryLanguage,
} from "../nested-pages";
import { pageTags } from "../../lib/cms/tags";
import { LAYOUT_BLOCKS } from "../blocks";

// `pages:<locale>` for the reads of one language, `payload:pages` for every reader.
const revalidate = revalidateOnPublish({ tags: pageTags });

/**
 * A page (D12, D80): its title and slug, and its `layout`, the blocks between the header and the
 * footer (T63, D79), and its `parent` and `breadcrumbs` (`payload/nested-pages.ts`): its address is
 * the parents' slugs and its own, at `{m}/[...slug]` (T65).
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
  // The breadcrumbs (T65), with the re-save in every language last, once this save's own
  // revalidation is done. A page with pages under it is not deleted, and a refused save says why
  // (a slug's reason) in a production build too.
  hooks: {
    ...revalidate,
    beforeChange: [populateBreadcrumbs, ...revalidate.beforeChange],
    afterChange: [...revalidate.afterChange, resaveInEveryLanguage],
    beforeDelete: [keepPageWithChildren],
    afterError: [keepRefusalReason],
  },
  // D74: autosave, scheduled publishing (on the jobs queue) and up to 50 versions per page. The
  // Save Draft button stays next to autosave, so an editor can still save a draft on purpose.
  // Autosave saves 375 ms after the editor stops typing (Payload's default waits 2 s), so the
  // live-preview frame shows the change within 3 s (T65; it redraws on each save). An autosave
  // updates the page's one autosave version in place: no new version per pause.
  versions: {
    drafts: {
      autosave: { interval: 375, showSaveDraftButton: true },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    slugField(),
    // SPEC §7.4: every language shares the blocks and their order, and localizes their text (a
    // fully localized layout is M5's). The blocks are the root config's (`payload/blocks/`).
    { name: "layout", type: "blocks", blocks: [], blockReferences: LAYOUT_BLOCKS },
    ...nestedPageFields(),
    seedKey(),
  ],
};
