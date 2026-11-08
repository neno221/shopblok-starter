import type { BlocksField, Field, RadioField } from "payload";
import { CATALOG_SECTIONS_MODES, type CatalogSectionsMode } from "../../lib/cms/catalog-sections";
import { isStaffField } from "../access/roles";
import { CATALOG_SECTION_BLOCKS } from "../blocks";

/** Where the sections show, as the admin says it under the field. */
const WHERE = {
  product: "after the product's information, before the reviews",
  listing: "after the listing's results and their pagination",
} as const;

type Page = keyof typeof WHERE;

/** The `templates` global's tab whose default sections a document of this page takes. */
const DEFAULT_TAB: Record<Page, string> = { product: "Product page", listing: "Listing" };

const MODE_LABELS: Record<CatalogSectionsMode, string> = {
  default: "The default sections",
  own: "Its own sections",
  none: "None",
};

/**
 * Staff write it, never an integration (T69's content rule: the sync's value for it is dropped, as
 * an editor's value for a synced field is), and anyone reads it, like the document.
 * `custom.content` marks it for `synced.test.ts`.
 */
function staffOnly<F extends Field>(field: F): F {
  const access = "access" in field ? field.access : undefined;
  return {
    ...field,
    access: { ...access, create: isStaffField, update: isStaffField },
    custom: { ...("custom" in field ? field.custom : undefined), content: true },
  } as F;
}

/** The sections' blocks (D104): the pages' blocks but three, shared by every language (SPEC §7.4). */
export const sectionsBlocks = (description: string): BlocksField => ({
  name: "sections",
  type: "blocks",
  blocks: [],
  blockReferences: CATALOG_SECTION_BLOCKS,
  admin: { description },
});

/**
 * A synced document's sections (D104, T87): `sectionsMode` says which it shows (the `templates`
 * global's defaults for its page, its own, or none) and `sections` holds its own, shown only while
 * the mode is `own` (the blocks an editor wrote stay stored when the mode changes, so switching back
 * brings them back). Neither is localized: the blocks and their order are every language's, their
 * texts are each language's, as a page's `layout` (SPEC §7.4). No drafts (T69's reason): a save is
 * live at once.
 */
export const catalogSectionFields = (page: Page): Field[] => [
  staffOnly<RadioField>({
    name: "sectionsMode",
    type: "radio",
    label: "Sections",
    // Not `required`: the sync creates the documents, and may not write this field (a value it
    // may not write is dropped), so a required one could refuse its create. Unset reads as
    // `default` (`sectionsModeOf`).
    defaultValue: "default",
    options: CATALOG_SECTIONS_MODES.map((value) => ({ value, label: MODE_LABELS[value] })),
    admin: {
      layout: "horizontal",
      description: `Sections shown ${WHERE[page]}. The default sections are the Templates' (its ${DEFAULT_TAB[page]} tab).`,
    },
  }),
  staffOnly<BlocksField>({
    ...sectionsBlocks(`Shown ${WHERE[page]}, in every language; each block's texts are translated.`),
    admin: {
      description: `Shown ${WHERE[page]}, in every language; each block's texts are translated.`,
      condition: (_data, sibling) =>
        (sibling as { sectionsMode?: unknown } | undefined)?.sectionsMode === "own",
    },
  }),
];
