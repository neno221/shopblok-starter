import { hideDeletedExceptHeld } from "../fields/link";
import { headingField, imageField, sectionBlock } from "./section-block";

/** `featuredProduct` (SPEC §7.4): one product, large, with the editor's words and picture. */
export const FeaturedProductBlock = sectionBlock({
  slug: "featuredProduct",
  interfaceName: "FeaturedProductBlock",
  plural: "Featured products",
  fields: [
    headingField,
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      filterOptions: hideDeletedExceptHeld("product"),
    },
    {
      name: "text",
      type: "textarea",
      localized: true,
      admin: { description: "A blank line starts a new paragraph." },
    },
    imageField("media", { description: "Instead of the product's first picture." }),
  ],
});
