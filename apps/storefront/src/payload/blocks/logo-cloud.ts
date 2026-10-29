import type { TextFieldSingleValidation } from "payload";
import { headingField, imageField, sectionBlock } from "./section-block";

/** A logo's link is another site's: https only. */
const validateHttps: TextFieldSingleValidation = (value) => {
  if (value == null || value === "") return true;
  try {
    return new URL(value).protocol === "https:" && value.trim() === value
      ? true
      : "Use an https:// address.";
  } catch {
    return "Use an https:// address.";
  }
};

/** `logoCloud` (SPEC §7.4): brands or press, each a picture named by the brand. */
export const LogoCloudBlock = sectionBlock({
  slug: "logoCloud",
  interfaceName: "LogoCloudBlock",
  plural: "Logo clouds",
  fields: [
    headingField,
    {
      name: "logos",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 24,
      fields: [
        // The brand's name is a name: the same in every language, and the logo's alternative text.
        { name: "name", type: "text", required: true },
        imageField("image", { required: true }),
        {
          name: "url",
          type: "text",
          validate: validateHttps,
          admin: { description: "The brand's site (https), opened in a new tab." },
        },
      ],
    },
  ],
});
