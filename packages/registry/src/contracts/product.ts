import { z } from "zod";
import { Href, Id, Link } from "./content";
import { Image } from "./image";
import { Money } from "./money";
import { RatingOverview, RatingSummary } from "./review";

/** Stock as StockIndicator draws it; `quantity` is shown only when it is low. */
export const Stock = z.object({
  status: z.enum(["in-stock", "low", "out"]),
  quantity: z.int().nonnegative().optional(),
});

/**
 * A product's price as PriceBlock shows it: the price, the one it replaces on a sale, and whether
 * the variants' prices differ (then `price` is the lowest, shown as "from").
 */
export const PriceSummary = z
  .object({
    price: Money,
    compareAt: Money.optional().describe("The price before the sale, struck through"),
    varies: z.boolean().describe("The variants' prices differ: `price` is the lowest"),
  })
  .superRefine((summary, context) => {
    const { price, compareAt } = summary;
    if (compareAt === undefined) return;
    if (compareAt.currencyCode !== price.currencyCode)
      context.addIssue({ code: "custom", message: "compareAt is in another currency than price" });
    else if (compareAt.amount <= price.amount)
      context.addIssue({ code: "custom", message: "compareAt is not higher than price" });
  });

/** A badge on a card or a buy box: the three kinds the copy names, or a merchant's own label. */
export const ProductBadge = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sale") }),
  z.object({ kind: z.literal("new") }),
  z.object({ kind: z.literal("bestseller") }),
  z.object({ kind: z.literal("custom"), label: z.string().min(1) }),
]);

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "a colour as #rrggbb");

/** A colour as Swatch draws it: a fill or a picture of the fabric, and its name. */
export const ColorSwatch = z.object({
  id: Id,
  label: z.string().min(1),
  hex: hex.optional(),
  image: Image.optional(),
  available: z.boolean(),
});

/** What every ProductCard variant can show (D46). The card is one link, to `href`. */
export const ProductCard = z.object({
  id: Id,
  handle: z.string().min(1),
  title: z.string().min(1),
  href: Href,
  images: z.array(Image).describe("The first is the card's; the second the hover image"),
  price: PriceSummary,
  badges: z.array(ProductBadge),
  rating: RatingOverview.optional(),
  swatches: z.array(ColorSwatch),
  variantCount: z.int().positive(),
  variantId: Id.optional().describe(
    "The only variant's id, when variantCount is 1: quick add sends it, and without it the card asks to choose",
  ),
  stock: Stock,
});

/** One value of an option, as VariantSelector draws it (a Swatch for colours, a SizePill). */
export const ProductOptionValue = z.object({
  id: Id,
  label: z.string().min(1),
  hex: hex.optional(),
  image: Image.optional(),
});

export const ProductOption = z.object({
  id: Id,
  title: z.string().min(1),
  kind: z.enum(["color", "size", "other"]).describe("How VariantSelector draws its values"),
  values: z.array(ProductOptionValue).min(1),
});

/** One variant: a value of each option, its price and its stock (SPEC §8.4). */
export const ProductVariant = z.object({
  id: Id,
  title: z.string().min(1),
  sku: z.string().min(1).optional(),
  options: z.record(z.string(), z.string()).describe("Option id to value id, one per option"),
  price: Money,
  compareAt: Money.optional(),
  available: z.boolean().describe("Can be added to the cart (in stock, or sold on backorder)"),
  stock: Stock,
});

/** A gallery image, shown for the option values it names (none: for every variant). */
export const ProductMedia = Image.extend({
  optionValueIds: z.array(Id).optional(),
});

/**
 * What a product's options and its variants must satisfy together (SPEC §8.4): a value id is listed
 * once in the product, and each variant names one existing value of each option. ProductDetail and
 * VariantChoice both check it; zod 4 cannot `.pick` a refined object, so the check is a function.
 */
function checkChoice(
  choice: { options: ProductOption[]; variants: ProductVariant[] },
  context: z.RefinementCtx,
) {
  const values = new Map(
    choice.options.map((option) => [option.id, new Set(option.values.map((value) => value.id))]),
  );
  // A value id is the product's, not only its option's: a picture names values without their
  // option (`optionValueIds`), as Medusa's `optval_` ids are unique in the store.
  const valueIds = choice.options.flatMap((option) => option.values.map((value) => value.id));
  for (const id of new Set(valueIds.filter((id, index) => valueIds.indexOf(id) !== index)))
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: `value ${id} is listed twice`,
    });
  for (const [index, variant] of choice.variants.entries()) {
    const keys = Object.keys(variant.options);
    if (keys.length !== values.size || keys.some((key) => !values.has(key)))
      context.addIssue({
        code: "custom",
        path: ["variants", index, "options"],
        message: `variant ${variant.id} does not name one value of each option`,
      });
    for (const [option, value] of Object.entries(variant.options))
      if (values.get(option)?.has(value) === false)
        context.addIssue({
          code: "custom",
          path: ["variants", index, "options", option],
          message: `option ${option} has no value ${value}`,
        });
  }
}

const choiceShape = {
  options: z.array(ProductOption),
  variants: z.array(ProductVariant).min(1),
};

/**
 * What VariantSelector takes: a product's options and variants, checked as a product page checks
 * them (each variant names one existing value of each option, each value id is listed once).
 */
export const VariantChoice = z.object(choiceShape).superRefine(checkChoice);

/** A product page's data (BuyBox, ProductGallery, VariantSelector). */
export const ProductDetail = z
  .object({
    id: Id,
    handle: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    href: Href,
    breadcrumbs: z.array(Link),
    media: z.array(ProductMedia).min(1),
    ...choiceShape,
    price: PriceSummary,
    badges: z.array(ProductBadge),
    rating: RatingSummary.optional(),
  })
  .superRefine((product, context) => {
    checkChoice(product, context);
    const valueIds = product.options.flatMap((option) => option.values.map((value) => value.id));
    for (const [index, media] of product.media.entries())
      for (const id of media.optionValueIds ?? [])
        if (!valueIds.includes(id))
          context.addIssue({
            code: "custom",
            path: ["media", index, "optionValueIds"],
            message: `no option has a value ${id}`,
          });
  });

export type Stock = z.infer<typeof Stock>;
export type PriceSummary = z.infer<typeof PriceSummary>;
export type ProductBadge = z.infer<typeof ProductBadge>;
export type ColorSwatch = z.infer<typeof ColorSwatch>;
export type ProductCard = z.infer<typeof ProductCard>;
export type ProductOptionValue = z.infer<typeof ProductOptionValue>;
export type ProductOption = z.infer<typeof ProductOption>;
export type ProductVariant = z.infer<typeof ProductVariant>;
export type ProductMedia = z.infer<typeof ProductMedia>;
export type VariantChoice = z.infer<typeof VariantChoice>;
export type ProductDetail = z.infer<typeof ProductDetail>;
