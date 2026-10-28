import type { Field, GlobalConfig } from "payload";
import { globalTag, type ContentGlobalSlug } from "../../lib/cms/globals";
import { isStaff, staffOrPublished } from "../access/roles";
import { revalidateGlobalOnPublish } from "../hooks/revalidate-on-publish";

export { CONTENT_GLOBALS } from "../../lib/cms/globals";

/**
 * What the three content globals share (D78): read by anyone once published (a draft only by
 * staff, as `pages`), edited by staff, with drafts, autosave and up to 50 versions, live preview
 * (the root config lists them) and `revalidateGlobalOnPublish` with `global:<slug>:<locale>` in
 * every language. A draft save or an autosave revalidates nothing; a publish does.
 */
export function contentGlobal({
  slug,
  label,
  description,
  fields,
}: {
  slug: ContentGlobalSlug;
  label: string;
  description: string;
  fields: Field[];
}): GlobalConfig {
  const revalidate = revalidateGlobalOnPublish({ tags: (locale) => [globalTag(slug, locale)] });
  return {
    slug,
    label,
    admin: { group: "Site", description },
    access: {
      read: staffOrPublished,
      readVersions: isStaff,
      update: isStaff,
    },
    versions: { drafts: { autosave: { showSaveDraftButton: true } }, max: 50 },
    hooks: { beforeChange: revalidate.beforeChange, afterChange: revalidate.afterChange },
    fields,
  };
}

/** A field shown only while `when(siblingData)` holds (Payload neither shows nor validates it otherwise). */
export function shownWhen<F extends Field>(
  field: F,
  when: (sibling: Record<string, unknown>) => boolean,
): F {
  const admin = ("admin" in field ? field.admin : undefined) ?? {};
  return {
    ...field,
    admin: {
      ...admin,
      condition: (_: unknown, sibling: Record<string, unknown>) => when(sibling ?? {}),
    },
  } as F;
}
