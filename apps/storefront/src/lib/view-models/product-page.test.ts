import { pageFixtures } from "@shopblok/fixtures";
import { ProductDetailPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import {
  defaultSelection,
  RELATED_PRODUCTS,
  selectionForVariant,
  toProductDetailPage,
} from "./product-page";

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
