import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { productSource } from "../fields/product-source";
import { sectionBlock } from "./section-block";

/** `productCollection` (SPEC §7.4): products from a `productSource`, as a grid or a carousel. */
export const ProductCollectionBlock = sectionBlock({
  slug: "productCollection",
  interfaceName: "ProductCollectionBlock",
  plural: "Product collections",
  fields: [
    // The carousel is named by it, so it is asked for.
    { name: "heading", type: "text", localized: true, required: true },
    { name: "intro", type: "textarea", localized: true },
    {
      name: "display",
      type: "select",
      required: true,
      defaultValue: "carousel",
      options: [
        { value: "carousel", label: "A row that scrolls" },
        { value: "grid", label: "A grid" },
      ],
    },
    {
      name: "links",
      type: "array",
      maxRows: 1,
      admin: { description: "The listing the products come from." },
      fields: [link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["text"] })],
    },
    productSource(),
  ],
});
