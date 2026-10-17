import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as contracts from "./index";
import {
  Cart,
  Category,
  Countdown,
  MarketChoice,
  PageState,
  SortState,
  Href,
  Image,
  Money,
  Order,
  PriceSummary,
  ProductCard,
  ProductDetail,
  RatingSummary,
  SavedPaymentMethod,
  ShippingOption,
  VariantChoice,
} from "./index";

// The contracts' own rules (D41). The fixtures' test (`@shopblok/fixtures`) parses real data with
// them; here each rule a schema adds beyond its fields is shown to reject what it is there for.

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });
const image = { src: "/media/hoodie.jpg", alt: "A hoodie", width: 600, height: 800 };

const card = {
  id: "prod_1",
  handle: "heritage-hoodie",
  title: "Heritage Hoodie",
  href: "/products/heritage-hoodie",
  images: [image],
  price: { price: eur(49), compareAt: eur(59), varies: false },
  badges: [{ kind: "sale" }],
  rating: { average: 4.6, count: 128 },
  swatches: [{ id: "oat", label: "Oat", hex: "#d9cdb8", available: true }],
  variantCount: 6,
  stock: { status: "in-stock" },
};

const line = {
  id: "line_1",
  productId: "prod_1",
  variantId: "var_1",
  title: "Heritage Hoodie",
  href: "/products/heritage-hoodie",
  options: [{ option: "Size", value: "M" }],
  quantity: 2,
  unitPrice: eur(59),
  total: eur(118),
  stock: { status: "in-stock" },
};

const cart = {
  id: "cart_1",
  currencyCode: "EUR",
  lines: [line],
  itemCount: 2,
  subtotal: eur(118),
  discountTotal: eur(0),
  total: eur(118),
  promoCodes: [],
};

const address = {
  firstName: "Eleni",
  lastName: "Georgiou",
  address1: "Leoforos Makariou 12",
  city: "Nicosia",
  postalCode: "1065",
  countryCode: "cy",
};

const order = {
  id: "order_1",
  displayId: 1042,
  email: "eleni@example.com",
  placedAt: "2026-09-20T10:00:00Z",
  status: "completed",
  currencyCode: "EUR",
  lines: [{ ...line, stock: undefined }],
  subtotal: eur(118),
  discountTotal: eur(0),
  shippingTotal: eur(5),
  taxTotal: eur(19.64),
  total: eur(123),
  shippingAddress: address,
  shippingMethod: { name: "Standard", price: eur(5) },
  payment: { brand: "visa", last4: "4242" },
  events: [
    { kind: "placed", at: "2026-09-20T10:00:00Z" },
    { kind: "delivered", at: "2026-09-23T15:00:00Z" },
  ],
};

const detail = {
  id: "prod_1",
  handle: "heritage-hoodie",
  title: "Heritage Hoodie",
  description: "Brushed organic cotton.",
  href: "/products/heritage-hoodie",
  breadcrumbs: [{ label: "Hoodies", href: "/categories/hoodies" }],
  media: [image],
  options: [
    { id: "colour", title: "Colour", kind: "color", values: [{ id: "oat", label: "Oat" }] },
    { id: "size", title: "Size", kind: "size", values: [{ id: "m", label: "M" }] },
  ],
  variants: [
    {
      id: "var_1",
      title: "Oat / M",
      options: { colour: "oat", size: "m" },
      price: eur(59),
      available: true,
      stock: { status: "in-stock" },
    },
  ],
  price: { price: eur(59), varies: false },
  badges: [],
};

const issues = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("the contracts (D41)", () => {
  it("accept a valid value of each kind", () => {
    expect(issues(ProductCard, card)).toEqual([]);
    expect(issues(Cart, cart)).toEqual([]);
    expect(issues(Order, order)).toEqual([]);
    expect(issues(ProductDetail, detail)).toEqual([]);
  });

  it("can each be drawn as the Props table's JSON Schema", () => {
    const schemas = Object.entries(contracts as Record<string, unknown>).filter(
      (entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType,
    );
    expect(schemas.length).toBeGreaterThan(40);
    // The Props table's options (PR 51 review): the input, with nothing unrepresentable thrown.
    for (const [name, schema] of schemas)
      expect(
        () => z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }),
        name,
      ).not.toThrow();
  });

  it("take money in major units as a number, never as a string", () => {
    expect(issues(Money, { amount: "29.99", currencyCode: "EUR" })).not.toEqual([]);
    expect(issues(Money, { amount: 29.99, currencyCode: "eur" })).not.toEqual([]);
    expect(
      issues(ProductCard, { ...card, price: { ...card.price, price: { amount: "49" } } }),
    ).not.toEqual([]);
  });

  it("want every required field", () => {
    const { title: _title, ...untitled } = card;
    expect(issues(ProductCard, untitled)).not.toEqual([]);
    const { lastName: _lastName, ...nameless } = address;
    expect(issues(Order, { ...order, shippingAddress: nameless })).not.toEqual([]);
  });

  it("refuse links and images that leave the site's schemes", () => {
    for (const href of ["//evil.example", "javascript:alert(1)", "products/x", ""])
      expect(issues(Href, href), href).not.toEqual([]);
    expect(issues(Href, "https://example.com/x")).toEqual([]);
    expect(issues(Image, { ...image, src: "javascript:alert(1)" })).not.toEqual([]);
  });

  it("want a sale's compare-at price higher than the price, in the same currency", () => {
    expect(issues(PriceSummary, { price: eur(59), compareAt: eur(49), varies: false })).toEqual([
      "compareAt is not higher than price",
    ]);
    expect(
      issues(PriceSummary, {
        price: eur(49),
        compareAt: { amount: 64, currencyCode: "USD" },
        varies: false,
      }),
    ).toEqual(["compareAt is in another currency than price"]);
  });

  it("keep a cart's and an order's amounts in their currency, and the count in step", () => {
    expect(issues(Cart, { ...cart, total: { amount: 118, currencyCode: "USD" } })).toEqual([
      "USD in a EUR total",
    ]);
    expect(issues(Cart, { ...cart, itemCount: 3 })).toEqual(["the lines hold 2 items, not 3"]);
    expect(
      issues(Cart, {
        ...cart,
        lines: [{ ...line, compareAtUnitPrice: { amount: 80, currencyCode: "USD" } }],
      }),
    ).toEqual(["USD in a EUR total"]);
    expect(
      issues(Cart, {
        ...cart,
        promoCodes: [{ code: "AUTUMN", discount: { amount: 10, currencyCode: "CHF" } }],
      }),
    ).toEqual(["CHF in a EUR total"]);
    expect(
      issues(Order, {
        ...order,
        shippingMethod: { name: "Standard", price: { amount: 5, currencyCode: "CHF" } },
      }),
    ).toEqual(["CHF in a EUR total"]);
  });

  it("take an order paid with no card (the manual provider), but not a payment with nothing", () => {
    expect(issues(Order, { ...order, payment: { name: "Pay on delivery" } })).toEqual([]);
    expect(issues(Order, { ...order, payment: {} })).toEqual(["a payment needs a name or a brand"]);
  });

  it("want an order's history oldest first, from `placed`", () => {
    expect(issues(Order, { ...order, events: [...order.events].reverse() })).toEqual([
      "the first event is not `placed`",
      "the events are not oldest first",
    ]);
  });

  it("want each variant to name one existing value of each option", () => {
    const [variant] = detail.variants;
    expect(
      issues(ProductDetail, { ...detail, variants: [{ ...variant, options: { colour: "oat" } }] }),
    ).toEqual(["variant var_1 does not name one value of each option"]);
    expect(
      issues(ProductDetail, {
        ...detail,
        variants: [{ ...variant, options: { colour: "navy", size: "m" } }],
      }),
    ).toEqual(["option colour has no value navy"]);
  });

  it("want a picture's values to be the product's, each listed once", () => {
    expect(
      issues(ProductDetail, { ...detail, media: [{ ...image, optionValueIds: ["oat"] }] }),
    ).toEqual([]);
    expect(
      issues(ProductDetail, { ...detail, media: [{ ...image, optionValueIds: ["navy"] }] }),
    ).toEqual(["no option has a value navy"]);
    const [colour, size] = detail.options;
    expect(
      issues(ProductDetail, {
        ...detail,
        options: [colour, { ...size, values: [{ id: "oat", label: "M" }] }],
        variants: [],
      }),
    ).toContain("value oat is listed twice");
  });

  it("take a product's options and variants alone, as VariantSelector does, and check them the same way", () => {
    const { options, variants } = detail;
    const [variant] = variants;
    expect(issues(VariantChoice, { options, variants })).toEqual([]);
    expect(issues(VariantChoice, { options: [], variants: [] })).not.toEqual([]);
    // The same two rules as ProductDetail's: one existing value of each option, each id listed once.
    expect(
      issues(VariantChoice, { options, variants: [{ ...variant, options: { colour: "oat" } }] }),
    ).toEqual(["variant var_1 does not name one value of each option"]);
    expect(
      issues(VariantChoice, {
        options,
        variants: [{ ...variant, options: { colour: "navy", size: "m" } }],
      }),
    ).toEqual(["option colour has no value navy"]);
    const [colour, size] = options;
    expect(
      issues(VariantChoice, {
        options: [colour, { ...size, values: [{ id: "oat", label: "M" }] }],
        variants,
      }),
    ).toContain("value oat is listed twice");
    // A variant that names an option the product lacks is refused, too.
    expect(
      issues(VariantChoice, {
        options,
        variants: [{ ...variant, options: { colour: "oat", size: "m", fit: "slim" } }],
      }),
    ).toEqual(["variant var_1 does not name one value of each option"]);
  });

  it("give VariantChoice and ProductDetail the same verdict on options and variants", () => {
    const [variant] = detail.variants;
    const broken = [
      { ...detail, variants: [{ ...variant, options: { colour: "oat" } }] },
      { ...detail, variants: [{ ...variant, options: { colour: "navy", size: "m" } }] },
    ];
    for (const product of broken) {
      const { options, variants } = product;
      expect(issues(VariantChoice, { options, variants })).toEqual(issues(ProductDetail, product));
    }
  });

  it("take a pickup point's address without a person's name", () => {
    const pickup = {
      locationName: "Shopblok Store",
      address: { address1: "Torstraße 61", city: "Berlin", postalCode: "10119", countryCode: "de" },
    };
    const option = { id: "so_1", name: "Pickup", price: eur(0), pickup, available: true };
    expect(issues(ShippingOption, option)).toEqual([]);
  });

  it("want a rating's rows 5 to 1 stars, adding up to its count", () => {
    const rows = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: stars === 5 ? 3 : 1 }));
    expect(issues(RatingSummary, { average: 4.2, count: 7, distribution: rows })).toEqual([]);
    expect(issues(RatingSummary, { average: 4.2, count: 8, distribution: rows })).toEqual([
      "the rows add up to 7, not 8",
    ]);
    expect(
      issues(RatingSummary, { average: 4.2, count: 7, distribution: [...rows].reverse() }),
    ).toEqual(["the rows are 5, 4, 3, 2, 1 stars, in that order"]);
  });

  it("refuse a saved card with any field it does not list, a card number above all", () => {
    const saved = {
      id: "pm_1",
      brand: "visa",
      last4: "4242",
      expiryMonth: 8,
      expiryYear: 2028,
      isDefault: true,
    };
    expect(issues(SavedPaymentMethod, saved)).toEqual([]);
    expect(issues(SavedPaymentMethod, { ...saved, number: "4242424242424242" })).not.toEqual([]);
    expect(issues(SavedPaymentMethod, { ...saved, last4: "42" })).not.toEqual([]);
  });

  it("nest categories to any depth", () => {
    const leaf = {
      id: "c3",
      title: "Hoodies",
      handle: "hoodies",
      href: "/categories/a/b/hoodies",
      children: [],
    };
    const tree = {
      id: "c1",
      title: "Women",
      handle: "women",
      href: "/categories/women",
      children: [
        {
          id: "c2",
          title: "Clothing",
          handle: "clothing",
          href: "/categories/a/b",
          children: [leaf],
        },
      ],
    };
    expect(issues(Category, tree)).toEqual([]);
    expect(issues(Category, { ...tree, children: [{ ...leaf, href: "nope" }] })).not.toEqual([]);
  });

  it("keep a listing's page and sort inside what exists (T33)", () => {
    expect(issues(PageState, { page: 3, pageCount: 3 })).toEqual([]);
    expect(issues(PageState, { page: 4, pageCount: 3 })).toEqual(["page is after the last page"]);
    expect(issues(PageState, { page: 0, pageCount: 3 })).not.toEqual([]);
    const sort = {
      action: "/us/categories/hoodies",
      name: "sort",
      options: [
        { value: "newest", label: "Newest" },
        { value: "price-asc", label: "Price: low to high" },
      ],
      selected: "newest",
      params: [{ name: "colour", value: "black" }],
    };
    expect(issues(SortState, sort)).toEqual([]);
    expect(issues(SortState, { ...sort, selected: "oldest" })).toEqual([
      "the selected sort is not one of the options",
    ]);
  });

  it("mark exactly one language of the market switcher as current (T33)", () => {
    const market = (country: string, current: boolean) => ({
      country: country.toLowerCase(),
      flagCode: country,
      currencyCode: "EUR",
      languages: [{ language: "en", htmlLang: `en-${country}`, href: "/", current }],
    });
    expect(issues(MarketChoice, { markets: [market("CY", true), market("DE", false)] })).toEqual(
      [],
    );
    const message = "exactly one language of one market is the current one";
    expect(issues(MarketChoice, { markets: [market("CY", false), market("DE", false)] })).toEqual([
      message,
    ]);
    expect(issues(MarketChoice, { markets: [market("CY", true), market("DE", true)] })).toEqual([
      message,
    ]);
  });

  it("start a countdown before it ends (T33, D50)", () => {
    const now = "2026-10-01T09:00:00.000Z";
    expect(issues(Countdown, { endsAt: "2026-10-03T21:00:00.000Z", now })).toEqual([]);
    expect(issues(Countdown, { endsAt: "2026-09-30T21:00:00.000Z", now })).toEqual([
      "the countdown has already ended",
    ]);
  });
});
