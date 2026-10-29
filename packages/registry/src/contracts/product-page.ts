import { z } from "zod";
import { Href, Id, Link } from "./content";
import { Image } from "./image";
import { PageState } from "./listing";
import { PriceSummary, ProductDetail, ProductMedia } from "./product";
import { RatingSummary, Review } from "./review";

// T38: what a product page's organisms show (SPEC §8.4: the gallery with zoom, the variants with the
// URL, add to cart disabled until every option is chosen, quantity, stock, delivery and returns, the
// size guide, the mobile sticky add to cart). They are built from T32's product molecules, so these
// contracts are mostly ProductDetail with what the page has chosen; what is new is checked here: a
// choice that names an option or a value the product does not have, a quantity over its limit, a
// page of reviews that holds more than the product has, and a size table whose rows do not match its
// sizes.

const uniqueIds = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

/**
 * The options chosen so far, option id to value id: what the page's URL says (SPEC §8.4's two-way
 * sync). An option left out is not chosen yet.
 */
export const VariantSelection = z.record(z.string(), z.string());

/**
 * The product's pictures (ProductGallery). The main picture is the first one, or the first that
 * shows a value chosen (`selectedValueIds`: the colour picked shows its picture); every picture stays
 * in the thumbnails, so choosing a colour hides nothing.
 */
export const ProductGallery = z
  .object({
    title: z.string().min(1).describe("The product's name: the gallery is named after it"),
    media: z.array(ProductMedia).min(1).max(24),
    selectedValueIds: z
      .array(Id)
      .describe("The option values chosen: the first picture that shows one is the main one"),
  })
  .refine(
    (gallery) => new Set(gallery.selectedValueIds).size === gallery.selectedValueIds.length,
    "a chosen value is listed twice",
  );

/**
 * The buy box (BuyBox), and the quick view (QuickViewDialog) that holds it: the product, what is
 * chosen, the quantity, and short notes under the button. The button adds to the cart only when
 * every option has a value and that variant can be bought (SPEC §8.4).
 */
export const BuyBox = z
  .object({
    product: ProductDetail,
    selection: VariantSelection.describe("The options chosen so far, option id to value id"),
    quantity: z.int().min(1).describe("The quantity in the stepper"),
    maxQuantity: z.int().min(1).max(99).describe("The most one cart line takes"),
    notes: z
      .array(z.string().min(1))
      .max(3)
      .describe("Short lines under the button: when it arrives, free returns"),
  })
  .superRefine((box, context) => {
    for (const [optionId, valueId] of Object.entries(box.selection)) {
      const option = box.product.options.find((each) => each.id === optionId);
      if (option === undefined)
        context.addIssue({
          code: "custom",
          path: ["selection", optionId],
          message: `the product has no option ${optionId}`,
        });
      else if (!option.values.some((value) => value.id === valueId))
        context.addIssue({
          code: "custom",
          path: ["selection", optionId],
          message: `option ${optionId} has no value ${valueId}`,
        });
    }
    if (box.quantity > box.maxQuantity)
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "the quantity is over the most a line takes",
      });
  });

/**
 * The bar at the foot of a phone's window (MobileStickyATC) once the buy box's button has scrolled
 * away: the product, its price, what is chosen, and whether it can be added now.
 */
export const MobileStickyATC = z.object({
  title: z.string().min(1),
  image: Image.optional(),
  price: PriceSummary,
  choice: z
    .array(z.string().min(1))
    .describe("The chosen values' labels, in the options' order: what the button adds"),
  status: z
    .enum(["ready", "incomplete", "sold-out"])
    .describe(
      "ready: it adds; incomplete: an option is missing; sold-out: that variant cannot be bought",
    ),
});

/**
 * One block of a section of product information: paragraphs, a list, a table of facts, a link, or
 * the shop's rich text (an editor's description or delivery text, T69), which the storefront
 * renders from Payload and passes to the organism by the section's id, so the registry stays free
 * of Payload.
 */
export const ProductInfoBlock = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), paragraphs: z.array(z.string().min(1)).min(1) }),
  z.object({ kind: z.literal("list"), items: z.array(z.string().min(1)).min(1) }),
  z.object({
    kind: z.literal("facts"),
    rows: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(1),
  }),
  z.object({ kind: z.literal("link"), link: Link }),
  z
    .object({ kind: z.literal("rich") })
    .describe("The section's rich text, passed beside the content (`rich[section.id]`)"),
]);

export const ProductInfoSection = z.object({
  id: Id,
  title: z.string().min(1),
  blocks: z.array(ProductInfoBlock).min(1),
});

/**
 * A product's information in sections (ProductInfoAccordions): its description, its details, and
 * delivery and returns. The product gives the first two (Medusa), the shop the others (Payload).
 */
export const ProductInfo = z
  .object({ sections: z.array(ProductInfoSection).min(1).max(8) })
  .refine((info) => uniqueIds(info.sections), "a section is listed twice");

/**
 * A product's reviews (ReviewsSection): the ratings, one page of reviews, where that page is, and
 * where to write one. M8 brings the data; until then a page passes what it has.
 */
export const ReviewsSection = z
  .object({
    summary: RatingSummary.describe(
      "The ratings; its count is the number of written reviews the pages hold (the last page's range is counted back from it), so a source that also counts star-only ratings passes the written ones here",
    ),
    reviews: z.array(Review).max(24).describe("This page's reviews, newest first"),
    page: PageState,
    writeHref: Href.optional().describe("Where a reviewer writes one"),
  })
  .refine((section) => uniqueIds(section.reviews), "a review is listed twice")
  .refine(
    (section) => section.reviews.length <= section.summary.count,
    "the page holds more reviews than the product has",
  );

/** A measurement in centimetres: one value, or a range from the first to the second. */
export const SizeMeasure = z.union([
  z.number().positive(),
  z
    .object({ from: z.number().positive(), to: z.number().positive() })
    .refine((range) => range.from < range.to, "a range ends before it starts"),
]);

/**
 * A size guide (SizeGuideDialog): a table of the body's measurements per size, in centimetres, shown
 * in centimetres or inches. `unit` is the one shown first (the market's: inches in the US).
 */
export const SizeGuide = z
  .object({
    title: z.string().min(1).describe("What the table measures: a heading of its own"),
    sizes: z.array(z.string().min(1)).min(1).max(12),
    rows: z.array(z.object({ id: Id, label: z.string().min(1), cm: z.array(SizeMeasure) })).min(1),
    unit: z.enum(["cm", "in"]),
    note: z.string().min(1).optional().describe("How to measure"),
  })
  .refine((guide) => new Set(guide.sizes).size === guide.sizes.length, "a size is listed twice")
  .refine((guide) => uniqueIds(guide.rows), "a measurement is listed twice")
  .refine(
    (guide) => guide.rows.every((row) => row.cm.length === guide.sizes.length),
    "a measurement has not one value per size",
  );

export type VariantSelection = z.infer<typeof VariantSelection>;
export type ProductGallery = z.infer<typeof ProductGallery>;
export type BuyBox = z.infer<typeof BuyBox>;
export type MobileStickyATC = z.infer<typeof MobileStickyATC>;
export type ProductInfoBlock = z.infer<typeof ProductInfoBlock>;
export type ProductInfoSection = z.infer<typeof ProductInfoSection>;
export type ProductInfo = z.infer<typeof ProductInfo>;
export type ReviewsSection = z.infer<typeof ReviewsSection>;
export type SizeMeasure = z.infer<typeof SizeMeasure>;
export type SizeGuide = z.infer<typeof SizeGuide>;
