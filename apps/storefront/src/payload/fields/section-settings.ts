import type { GroupField } from "payload";

/** The surfaces a section may sit on (SPEC §7.4); the theme's tokens decide what each looks like. */
export const SURFACES = ["default", "muted", "inverse"] as const;
/** The space above and below a section. */
export const SPACINGS = ["none", "small", "medium", "large"] as const;
/** How wide the content runs. */
export const CONTAINERS = ["narrow", "default", "wide", "full"] as const;
/** Where a section shows: everywhere, or only below or from the `lg` breakpoint. */
export const VISIBILITIES = ["all", "mobile", "desktop"] as const;

/**
 * Every block's `sectionSettings` (SPEC §7.4, D79): anchor, spacing, surface, container and
 * visibility. Not localized: all languages share a page's structure. T63's `RenderBlocks` applies
 * them; the anchor becomes the section's `id`.
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
          value == null || value === "" || /^[a-z][a-z0-9-]*$/.test(value)
            ? true
            : "Lower-case letters, digits and hyphens, starting with a letter.",
      },
      { name: "spacing", type: "select", defaultValue: "medium", options: [...SPACINGS] },
      { name: "surface", type: "select", defaultValue: "default", options: [...SURFACES] },
      { name: "container", type: "select", defaultValue: "default", options: [...CONTAINERS] },
      { name: "visibility", type: "select", defaultValue: "all", options: [...VISIBILITIES] },
    ],
  };
}
