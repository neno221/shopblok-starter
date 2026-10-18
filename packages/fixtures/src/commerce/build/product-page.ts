import type {
  BuyBox,
  MobileStickyATC,
  PriceSummary,
  ProductDetail,
  RatingSummary,
  Review,
  VariantSelection,
} from "@shopblok/registry/contracts";
import type { Context } from "../context";
import { hoodie, hoodieSizeChart } from "../data/catalog";
import type { CommerceFixture } from "../types";

// The product page organisms' samples (T38), made from the Heritage Hoodie's page (`product`): its
// gallery with nothing chosen, with a colour chosen and with one picture; its buy box with nothing
// chosen, a colour, a variant in stock, the one with three left and a sold-out one; the sticky bar
// in its three states; its information; its reviews and none; and its size guide.

/** Reviews a page shows: the six the fixtures have. 128 of them make 22 pages. */
const reviewsPerPage = 6;

export function buildProductPage(
  ctx: Context,
  product: ProductDetail,
  reviews: Review[],
  ratingSummary: RatingSummary,
): CommerceFixture["productPage"] {
  const { copy } = ctx;
  const words = copy.productPage;

  /** The variant a full choice names, which the fixtures always have. */
  const variantOf = (selection: VariantSelection) => {
    const variant = product.variants.find((each) =>
      Object.entries(each.options).every(([option, value]) => selection[option] === value),
    );
    if (variant === undefined) throw new Error(`no variant for ${JSON.stringify(selection)}`);
    return variant;
  };
  /** The labels of the values chosen, in the options' order. */
  const labelsOf = (selection: VariantSelection) =>
    product.options.flatMap((option) => {
      const label = option.values.find((value) => value.id === selection[option.id])?.label;
      return label === undefined ? [] : [label];
    });
  /** The first picture of a colour, or the product's first. */
  const imageOf = (selection: VariantSelection) =>
    product.media.find((media) =>
      media.optionValueIds?.some((id) => Object.values(selection).includes(id)),
    ) ?? product.media[0];

  const box = (selection: VariantSelection, maxQuantity = 10): BuyBox => ({
    product,
    selection,
    quantity: 1,
    maxQuantity,
    notes: [...words.notes],
  });
  const ready = { colour: "colour-black", size: "size-m" };
  const low = {
    colour: `colour-${hoodie.low.colour}`,
    size: `size-${hoodie.low.size.toLowerCase()}`,
  };
  const soldOut = { colour: "colour-black", size: "size-xl" };

  const sticky = (
    selection: VariantSelection,
    status: MobileStickyATC["status"],
  ): MobileStickyATC => {
    const complete = Object.keys(selection).length === product.options.length;
    const variant = complete ? variantOf(selection) : undefined;
    const price: PriceSummary =
      variant === undefined
        ? product.price
        : {
            price: variant.price,
            ...(variant.compareAt !== undefined && { compareAt: variant.compareAt }),
            varies: false,
          };
    const image = imageOf(selection);
    return {
      title: product.title,
      ...(image !== undefined && {
        image: { src: image.src, alt: image.alt, width: image.width, height: image.height },
      }),
      price,
      choice: labelsOf(selection),
      status,
    };
  };

  const none: RatingSummary = {
    average: 0,
    count: 0,
    distribution: ratingSummary.distribution.map((row) => ({ ...row, count: 0 })),
  };
  const writeHref = ctx.href(`/products/${product.handle}/reviews/new`);
  const { sizeGuide } = words;

  return {
    gallery: {
      all: { title: product.title, media: product.media, selectedValueIds: [] },
      chosen: {
        title: product.title,
        media: product.media,
        selectedValueIds: [`colour-${hoodie.low.colour}`],
      },
      single: { title: product.title, media: product.media.slice(0, 1), selectedValueIds: [] },
    },
    buyBox: {
      empty: box({}),
      partial: box({ colour: "colour-oatmeal" }),
      ready: box(ready),
      // The most a line takes is what is left.
      low: box(low, hoodie.low.quantity),
      soldOut: box(soldOut),
    },
    sticky: {
      ready: sticky(ready, "ready"),
      incomplete: sticky({ colour: "colour-oatmeal" }, "incomplete"),
      soldOut: sticky(soldOut, "sold-out"),
    },
    info: {
      sections: [
        {
          id: "description",
          title: words.sections.description,
          blocks: [
            { kind: "text", paragraphs: [ctx.ds.ordinary.productDescription, copy.hoodieDetails] },
          ],
        },
        {
          id: "details",
          title: words.sections.details,
          blocks: [
            {
              kind: "facts",
              rows: [words.facts.material, words.facts.fit, words.facts.origin].map(
                ([label, value]) => ({ label, value }),
              ),
            },
            { kind: "list", items: [...words.care] },
          ],
        },
        {
          id: "delivery",
          title: words.sections.delivery,
          blocks: [{ kind: "text", paragraphs: [...words.delivery] }],
        },
        {
          id: "returns",
          title: words.sections.returns,
          blocks: [
            { kind: "text", paragraphs: [words.returns] },
            { kind: "link", link: { label: words.returnsLink, href: ctx.href("/returns") } },
          ],
        },
      ],
    },
    reviews: {
      first: {
        summary: ratingSummary,
        reviews,
        page: { page: 1, pageCount: Math.ceil(ratingSummary.count / reviewsPerPage) },
        writeHref,
      },
      none: { summary: none, reviews: [], page: { page: 1, pageCount: 1 }, writeHref },
    },
    sizeGuide: {
      title: sizeGuide.title,
      sizes: [...hoodie.sizes],
      rows: [
        { id: "chest", label: sizeGuide.chest, cm: hoodieSizeChart.chest },
        { id: "waist", label: sizeGuide.waist, cm: hoodieSizeChart.waist },
        { id: "length", label: sizeGuide.length, cm: hoodieSizeChart.length },
        { id: "sleeve", label: sizeGuide.sleeve, cm: hoodieSizeChart.sleeve },
      ],
      // The US measures in inches; the other markets in centimetres.
      unit: ctx.market.country === "us" ? "in" : "cm",
      note: sizeGuide.note,
    },
  };
}
