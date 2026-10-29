import { pageFixtures } from "@shopblok/fixtures";
import { ProductDetailPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE } from "./common";
import {
  defaultSelection,
  RELATED_PRODUCTS,
  selectionForVariant,
  toProductDetailPage,
} from "./product-page";
import { MAX_GALLERY_MEDIA, withShopPictures } from "./product-pictures";

const page = pageFixtures.en.productDetail;
const detail = page.buyBox.product;
const cards = page.related?.products ?? [];
const text = {
  headings: {
    related: "You may also like",
    description: "Description",
    delivery: "Delivery",
  },
  notes: ["Ships in 2 to 4 days"],
  delivery: ["Standard delivery takes 2 to 4 business days."],
};

describe("the product page's data (T49, D61)", () => {
  it("parses as the template's contract, with nothing chosen and the sticky bar asking", () => {
    const content = toProductDetailPage(detail, cards, text);
    expect(ProductDetailPage.parse(content)).toEqual(content);
    expect(content.buyBox.selection).toEqual({});
    expect(content.sticky.status).toBe("incomplete");
    expect(content.breadcrumbs).toEqual({
      trail: detail.breadcrumbs,
      current: detail.title,
    });
  });

  it("chooses the only variant of a product that has one", () => {
    const [only] = detail.variants;
    const single = { ...detail, variants: only === undefined ? [] : [only] };
    expect(defaultSelection(single)).toEqual(only?.options);
    expect(toProductDetailPage(single, [], text).sticky.status).toBe(
      only?.available ? "ready" : "sold-out",
    );
  });

  it("reads ?variant= only for a variant the product has", () => {
    const [first] = detail.variants;
    expect(selectionForVariant(detail, first?.id ?? null)).toEqual(first?.options);
    expect(selectionForVariant(detail, "variant_other")).toBeNull();
    expect(selectionForVariant(detail, null)).toBeNull();
  });

  it("splits the description into paragraphs, and leaves the section out when there is none", () => {
    const content = toProductDetailPage(
      { ...detail, description: "One.\n\n Two\nlines. " },
      [],
      text,
    );
    expect(content.info.sections.map((section) => section.id)).toEqual(["description", "delivery"]);
    expect(content.info.sections[0]?.blocks).toEqual([
      { kind: "text", paragraphs: ["One.", "Two lines."] },
    ]);
    const bare = toProductDetailPage({ ...detail, description: "  " }, [], text);
    expect(bare.info.sections.map((section) => section.id)).toEqual(["delivery"]);
  });

  it("shows up to eight related products, never the product itself, and none without any", () => {
    const self = { ...(cards[0] as (typeof cards)[number]), id: detail.id };
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...(cards[0] as (typeof cards)[number]),
      id: `prod_${index}`,
    }));
    const content = toProductDetailPage(detail, [self, ...many], text);
    expect(content.related?.products).toHaveLength(RELATED_PRODUCTS);
    expect(content.related?.products.some((card) => card.id === detail.id)).toBe(false);
    expect(toProductDetailPage(detail, [self], text).related).toBeUndefined();
  });

  it("shows the reviews' empty state until M8", () => {
    const { reviews } = toProductDetailPage(detail, [], text);
    expect(reviews.summary.count).toBe(0);
    expect(reviews.reviews).toEqual([]);
  });
});

describe("the shop's content on the product page (T69, D83)", () => {
  const picture = (n: number) => ({
    src: `/api/media/file/extra-${n}.webp`,
    alt: `Extra ${n}`,
    width: 800,
    height: 1000,
  });

  it("puts the shop's pictures after Medusa's, within the gallery's 24", () => {
    const media = withShopPictures(detail, [picture(1), picture(2)]).media;
    expect(media.slice(0, detail.media.length)).toEqual(detail.media);
    expect(media.slice(detail.media.length).map((each) => each.src)).toEqual([
      picture(1).src,
      picture(2).src,
    ]);
    const many = Array.from({ length: 30 }, (_, n) => picture(n));
    expect(withShopPictures(detail, many).media).toHaveLength(MAX_GALLERY_MEDIA);
  });

  it("drops Medusa's placeholder once the shop has a picture, and keeps it otherwise", () => {
    const bare = { ...detail, media: [{ ...PLACEHOLDER_IMAGE }] };
    expect(withShopPictures(bare, [picture(1)]).media).toEqual([picture(1)]);
    expect(withShopPictures(bare, []).media).toEqual(bare.media);
  });

  it("a rich description replaces Medusa's text with the section's rich block", () => {
    const content = toProductDetailPage(detail, [], { ...text, richDescription: true });
    expect(ProductDetailPage.parse(content)).toEqual(content);
    expect(content.info.sections[0]).toEqual({
      id: "description",
      title: "Description",
      blocks: [{ kind: "rich" }],
    });
    // Even for a product Medusa gave no description.
    const bare = toProductDetailPage({ ...detail, description: "" }, [], {
      ...text,
      richDescription: true,
    });
    expect(bare.info.sections.map((section) => section.id)).toEqual(["description", "delivery"]);
  });

  it("the delivery section is paragraphs, the shop's rich text, or not there", () => {
    const rich = toProductDetailPage(detail, [], { ...text, delivery: "rich" });
    expect(rich.info.sections.at(-1)).toEqual({
      id: "delivery",
      title: "Delivery",
      blocks: [{ kind: "rich" }],
    });
    const none = toProductDetailPage(detail, [], { ...text, delivery: null });
    expect(none.info.sections.map((section) => section.id)).toEqual(["description"]);
    const neither = toProductDetailPage({ ...detail, description: "" }, [], {
      ...text,
      delivery: [],
    });
    expect(neither.info.sections).toEqual([]);
  });
});
