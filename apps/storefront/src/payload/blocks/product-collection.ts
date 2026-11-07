import { COLLECTION_PICTURE_DESIGNS, VARIANTS } from "@shopblok/registry/contracts";
import type { UploadFieldSingleValidation } from "payload";
import { upload } from "payload/shared";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { productSource } from "../fields/product-source";
import { imageField, isVariant, requiredFor, sectionBlock } from "./section-block";

/** The designs that draw the editor's picture beside or among the products (T81). */
export const COLLECTION_NEEDS_PICTURE: readonly string[] = COLLECTION_PICTURE_DESIGNS;

/** Every design but `tabs`, which takes its products from its tabs' sources. */
const NOT_TABS = VARIANTS["product-collection"].filter((design) => design !== "tabs");

/**
 * The picture, required for the designs that draw it (T81): Payload's own check first (a picture of
 * `media`), then the design's need, in the editor's words. The section's contract refuses the same
 * block (`variantNeeds`), so a block saved before this check is left out of the page.
 */
const validateMedia: UploadFieldSingleValidation = requiredFor(
  COLLECTION_NEEDS_PICTURE,
  "This design draws a picture beside the products: choose one.",
  upload,
);

/**
 * `productCollection` (SPEC §7.4): products from a `productSource`, as a grid or a carousel. T81
 * (M5 plan §1a): the `with-banner` and `lookbook` designs' picture, and the `tabs` design's two to
 * four tabs, each a label and a source of its own, which take the block's source's place; the
 * display (carousel or grid) is the first design's alone. Each is shown and checked only for its
 * designs (`admin.condition`).
 */
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
      admin: { condition: isVariant("standard") },
    },
    {
      ...imageField("media"),
      validate: validateMedia,
      admin: {
        condition: isVariant(...COLLECTION_NEEDS_PICTURE),
        description: "The With banner and Lookbook designs draw it beside the products.",
      },
    },
    {
      name: "links",
      type: "array",
      maxRows: 1,
      admin: { description: "The listing the products come from." },
      fields: [link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["text"] })],
    },
    (() => {
      const source = productSource();
      return { ...source, admin: { ...source.admin, condition: isVariant(...NOT_TABS) } };
    })(),
    {
      name: "tabs",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 4,
      labels: { singular: "Tab", plural: "Tabs" },
      admin: {
        condition: isVariant("tabs"),
        description:
          "Two to four tabs, each with its own products. Only the first tab's are in the page; a tab whose products are not sold in a market is left out there.",
      },
      fields: [
        { name: "label", type: "text", localized: true, required: true },
        productSource({ empty: false }),
      ],
    },
  ],
});
