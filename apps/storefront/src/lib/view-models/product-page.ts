import type {
  ProductCard,
  ProductDetail,
  ProductDetailPage,
  ProductInfoBlock,
  ProductInfoSection,
  RatingSummary,
  VariantSelection,
} from "@shopblok/registry/contracts";
import { stickyFor } from "@shopblok/ui/organisms/buy-box-choice";

// The product page's template data (D61, T49) from the product's view model: the default choice the
// server renders (the island then reads `?variant=`), the information sections, the reviews' empty
// state (M8 brings reviews) and the related products.

/** The related products' carousel shows the same category's first eight (D61). */
export const RELATED_PRODUCTS = 8;

/** What the stepper allows: the cart's own limit for a line (`MAX_LINE_QUANTITY`). */
export const PDP_MAX_QUANTITY = 99;

/** Reviews come in M8; until then every product has none. */
const NO_RATINGS: RatingSummary = {
  average: 0,
  count: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
};

/**
 * The choice a page opens on: a product with one variant has it chosen; any other starts with
 * nothing chosen, so the shopper picks (SPEC §8.4: add to cart waits for every option).
 */
export function defaultSelection(product: Pick<ProductDetail, "variants">): VariantSelection {
  const [only, ...rest] = product.variants;
  return only !== undefined && rest.length === 0 ? { ...only.options } : {};
}

/**
 * The choice `?variant=` names, or `null` for no parameter or an id the product does not have
 * (the page then opens on the default, and the canonical is the base PDP either way).
 */
export function selectionForVariant(
  product: Pick<ProductDetail, "variants">,
  variantId: string | null,
): VariantSelection | null {
  if (variantId === null) return null;
  const variant = product.variants.find((each) => each.id === variantId);
  return variant === undefined ? null : { ...variant.options };
}

/** Medusa's description as paragraphs: one per block of text between blank lines. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part !== "");
}

/** The ids of the information's sections the shop's rich text may fill (`slots.richText`). */
export const INFO_SECTION = { description: "description", delivery: "delivery" } as const;

export type ProductPageText = {
  /** The catalog's `templates.productDetail` headings. */
  headings: { related: string; description: string; delivery: string };
  /** The shop's texts (`productPageShopText`): the buy box's notes and the delivery section. */
  notes: string[];
  /** Paragraphs, the shop's rich text (drawn from `slots.richText.delivery`), or no section. */
  delivery: readonly string[] | "rich" | null;
  /** The shop's rich description (T69) replaces Medusa's (drawn from `slots.richText.description`). */
  richDescription?: boolean;
};

const RICH: ProductInfoBlock[] = [{ kind: "rich" }];

export function toProductDetailPage(
  detail: ProductDetail,
  related: readonly ProductCard[],
  { headings, notes, delivery, richDescription = false }: ProductPageText,
): ProductDetailPage {
  const selection = defaultSelection(detail);
  const description = paragraphs(detail.description);
  const descriptionBlocks: ProductInfoBlock[] = richDescription
    ? RICH
    : description.length === 0
      ? []
      : [{ kind: "text", paragraphs: description }];
  const deliveryBlocks: ProductInfoBlock[] =
    delivery === "rich"
      ? RICH
      : delivery === null || delivery.length === 0
        ? []
        : [{ kind: "text", paragraphs: [...delivery] }];
  const sections: ProductInfoSection[] = [
    { id: INFO_SECTION.description, title: headings.description, blocks: descriptionBlocks },
    { id: INFO_SECTION.delivery, title: headings.delivery, blocks: deliveryBlocks },
  ].filter((section) => section.blocks.length > 0);
  const cards = related.filter((card) => card.id !== detail.id).slice(0, RELATED_PRODUCTS);
  return {
    variant: "default",
    breadcrumbs: { trail: detail.breadcrumbs, current: detail.title },
    gallery: { title: detail.title, media: detail.media, selectedValueIds: [] },
    buyBox: {
      product: detail,
      selection,
      quantity: 1,
      maxQuantity: PDP_MAX_QUANTITY,
      notes: notes.slice(0, 3),
    },
    sticky: stickyFor(detail, selection),
    info: { sections },
    reviews: {
      summary: NO_RATINGS,
      reviews: [],
      page: { page: 1, pageCount: 1 },
    },
    ...(cards.length === 0
      ? {}
      : {
          related: {
            title: headings.related,
            products: cards,
            variant: "standard" as const,
          },
        }),
  };
}
