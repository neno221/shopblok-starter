import type { Field, RichTextField, UploadField } from "payload";
import { isStaffField } from "../access/roles";
import { sectionEditor, textEditor } from "./section-editor";

/**
 * A synced document's own content (D83, T69): what the shop's editors write next to Medusa's
 * fields. Staff write it, never an integration (the sync's value for it is dropped, as an editor's
 * value for a synced field is); anyone reads it, like the document. `custom.content` marks it for
 * `synced.test.ts`, which checks that no field is both synced and content.
 */
function content<F extends RichTextField | UploadField>(field: F): F {
  return {
    ...field,
    access: { ...field.access, create: isStaffField, update: isStaffField },
    custom: { ...field.custom, content: true },
  } as F;
}

/** The most pictures a product's gallery adds after Medusa's (the gallery shows 24 at most). */
export const MAX_GALLERY = 12;

/**
 * A product's content: a rich description the product page shows instead of Medusa's plain one,
 * and pictures it shows after Medusa's. The description's headings start at `h3`: it sits under
 * the page's "Description" section, an `h2`.
 */
export const productContentFields = (): Field[] => [
  content<RichTextField>({
    name: "richDescription",
    type: "richText",
    localized: true,
    editor: textEditor(["h3", "h4"]),
    admin: {
      description:
        "Shown on the product page instead of Medusa's description. Empty: Medusa's description.",
    },
  }),
  content<UploadField>({
    name: "gallery",
    type: "upload",
    relationTo: "media",
    hasMany: true,
    maxRows: MAX_GALLERY,
    filterOptions: { mimeType: { contains: "image" } },
    admin: { description: "More pictures, shown after Medusa's in the product page's gallery." },
  }),
];

/**
 * A category's or collection's content: a picture for its tile on the home (instead of its newest
 * product's), a banner and an introduction at the top of its listing page.
 */
export const listingContentFields = (): Field[] => [
  content<UploadField>({
    name: "image",
    type: "upload",
    relationTo: "media",
    filterOptions: { mimeType: { contains: "image" } },
    admin: {
      description: "The tile's picture on the home's category tiles. Empty: its newest product's.",
    },
  }),
  content<UploadField>({
    name: "banner",
    type: "upload",
    relationTo: "media",
    filterOptions: { mimeType: { contains: "image" } },
    admin: { description: "A wide picture at the top of its listing page, under the title." },
  }),
  content<RichTextField>({
    name: "intro",
    type: "richText",
    localized: true,
    editor: sectionEditor,
    admin: { description: "A few lines under the title of its listing page." },
  }),
];
