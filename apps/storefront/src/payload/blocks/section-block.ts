import { sectionEntries } from "@shopblok/registry";
import type { Block, Field, UploadField } from "payload";
import { sectionSettings } from "../fields/section-settings";
import { variantField } from "../fields/variant";

export type SectionBlockOptions = {
  /** The block's slug (`richText`): the `block` of its Sections entry in the registry (D70). */
  slug: string;
  /** Its TypeScript interface in `payload-types.ts` (`RichTextBlock`). */
  interfaceName: string;
  plural: string;
  /** The content fields, between the variant and the section settings. */
  fields: Field[];
  /** The settings' defaults where the section's own differ (`sectionSettings`). */
  settings?: Parameters<typeof sectionSettings>[0];
};

/**
 * A block of `pages.layout` (D79, SPEC §7.4): its `variant` (the registry family's variants, one
 * each until M5, drawn by the variant picker), its content fields and its `sectionSettings`, in
 * that order. The drawer's thumbnail and the singular label are the registry entry's (D52's
 * `/registry/sections/{slug}.png`), so the DS, the drawer and the picker show the same picture. A
 * slug the registry has no section for fails here, when the config loads.
 */
export function sectionBlock({
  slug,
  interfaceName,
  plural,
  fields,
  settings,
}: SectionBlockOptions): Block {
  const entry = sectionEntries().find((each) => each.block === slug);
  if (entry?.family === undefined || entry.thumbnail === undefined)
    throw new Error(`sectionBlock: the registry has no section for the block "${slug}".`);
  return {
    slug,
    interfaceName,
    labels: { singular: entry.label, plural },
    admin: { images: { thumbnail: { url: entry.thumbnail, alt: entry.label } } },
    fields: [variantField({ family: entry.family }), ...fields, sectionSettings(settings)],
  };
}

/** The mime types a field of `media` may pick, as Payload's `filterOptions` (also checked on save). */
export function mediaOfType(prefixes: readonly string[]): UploadField["filterOptions"] {
  return { or: prefixes.map((prefix) => ({ mimeType: { like: `${prefix}%` } })) };
}

/** An upload of `media` limited to pictures. */
export function imageField(
  name: string,
  options: { required?: boolean; description?: string } = {},
) {
  return {
    name,
    type: "upload",
    relationTo: "media",
    required: options.required ?? false,
    filterOptions: mediaOfType(["image/"]),
    ...(options.description === undefined ? {} : { admin: { description: options.description } }),
  } satisfies UploadField;
}

/** A section's optional heading, in each language. */
export const headingField = {
  name: "heading",
  type: "text",
  localized: true,
} as const satisfies Field;
