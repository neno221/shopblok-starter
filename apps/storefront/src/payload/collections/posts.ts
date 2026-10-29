import type { CollectionConfig } from "payload";
import { isStaff, staffOrPublished } from "../access/roles";
import { imageField } from "../blocks/section-block";
import { sectionEditor } from "../fields/section-editor";
import { seedKey } from "../fields/seed-key";
import { postSlugField } from "../fields/slug";
import { keepRefusalReason } from "../hooks/keep-refusal-reason";
import { revalidateOnPublish } from "../hooks/revalidate-on-publish";
import { postTags } from "../../lib/cms/tags";

// `posts:<locale>` for the reads of one language, `payload:posts` for every reader. A page whose
// `editorialList` block lists posts reads them through the same tagged reads (`lib/cms/posts.ts`),
// so its cached render is refreshed with them.
const revalidate = revalidateOnPublish({ tags: postTags });

/**
 * A post of the journal (D80, T66): its title, slug, summary and text in each language, its hero
 * picture, its author and its date. Visitors read it at `{m}/journal/<slug>` and in the journal's
 * list, newest `publishedAt` first; a page's `editorialList` block lists the newest or the editor's
 * picks. Drafts, autosave, scheduling and live preview as the pages have them (D74).
 */
export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "publishedAt", "_status", "updatedAt"],
  },
  defaultSort: "-publishedAt",
  access: {
    // A visitor sees published posts only; staff see drafts as well.
    read: staffOrPublished,
    // Unset, Payload lets any signed-in user through, an integration's API key included, and the
    // versions hold every draft.
    readVersions: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  // A refused save says why (a slug's reason) in a production build too.
  hooks: { ...revalidate, afterError: [keepRefusalReason] },
  // D74, as `pages` (T65): autosave 375 ms after the last key, so the live-preview frame redraws
  // within 3 s; scheduled publishing on the jobs queue; up to 50 versions.
  versions: {
    drafts: {
      autosave: { interval: 375, showSaveDraftButton: true },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    postSlugField(),
    {
      name: "publishedAt",
      type: "date",
      required: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
        description: "The post's date, which orders the journal (newest first).",
      },
    },
    {
      name: "author",
      type: "text",
      admin: { position: "sidebar", description: "Shown as “By …” beside the date." },
    },
    {
      name: "excerpt",
      type: "textarea",
      localized: true,
      admin: { description: "A sentence or two: the post's summary in lists, and its lead." },
    },
    imageField("hero", { description: "The post's picture, at its top and on its cards." }),
    // T63's block editor: h2 to h4 (the title is the page's h1), lists, quotes and links.
    { name: "content", type: "richText", localized: true, editor: sectionEditor },
    seedKey(),
  ],
};
