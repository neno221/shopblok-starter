import { sectionEditor } from "../fields/section-editor";
import { sectionBlock } from "./section-block";

/** `richText` (SPEC §7.4): the editor's text, in each language. */
export const RichTextBlock = sectionBlock({
  slug: "richText",
  interfaceName: "RichTextBlock",
  plural: "Rich text",
  fields: [
    { name: "content", type: "richText", localized: true, required: true, editor: sectionEditor },
  ],
});
