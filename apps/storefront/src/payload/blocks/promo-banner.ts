import type {
  DateFieldValidation,
  TextFieldSingleValidation,
  UploadFieldSingleValidation,
} from "payload";
import { date, text, upload } from "payload/shared";
import { CATALOG_COLLECTIONS } from "../../lib/cms/paths";
import { link } from "../fields/link";
import { imageField, requiredFor, sectionBlock } from "./section-block";

/** A promotion code as Medusa takes one at the cart: letters, digits, `-` and `_`, 40 at most. */
export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

/** The picture, required for the `full-bleed` design (T82), which draws the offer on it. */
const validateMedia: UploadFieldSingleValidation = requiredFor(
  ["full-bleed"],
  "This design draws the offer on the picture: choose one.",
  upload,
);

/** The end, required for the `countdown` design (T82), which counts down to it. */
const validateEnd: DateFieldValidation = requiredFor(
  ["countdown"],
  "This design counts down to the offer's end: set one.",
  date,
);

/**
 * `promoBanner` (SPEC §7.4, D79): an offer with a code to copy, its end and the small print. The
 * code is not checked against Medusa here: Medusa validates it at the cart. T82 (M5 plan §1a): the
 * `full-bleed` design needs the picture and `countdown` the end; `popup` shows the offer once per
 * visitor at the window's corner after the cookie choice (in its place without scripts).
 */
export const PromoBannerBlock = sectionBlock({
  slug: "promoBanner",
  interfaceName: "PromoBannerBlock",
  plural: "Promo banners",
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    {
      name: "text",
      type: "textarea",
      localized: true,
      admin: { description: "A blank line starts a new paragraph." },
    },
    {
      name: "code",
      type: "text",
      // Payload's own check first (a custom `validate` replaces it), then the code's shape.
      validate: ((value, args) => {
        const base = text(value, args);
        if (base !== true) return base;
        return value == null || value === "" || PROMO_CODE_PATTERN.test(value)
          ? true
          : "Letters, digits, - and _, at most 40.";
      }) satisfies TextFieldSingleValidation,
      admin: { description: "The promotion's code in Medusa, which shoppers copy." },
    },
    { name: "terms", type: "textarea", localized: true },
    {
      name: "endsAt",
      type: "date",
      validate: validateEnd,
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        description:
          "When the offer ends; after it, the banner is not shown. The Countdown design needs one.",
      },
    },
    {
      ...imageField("media", {
        description:
          "The Full bleed design needs one; the Strip, Ticket and Countdown designs show none.",
      }),
      validate: validateMedia,
    },
    {
      name: "links",
      type: "array",
      maxRows: 1,
      fields: [
        link({ relationTo: [...CATALOG_COLLECTIONS], appearances: ["default", "outline", "text"] }),
      ],
    },
  ],
});
