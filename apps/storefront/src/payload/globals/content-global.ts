import type { Field, GlobalConfig } from "payload";
import { globalTag, type ContentGlobalSlug } from "../../lib/cms/globals";
import { isStaff, staffOrPublished } from "../access/roles";
import { translationStatusField } from "../fields/translation-status";
import { revalidateGlobalOnPublish } from "../hooks/revalidate-on-publish";

export { CONTENT_GLOBALS } from "../../lib/cms/globals";

/**
 * What the three content globals share (D78): read by anyone once published (a draft only by
 * staff, as `pages`), edited by staff, with drafts, autosave and up to 50 versions, live preview
 * (the root config lists them) and `revalidateGlobalOnPublish` with `global:<slug>:<locale>` in
 * every language. A draft save or an autosave revalidates nothing; a publish does. The sidebar
 * shows the translation status (D107, T89).
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
    // DIAG (temporary, to be reverted): each phase of a save, in the server's log.
    hooks: {
      beforeOperation: [
        ({ req, operation }) => {
          req.context["diag"] = performance.now();
          console.log(`DIAG-SRV ${slug} ${operation} start`);
        },
      ],
      beforeValidate: [
        ({ req }) => {
          console.log(
            `DIAG-SRV ${slug} beforeValidate ${Math.round(performance.now() - Number(req.context["diag"]))}`,
          );
        },
      ],
      beforeChange: [
        ({ req, data }) => {
          console.log(
            `DIAG-SRV ${slug} beforeChange ${Math.round(performance.now() - Number(req.context["diag"]))}`,
          );
          return data;
        },
        ...revalidate.beforeChange,
        ({ req, data }) => {
          console.log(
            `DIAG-SRV ${slug} beforeChange-end ${Math.round(performance.now() - Number(req.context["diag"]))}`,
          );
          return data;
        },
      ],
      afterChange: [
        ({ req, doc }) => {
          console.log(
            `DIAG-SRV ${slug} afterChange ${Math.round(performance.now() - Number(req.context["diag"]))}`,
          );
          return doc;
        },
        ...revalidate.afterChange,
        ({ req, doc }) => {
          console.log(
            `DIAG-SRV ${slug} afterChange-end ${Math.round(performance.now() - Number(req.context["diag"]))}`,
          );
          return doc;
        },
      ],
      afterRead: [
        ({ req, doc }) => {
          if (req.context["diag"] !== undefined)
            console.log(
              `DIAG-SRV ${slug} afterRead ${Math.round(performance.now() - Number(req.context["diag"]))}`,
            );
          return doc;
        },
      ],
    },
    fields: [translationStatusField({ global: slug }), ...fields],
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
