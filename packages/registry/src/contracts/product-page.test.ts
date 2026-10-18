import { describe, expect, it } from "vitest";
import {
  BuyBox,
  MobileStickyATC,
  ProductGallery,
  ProductInfo,
  ReviewsSection,
  SizeGuide,
} from "./product-page";

// The product page organisms' own rules (T38): a choice of an option or a value the product does not
// have, a quantity over its limit, a page holding more reviews than the product has, and a size table
// whose rows do not match its sizes. `@shopblok/fixtures`' test parses the real data.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });
const image = { src: "/media/hoodie.jpg", alt: "A hoodie", width: 600, height: 800 };

const product = {
  id: "prod_hoodie",
  handle: "hoodie",
  title: "Hoodie",
  description: "A hoodie.",
  href: "/products/hoodie",
  breadcrumbs: [{ label: "Home", href: "/" }],
  media: [image, { ...image, optionValueIds: ["colour-black"] }],
  options: [
    {
      id: "colour",
      title: "Colour",
      kind: "color",
      values: [
        { id: "colour-black", label: "Black", hex: "#111111" },
        { id: "colour-sky", label: "Sky", hex: "#a8c8e8" },
      ],
    },
    {
      id: "size",
      title: "Size",
      kind: "size",
      values: [
        { id: "size-s", label: "S" },
        { id: "size-m", label: "M" },
      ],
    },
  ],
  variants: [
    {
      id: "var_black_s",
      title: "Black / S",
      options: { colour: "colour-black", size: "size-s" },
      price: eur(64),
      available: true,
      stock: { status: "in-stock" },
    },
  ],
  price: { price: eur(64), varies: false },
  badges: [],
};

const review = (id: string) => ({
  id,
  author: "Eleni K.",
  rating: 5,
  body: "Warm and soft.",
  createdAt: "2026-09-12T14:20:00.000Z",
  verified: true,
});

const summary = {
  average: 4.5,
  count: 2,
  distribution: [
    { stars: 5, count: 1 },
    { stars: 4, count: 1 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ],
};

describe("ProductGallery", () => {
  const gallery = { title: "Hoodie", media: product.media, selectedValueIds: ["colour-black"] };

  it("takes the pictures and the values chosen, or none", () => {
    expect(issues(ProductGallery, gallery)).toEqual([]);
    expect(issues(ProductGallery, { ...gallery, selectedValueIds: [] })).toEqual([]);
  });

  it("refuses no picture and a value chosen twice", () => {
    expect(issues(ProductGallery, { ...gallery, media: [] })).not.toEqual([]);
    expect(
      issues(ProductGallery, { ...gallery, selectedValueIds: ["colour-black", "colour-black"] }),
    ).toContain("a chosen value is listed twice");
  });
});

describe("BuyBox", () => {
  const box = { product, selection: {}, quantity: 1, maxQuantity: 10, notes: ["Free returns"] };

  it("takes nothing chosen, a part of the choice, and all of it", () => {
    expect(issues(BuyBox, box)).toEqual([]);
    expect(issues(BuyBox, { ...box, selection: { colour: "colour-sky" } })).toEqual([]);
    expect(
      issues(BuyBox, { ...box, selection: { colour: "colour-black", size: "size-s" } }),
    ).toEqual([]);
  });

  it("refuses an option or a value the product does not have", () => {
    expect(issues(BuyBox, { ...box, selection: { fit: "fit-loose" } })).toContain(
      "the product has no option fit",
    );
    expect(issues(BuyBox, { ...box, selection: { colour: "size-s" } })).toContain(
      "option colour has no value size-s",
    );
  });

  it("refuses a quantity over the most a line takes, and none", () => {
    expect(issues(BuyBox, { ...box, quantity: 11 })).toContain(
      "the quantity is over the most a line takes",
    );
    expect(issues(BuyBox, { ...box, quantity: 0 })).not.toEqual([]);
  });

  it("takes three notes at most", () => {
    expect(issues(BuyBox, { ...box, notes: ["a", "b", "c", "d"] })).not.toEqual([]);
  });
});

describe("MobileStickyATC", () => {
  it("takes the three states", () => {
    for (const status of ["ready", "incomplete", "sold-out"])
      expect(
        issues(MobileStickyATC, {
          title: "Hoodie",
          image,
          price: product.price,
          choice: ["Black", "S"],
          status,
        }),
      ).toEqual([]);
  });
});

describe("ProductInfo", () => {
  const description = {
    id: "description",
    title: "Description",
    blocks: [{ kind: "text", paragraphs: ["A hoodie."] }],
  };
  const details = {
    id: "details",
    title: "Details",
    blocks: [
      { kind: "facts", rows: [{ label: "Material", value: "Cotton" }] },
      { kind: "list", items: ["Machine wash at 30 °C"] },
      { kind: "link", link: { label: "Care guide", href: "/care" } },
    ],
  };

  it("takes sections of paragraphs, lists, facts and links", () => {
    expect(issues(ProductInfo, { sections: [description, details] })).toEqual([]);
  });

  it("refuses no section, a section twice, and an empty one", () => {
    expect(issues(ProductInfo, { sections: [] })).not.toEqual([]);
    expect(issues(ProductInfo, { sections: [description, description] })).toContain(
      "a section is listed twice",
    );
    expect(issues(ProductInfo, { sections: [{ ...description, blocks: [] }] })).not.toEqual([]);
  });
});

describe("ReviewsSection", () => {
  const section = {
    summary,
    reviews: [review("rev_1"), review("rev_2")],
    page: { page: 1, pageCount: 1 },
    writeHref: "/products/hoodie/review",
  };

  it("takes a page of reviews, and none", () => {
    expect(issues(ReviewsSection, section)).toEqual([]);
    const none = {
      ...summary,
      average: 0,
      count: 0,
      distribution: summary.distribution.map((row) => ({ ...row, count: 0 })),
    };
    expect(issues(ReviewsSection, { ...section, summary: none, reviews: [] })).toEqual([]);
  });

  it("refuses a review twice, and more reviews than the product has", () => {
    expect(
      issues(ReviewsSection, { ...section, reviews: [review("rev_1"), review("rev_1")] }),
    ).toContain("a review is listed twice");
    expect(
      issues(ReviewsSection, { ...section, reviews: [review("a"), review("b"), review("c")] }),
    ).toContain("the page holds more reviews than the product has");
  });
});

describe("SizeGuide", () => {
  const guide = {
    title: "Hoodies: measurements",
    sizes: ["S", "M"],
    rows: [
      {
        id: "chest",
        label: "Chest",
        cm: [
          { from: 88, to: 92 },
          { from: 96, to: 100 },
        ],
      },
      { id: "length", label: "Length", cm: [68, 70] },
    ],
    unit: "cm",
    note: "Measure around the fullest part of your chest.",
  };

  it("takes ranges and single values, in centimetres or inches first", () => {
    expect(issues(SizeGuide, guide)).toEqual([]);
    expect(issues(SizeGuide, { ...guide, unit: "in" })).toEqual([]);
  });

  it("refuses a size twice, a row twice, a row without one value per size, and a range backwards", () => {
    expect(issues(SizeGuide, { ...guide, sizes: ["S", "S"] })).toContain("a size is listed twice");
    const [chest, length] = guide.rows;
    expect(issues(SizeGuide, { ...guide, rows: [chest, chest] })).toContain(
      "a measurement is listed twice",
    );
    expect(issues(SizeGuide, { ...guide, rows: [chest, { ...length, cm: [68] }] })).toContain(
      "a measurement has not one value per size",
    );
    expect(
      issues(SizeGuide, { ...guide, rows: [{ ...length, cm: [{ from: 70, to: 68 }, 70] }] }),
    ).toContain("a range ends before it starts");
  });
});
