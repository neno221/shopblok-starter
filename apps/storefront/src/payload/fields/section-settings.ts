import {
  ANCHOR_PATTERN,
  SECTION_CONTAINERS as CONTAINERS,
  SECTION_SPACINGS as SPACINGS,
  SECTION_SURFACES as SURFACES,
  SECTION_VISIBILITIES as VISIBILITIES,
} from "@shopblok/registry/contracts";
import type { GroupField } from "payload";

// The options are the sections' contract's (`SectionSettings`, T63), so what an editor can pick is
// what `SectionFrame` draws.
export { CONTAINERS, SPACINGS, SURFACES, VISIBILITIES };

/**
 * The Postgres enum of a setting: `enum_<the block's table>_ss_<setting>`. Payload's default,
 * `enum_<table>_section_settings_<setting>`, passes Postgres' 63 characters for a block slug longer
 * than 14 (`enum__pages_v_blocks_media_with_text_section_settings_visibility` is 64), and Payload
 * refuses the config. The table Payload passes is the group's (`…_section_settings`).
 */
const enumName =
  (setting: string) =>
  ({ tableName = "section" }: { tableName?: string }) =>
    `enum_${tableName.replace(/_section_settings$/, "")}_ss_${setting}`;

/**
 * Every block's `sectionSettings` (SPEC §7.4, D79): anchor, spacing, surface, container and
 * visibility. Not localized: all languages share a page's structure. `RenderBlocks` (T63) passes
 * them to the section, whose `SectionFrame` applies them; the anchor becomes the section's `id`.
 */
export function sectionSettings(): GroupField {
  return {
    name: "sectionSettings",
    type: "group",
    admin: { hideGutter: true },
    fields: [
      {
        name: "anchor",
        type: "text",
        // An `id` a link can jump to: lower-case letters, digits and hyphens.
        validate: (value: string | null | undefined) =>
          value == null || value === "" || ANCHOR_PATTERN.test(value)
            ? true
            : "Lower-case letters, digits and hyphens, starting with a letter.",
      },
      {
        name: "spacing",
        type: "select",
        defaultValue: "medium",
        options: [...SPACINGS],
        enumName: enumName("spacing"),
      },
      {
        name: "surface",
        type: "select",
        defaultValue: "default",
        options: [...SURFACES],
        enumName: enumName("surface"),
      },
      {
        name: "container",
        type: "select",
        defaultValue: "default",
        options: [...CONTAINERS],
        enumName: enumName("container"),
      },
      {
        name: "visibility",
        type: "select",
        defaultValue: "all",
        options: [...VISIBILITIES],
        enumName: enumName("visibility"),
      },
    ],
  };
}
