import {
  Address,
  Cart,
  Category,
  FacetGroup,
  ProductCard,
  ProductDetail,
} from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { wireCart, wireCategories, wireHoodie, wireMug } from "../../test-support/medusa-wire";
import { toCartDto } from "../medusa/cart";
import { toCategoryTree } from "../medusa/categories";
import { toAddressDto } from "../medusa/customer";
import { toProductDto } from "../medusa/products";
import type { SearchResult } from "../medusa/search";
import { toAddress, toAddressInput } from "./address";
import { toCart } from "./cart";
import { toCategories } from "./category";
import { PLACEHOLDER_IMAGE, type Hrefs } from "./common";
import { toFacetGroups } from "./facets";
import { optionKind, toProductCard, toProductDetail } from "./product";

// D41: every view model a mapper builds from a Medusa-shaped DTO parses with the registry's schema,
// and parsing keeps it whole (`parse` drops unknown keys, so a mapper that leaked a field of the
// SDK's answer would differ from its parse).

const hrefs: Required<Hrefs> = {
  product: (handle) => `/products/${handle}`,
  category: (handle) => `/categories/${handle}`,
  collection: (handle) => `/collections/${handle}`,
};

function expectContract<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  expect(parsed.error?.issues ?? []).toEqual([]);
  expect(parsed.data).toEqual(value);
}

const hoodie = toProductDto(wireHoodie);
const mug = toProductDto(wireMug);

describe("toProductCard", () => {
  it("parses as ProductCard: the cheapest variant's sale price, swatches, stock", () => {
    const card = toProductCard(hoodie, hrefs);
    expectContract(ProductCard, card);
    expect(card).toMatchObject({
      href: "/products/demo-heritage-hoodie",
      price: {
        price: { amount: 49, currencyCode: "EUR" },
        compareAt: { amount: 59, currencyCode: "EUR" },
        varies: true,
      },
      badges: [{ kind: "sale" }],
      variantCount: 3,
      stock: { status: "in-stock" },
    });
    expect(card?.swatches.map((swatch) => [swatch.label, swatch.available])).toEqual([
      ["Μαύρο", true],
      ["Μπλε", false],
    ]);
    expect(card?.images).toHaveLength(2);
  });

  it("gives a one-variant product its variant id for quick add, and a placeholder picture", () => {
    const card = toProductCard(mug, hrefs);
    expectContract(ProductCard, card);
    expect(card?.variantId).toBe("variant_mug");
    expect(card?.images).toEqual([PLACEHOLDER_IMAGE]);
  });

  it("is null for a product with no price in the region", () => {
    const unpriced = toProductDto({
      ...wireMug,
      variants: [{ ...wireMug.variants![0]!, calculated_price: null }],
    });
    expect(toProductCard(unpriced, hrefs)).toBeNull();
  });
});

describe("toProductDetail", () => {
  it("parses as ProductDetail, with breadcrumbs through the first category", () => {
    const detail = toProductDetail(hoodie, { hrefs, home: { label: "Αρχική", href: "/" } });
    expectContract(ProductDetail, detail);
    expect(detail?.breadcrumbs).toEqual([
      { label: "Αρχική", href: "/" },
      { label: "Ρούχα", href: "/categories/apparel" },
    ]);
    expect(detail?.options.map((option) => option.kind)).toEqual(["color", "size"]);
    expect(detail?.variants.find((variant) => variant.id === "variant_navy_s")?.available).toBe(
      false,
    );
  });

  it("drops a variant that does not name every option, rather than failing the page", () => {
    const broken = toProductDto({
      ...wireHoodie,
      variants: [
        ...wireHoodie.variants!,
        {
          id: "variant_half",
          options: [{ id: "optval_s", option_id: "opt_size" }],
          calculated_price: { calculated_amount: 1, currency_code: "eur" },
        },
      ],
    });
    const detail = toProductDetail(broken, { hrefs, home: { label: "Home", href: "/" } });
    expectContract(ProductDetail, detail);
    expect(detail?.variants.map((variant) => variant.id)).not.toContain("variant_half");
  });
});

describe("optionKind", () => {
  it("reads colour and size in the four catalogs' languages, without case or accents", () => {
    expect(["Colour", "Color", "Farbe", "Couleur", "Χρώμα", "ΧΡΩΜΑ"].map(optionKind)).toEqual(
      Array(6).fill("color"),
    );
    expect(["Size", "Größe", "Taille", "Μέγεθος"].map(optionKind)).toEqual(Array(4).fill("size"));
    expect(optionKind("Material")).toBe("other");
  });
});

describe("toCart", () => {
  it("parses as Cart, with the lines' options and stock from their products", () => {
    const cart = toCart(toCartDto(wireCart), [hoodie, mug], hrefs);
    expectContract(Cart, cart);
    const [line] = cart.lines;
    expect(line).toMatchObject({
      options: [
        { option: "Χρώμα", value: "Μαύρο" },
        { option: "Μέγεθος", value: "M" },
      ],
      stock: { status: "low", quantity: 3 },
      maxQuantity: 3,
      compareAtUnitPrice: { amount: 59, currencyCode: "EUR" },
    });
    expect(cart.promoCodes).toEqual([
      { code: "WELCOME10", discount: { amount: 4.9, currencyCode: "EUR" } },
    ]);
  });

  it("keeps a line whose product is gone, with its title and price and no options", () => {
    const cart = toCart(toCartDto(wireCart), [], hrefs);
    expectContract(Cart, cart);
    expect(cart.lines.map((line) => line.options)).toEqual([[], []]);
  });
});

describe("toCategories", () => {
  it("parses as Category, each child's URL its whole path", () => {
    const categories = toCategories(toCategoryTree(wireCategories), hrefs);
    expectContract(z.array(Category), categories);
    expect(categories[0]?.children.map((child) => child.href)).toEqual([
      "/categories/apparel/knitwear",
      "/categories/apparel/tops",
    ]);
  });
});

describe("toFacetGroups", () => {
  const result: SearchResult = {
    ids: [],
    total: 4,
    page: 1,
    pageCount: 1,
    facets: {
      categoryIds: [
        { value: "pcat_apparel", count: 3 },
        { value: "pcat_unknown", count: 1 },
      ],
      collectionIds: [],
      tagIds: [],
      optionValueIds: [
        { value: "optval_black", count: 2 },
        { value: "optval_m", count: 1 },
      ],
      onSale: 1,
    },
    priceRange: { min: 12, max: 59 },
  };
  const labels = {
    categories: toCategoryTree(wireCategories),
    collections: [],
    optionValues: hoodie.options.flatMap((option) =>
      option.values.map((value) => ({
        optionId: option.id,
        optionTitle: option.title,
        valueId: value.id,
        value: value.value,
      })),
    ),
    copy: { category: "Κατηγορία", collection: "Συλλογή", price: "Τιμή", onSale: "Σε προσφορά" },
  };

  it("parses as FacetGroup: labelled ids, colours as swatches, the price and the sale toggle", () => {
    const groups = toFacetGroups(
      result,
      { optionValueIds: [["optval_black"]], price: { min: 20 } },
      "eur",
      labels,
    );
    expectContract(z.array(FacetGroup), groups);
    expect(groups.map((group) => [group.kind, group.id])).toEqual([
      ["checkbox", "category"],
      ["swatch", "opt_colour"],
      ["checkbox", "opt_size"],
      ["range", "price"],
      ["toggle", "sale"],
    ]);
    expect(groups[0]).toMatchObject({
      options: [{ value: "pcat_apparel", label: "Ρούχα", count: 3 }],
    });
    expect(groups[1]).toMatchObject({ options: [{ value: "optval_black", selected: true }] });
    expect(groups[3]).toMatchObject({
      currencyCode: "EUR",
      min: 12,
      max: 59,
      selected: { min: 20, max: 59 },
    });
  });

  it("keeps a selected value the search did not count, with 0, so it can be unticked (PR 73 review)", () => {
    const groups = toFacetGroups(
      result,
      { categoryIds: ["pcat_home"], optionValueIds: [["optval_navy"]] },
      "eur",
      labels,
    );
    expectContract(z.array(FacetGroup), groups);
    expect(groups.find((group) => group.id === "category")).toMatchObject({
      options: [
        { value: "pcat_apparel", count: 3, selected: false },
        { value: "pcat_home", count: 0, selected: true },
      ],
    });
    expect(groups.find((group) => group.id === "opt_colour")).toMatchObject({
      options: [
        { value: "optval_black", count: 2, selected: false },
        { value: "optval_navy", count: 0, selected: true },
      ],
    });
  });
});

describe("addresses", () => {
  const wire = {
    id: "caddr_1",
    first_name: "Άννα",
    last_name: "Γεωργίου",
    company: "",
    address_1: "Λεωφόρος Μακαρίου 12",
    address_2: null,
    city: "Λευκωσία",
    postal_code: "1065",
    country_code: "CY",
    phone: null,
    is_default_shipping: true,
  };

  it("parses as Address, empty optional fields left out, the country lower case", () => {
    const address = toAddress(toAddressDto(wire));
    expectContract(Address, address);
    expect(address).not.toHaveProperty("company");
    expect(address.countryCode).toBe("cy");
  });

  it("leaves the city out where the country has none (Singapore, D65)", () => {
    const address = toAddress(
      toAddressDto({ ...wire, city: null, country_code: "SG", postal_code: "079903" }),
    );
    expectContract(Address, address);
    expect(address).not.toHaveProperty("city");
    const { id: _id, ...input } = address;
    expect(toAddressInput(input)).not.toHaveProperty("city");
  });

  it("goes back to the Store API's names", () => {
    const { id: _id, ...address } = toAddress(toAddressDto(wire));
    expect(toAddressInput(address)).toEqual({
      first_name: "Άννα",
      last_name: "Γεωργίου",
      address_1: "Λεωφόρος Μακαρίου 12",
      city: "Λευκωσία",
      postal_code: "1065",
      country_code: "cy",
    });
  });
});
