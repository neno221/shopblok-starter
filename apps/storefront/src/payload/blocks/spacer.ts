import { sectionBlock } from "./section-block";

/** `spacer` (SPEC §7.4): room between two sections, with a line or without. */
export const SpacerBlock = sectionBlock({
  slug: "spacer",
  interfaceName: "SpacerBlock",
  plural: "Spacers",
  fields: [
    {
      name: "size",
      type: "select",
      required: true,
      defaultValue: "medium",
      options: ["small", "medium", "large"],
    },
    { name: "divider", type: "checkbox", defaultValue: false, label: "Draw a line" },
  ],
});
