import { hideDeletedExceptHeld } from "../fields/link";
import { SORT_OPTIONS } from "../fields/product-source";
import { imageField, sectionBlock } from "./section-block";

/**
 * `collectionSpotlight` (SPEC §7.4): a collection's picture and words beside a few of its
 * products, whose number and order the editor picks (the product source's collection mode).
 */
export const CollectionSpotlightBlock = sectionBlock({
  slug: "collectionSpotlight",
  interfaceName: "CollectionSpotlightBlock",
  plural: "Collection spotlights",
  fields: [
    {
      name: "collection",
      type: "relationship",
      relationTo: "collections",
      required: true,
      filterOptions: hideDeletedExceptHeld("collection"),
    },
    {
      name: "heading",
      type: "text",
      localized: true,
      admin: { description: "The collection's name unless you write one." },
    },
    {
      name: "text",
      type: "textarea",
      localized: true,
      admin: { description: "A blank line starts a new paragraph." },
    },
    imageField("media"),
    {
      name: "limit",
      type: "number",
      required: true,
      min: 0,
      max: 8,
      defaultValue: 4,
      admin: { step: 1, description: "How many of its products; 0 shows none." },
    },
    {
      name: "sort",
      type: "select",
      required: true,
      defaultValue: "newest",
      options: SORT_OPTIONS,
    },
  ],
});
