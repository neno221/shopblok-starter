import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { sectionEditor } from "../fields/section-editor";
import { headingField, imageField, sectionBlock } from "./section-block";

/** `mediaWithText` (SPEC §7.4): a picture beside a heading, rich text and up to two links. */
export const MediaWithTextBlock = sectionBlock({
  slug: "mediaWithText",
  interfaceName: "MediaWithTextBlock",
  plural: "Media with text",
  fields: [
    imageField("media", { required: true }),
    {
      name: "imageSide",
      type: "select",
      required: true,
      defaultValue: "end",
      options: [
        { label: "Before the text", value: "start" },
        { label: "After the text", value: "end" },
      ],
      admin: { description: "From wide screens up; on a phone the picture is above the text." },
    },
    headingField,
    { name: "content", type: "richText", localized: true, editor: sectionEditor },
    {
      name: "links",
      type: "array",
      maxRows: 2,
      fields: [
        link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["default", "outline", "text"] }),
      ],
    },
  ],
});
