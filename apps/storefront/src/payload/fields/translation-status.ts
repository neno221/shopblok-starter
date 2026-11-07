import type { UIField } from "payload";
import type { TranslationTarget } from "../translation-status";

/** The components' path in the import map. */
const COMPONENTS = "/payload/components/translation-status";

/** What the status reads in `admin.custom`: the collection or the global it is on. */
export type TranslationStatusCustom = { translationStatus: TranslationTarget };

/**
 * D107 (T89): the translation status, a `ui` field in the form's sidebar (it stores nothing, so no
 * migration): for each open language, "complete", "n to translate" with the texts named and linked,
 * or "not started", computed by `components/translation-status.tsx` when the form opens. On `pages`
 * and `posts` it is also the list's "Translation" column, one read per list page.
 */
export function translationStatusField(target: TranslationTarget): UIField {
  const custom: TranslationStatusCustom = { translationStatus: target };
  const list = "collection" in target;
  return {
    name: "translationStatus",
    type: "ui",
    label: "Translation",
    admin: {
      position: "sidebar",
      custom,
      disableListColumn: !list,
      components: {
        Field: `${COMPONENTS}#TranslationStatusField`,
        ...(list ? { Cell: `${COMPONENTS}#TranslationStatusCell` } : {}),
      },
    },
  };
}
