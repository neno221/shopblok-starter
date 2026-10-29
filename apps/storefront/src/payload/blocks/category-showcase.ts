import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { categorySource } from "../fields/category-source";
import { link } from "../fields/link";
import { headingField, sectionBlock } from "./section-block";

/** `categoryShowcase` (SPEC §7.4): categories as tiles, from a `categorySource`. */
export const CategoryShowcaseBlock = sectionBlock({
  slug: "categoryShowcase",
  interfaceName: "CategoryShowcaseBlock",
  plural: "Category showcases",
  fields: [
    headingField,
    { name: "intro", type: "textarea", localized: true },
    {
      name: "links",
      type: "array",
      maxRows: 1,
      fields: [
        link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["text", "default", "outline"] }),
      ],
    },
    categorySource(),
  ],
});
