import type { UploadFieldSingleValidation } from "payload";
import { upload } from "payload/shared";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { hideDeletedExceptHeld, link } from "../fields/link";
import { productSource } from "../fields/product-source";
import { imageField, sectionBlock } from "./section-block";

/** The hero's variants that draw their words over or beside the picture, so they need it (T80). */
export const HERO_NEEDS_PICTURE: readonly string[] = ["overlay", "editorial"];

const isVariant =
  (...variants: string[]) =>
  (_: unknown, sibling: Record<string, unknown>) =>
    variants.includes(String(sibling["variant"]));

/**
 * The picture, required for the variants that draw their words on or around it (T80): Payload's
 * own check first (a picture of `media`), then the variant's need, said in the editor's words. The
 * section's contract refuses the same block (`variantNeeds`), so a block saved before this check
 * is left out of the page rather than drawn without its picture.
 */
const validateMedia: UploadFieldSingleValidation = async (value, args) => {
  const base = await upload(value, args);
  if (base !== true) return base;
  const variant = String((args.siblingData as { variant?: unknown } | undefined)?.variant);
  return value == null && HERO_NEEDS_PICTURE.includes(variant)
    ? "This design draws its words on the picture: choose one."
    : true;
};

/**
 * `hero` (SPEC §7.4): a page's opening band. The words in each language, a picture, up to two
 * links, an optional countdown to an offer's end and up to four products from a source. T80 (M5
 * plan §1a): the `editorial` variant's second picture and the `collection-switcher`'s collections,
 * each shown and checked only for its variant (`admin.condition`); the other variants use the
 * fields above (`product` the source's first product, `bento` its products as tiles).
 */
export const HeroBlock = sectionBlock({
  slug: "hero",
  interfaceName: "HeroBlock",
  plural: "Heroes",
  fields: [
    { name: "eyebrow", type: "text", localized: true },
    { name: "heading", type: "text", localized: true, required: true },
    { name: "subheading", type: "textarea", localized: true },
    {
      ...imageField("media", {
        description: "The Overlay and Editorial designs need one; the Text design shows none.",
      }),
      validate: validateMedia,
    },
    {
      ...imageField("secondMedia", { required: true }),
      label: "Second picture",
      admin: {
        condition: isVariant("editorial"),
        description: "The smaller second picture.",
      },
    },
    {
      name: "collections",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 4,
      labels: { singular: "Collection", plural: "Collections" },
      admin: {
        condition: isVariant("collection-switcher"),
        description:
          "Two to four collections, each a tab with its own picture. A collection gone from Medusa is left out.",
      },
      fields: [
        {
          name: "collection",
          type: "relationship",
          relationTo: "collections",
          required: true,
          filterOptions: hideDeletedExceptHeld("collection"),
        },
        imageField("media", { required: true }),
      ],
    },
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
