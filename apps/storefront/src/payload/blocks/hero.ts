import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { productSource } from "../fields/product-source";
import { imageField, sectionBlock } from "./section-block";

/**
 * `hero` (SPEC §7.4): a page's opening band. The words in each language, a picture, up to two
 * links, an optional countdown to an offer's end and up to four products from a source.
 */
export const HeroBlock = sectionBlock({
  slug: "hero",
  interfaceName: "HeroBlock",
  plural: "Heroes",
  fields: [
    { name: "eyebrow", type: "text", localized: true },
    { name: "heading", type: "text", localized: true, required: true },
    { name: "subheading", type: "textarea", localized: true },
    imageField("media"),
    {
      name: "links",
      type: "array",
      maxRows: 2,
      fields: [
        link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["default", "outline", "text"] }),
      ],
    },
    {
      name: "countdownEnd",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description: "A countdown to this time; once it has passed, the countdown is not shown.",
      },
    },
    productSource({ optional: true, max: 4, defaultLimit: 4 }),
  ],
});
