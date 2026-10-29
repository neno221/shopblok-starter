import { USP_ICONS } from "@shopblok/registry/contracts";
import { sectionBlock } from "./section-block";

/** `uspBar` (SPEC §7.4): up to six promises, each an icon and a title, with a line if wanted. */
export const UspBarBlock = sectionBlock({
  slug: "uspBar",
  interfaceName: "UspBarBlock",
  plural: "USP bars",
  fields: [
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: "icon", type: "select", required: true, options: [...USP_ICONS] },
        { name: "title", type: "text", localized: true, required: true },
        { name: "text", type: "text", localized: true },
      ],
    },
  ],
});
