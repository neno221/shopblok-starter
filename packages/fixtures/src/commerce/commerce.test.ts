import { describe, expect, it } from "vitest";
import {
  ActiveFilters,
  Address,
  Announcement,
  Cart,
  CartLine,
  Category,
  FacetGroup,
  FooterColumn,
  MarketOption,
  MediaFigure,
  NavItem,
  Order,
  PaymentMethod,
  ProductCard,
  ProductDetail,
  RatingSummary,
  Review,
  SavedPaymentMethod,
  SearchResult,
  ShippingOption,
} from "@shopblok/registry/contracts";
import type { Category as CategoryNode } from "@shopblok/registry/contracts";
import { EmptyStateContent } from "@shopblok/registry/contracts";
import { AddressFormState } from "@shopblok/registry/contracts";
import { AccordionSection, ToastMessage } from "@shopblok/registry/contracts";
import { Countdown, DiscountCode, NewsletterSignup } from "@shopblok/registry/contracts";
import { FreeShipping, PromoCodeEntry } from "@shopblok/registry/contracts";
import {
  ShippingEstimate,
  StepperState,
  SummaryLine,
  VerificationRequest,
} from "@shopblok/registry/contracts";
import {
  designSystemFixtures,
  designSystemLocales,
  type DesignSystemLocale,
} from "../design-system";
import { markets } from "../markets";
import {
  commerceFixtures,
  fixtureImage,
  fixtureNow,
  imageRatios,
  type CommerceFixture,
} from "./index";

// Every fixture is parsed with the contract it stands for, so a value that no component could be
// given never reaches a story (T30 step 3). zod is not a dependency of this package (it comes in
// through the registry), so a failure is written out from the issues instead of `z.prettifyError`.

type Issue = { path: PropertyKey[]; message: string };
type Schema = {
  safeParse(value: unknown): { success: boolean; error?: { issues: Issue[] } };
};

function expectParses(schema: Schema, value: unknown, label: string): void {
  const result = schema.safeParse(value);
  const issues = result.error?.issues ?? [];
  const message = `${label}: ${issues
    .map((issue) => `${issue.path.map(String).join(".") || "(the value)"}: ${issue.message}`)
    .join("; ")}`;
  expect(result.success, message).toBe(true);
}

function expectAllParse(schema: Schema, values: unknown[], label: string): void {
  expect(values.length, `${label} is empty`).toBeGreaterThan(0);
  values.forEach((value, index) => expectParses(schema, value, `${label}[${index}]`));
}

/** `items[index]`, which `noUncheckedIndexedAccess` makes possibly undefined. */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`There is no item ${index}`);
  return item;
}

/** Amounts are rounded to cents, so sums are compared within half a cent. */
function expectNear(actual: number, expected: number, label: string): void {
  expect(Math.abs(actual - expected), `${label}: ${actual} is not ${expected}`).toBeLessThan(0.005);
}

type Node = { path: string; key: string; value: unknown; parent: object };

/** Every key of `value`, at any depth, with its path (`products[3].href`) and its parent object. */
function collect(value: unknown, path = "", skip: readonly string[] = []): Node[] {
  if (typeof value !== "object" || value === null) return [];
  const nodes: Node[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = Array.isArray(value)
      ? `${path}[${key}]`
      : path === ""
        ? key
        : `${path}.${key}`;
    if (skip.includes(childPath)) continue;
    nodes.push(
      { path: childPath, key, value: child, parent: value },
      ...collect(child, childPath, skip),
    );
  }
  return nodes;
}

const prefixes: Record<DesignSystemLocale, string> = { en: "/us", el: "", de: "/de", fr: "/ch/fr" };

// The VAT inside the price (CY 19 %, DE 19 %, CH 8.1 %): the US has none.
const vat: Record<string, number | undefined> = { cy: 0.19, de: 0.19, ch: 0.081 };

describe("the commerce fixtures", () => {
  it("has one for each design-system locale, made for that locale's market", () => {
    expect(Object.keys(commerceFixtures).sort()).toEqual([...designSystemLocales].sort());
    for (const locale of designSystemLocales) {
      const fixture = commerceFixtures[locale];
      expect(fixture.locale).toBe(locale);
      expect(fixture.market).toEqual(designSystemFixtures[locale].market);
    }
  });

  it("starts every URL with /us, nothing, /de and /ch/fr for en, el, de and fr (SPEC §8.5)", () => {
    for (const locale of designSystemLocales)
      expect(commerceFixtures[locale].prefix, locale).toBe(prefixes[locale]);
    expect(commerceFixtures.en.market.key).toBe("en-us");
    expect(commerceFixtures.el.market.key).toBe("el-cy");
    expect(commerceFixtures.de.market.key).toBe("de-de");
    expect(commerceFixtures.fr.market.key).toBe("fr-ch");
  });

  it("shares ids and handles between the locales", () => {
    const base = commerceFixtures.en;
    const ids = (fixture: CommerceFixture) => ({
      products: fixture.products.map((product) => [product.id, product.handle]),
      product: [fixture.product.id, fixture.product.handle],
      variants: fixture.product.variants.map((variant) => [variant.id, variant.sku]),
      categories: JSON.stringify(fixture.categories, (key, value: unknown) =>
        key === "title" || key === "href" ? undefined : value,
      ),
      cart: fixture.cart.lines.map((line) => [line.id, line.productId, line.variantId]),
      addresses: fixture.addresses.map((address) => address.id).sort(),
      orders: fixture.orders.map((order) => [order.id, order.displayId]),
      reviews: fixture.reviews.map((review) => review.id),
      shipping: fixture.shippingOptions.map((option) => option.id),
      payment: fixture.paymentMethods.map((method) => method.id),
      saved: fixture.savedPaymentMethods.map((card) => card.id),
      long: [fixture.long.product.id, fixture.long.product.handle],
    });
    for (const locale of designSystemLocales) {
      expect(ids(commerceFixtures[locale]), locale).toEqual(ids(base));
    }
  });

  it("has a title of 60 or more characters in English", () => {
    const longest = Math.max(
      ...commerceFixtures.en.products.map((product) => product.title.length),
    );
    expect(longest).toBeGreaterThanOrEqual(60);
  });

  it("writes the German long strings longest of the four (German runs about 30 % longer)", () => {
    const mains = (fixture: CommerceFixture) => ({
      product: fixture.long.product.title.length,
      cartLine: fixture.long.cartLine.title.length,
      review: fixture.long.review.body.length,
      shippingOption: fixture.long.shippingOption.name.length,
      footer: fixture.long.footerColumn.title.length,
    });
    const german = mains(commerceFixtures.de);
    for (const locale of ["en", "el", "fr"] as const)
      for (const [kind, length] of Object.entries(mains(commerceFixtures[locale])))
        expect(german[kind as keyof typeof german], `${kind} in ${locale}`).toBeGreaterThanOrEqual(
          length,
        );
  });

  describe("the generated images", () => {
    it("come in four aspect ratios with their intrinsic size, as data URIs", () => {
      expect(imageRatios).toEqual({
        "3:4": { width: 600, height: 800 },
        "1:1": { width: 800, height: 800 },
        "4:3": { width: 800, height: 600 },
        "16:9": { width: 1600, height: 900 },
      });
      for (const [ratio, size] of Object.entries(imageRatios)) {
        const image = fixtureImage({ seed: 3, ratio: ratio as keyof typeof imageRatios, alt: "x" });
        expect(image).toMatchObject({ ...size, alt: "x" });
        expect(image.src.startsWith("data:image/svg+xml,")).toBe(true);
      }
    });

    it("differ for each of 80 seeds and repeat for the same seed", () => {
      const sources = Array.from(
        { length: 80 },
        (_, seed) => fixtureImage({ seed, ratio: "3:4", alt: "" }).src,
      );
      expect(new Set(sources).size).toBe(80);
      expect(fixtureImage({ seed: 5, ratio: "1:1", alt: "a" })).toEqual(
        fixtureImage({ seed: 5, ratio: "1:1", alt: "a" }),
      );
    });

    it("are used in all four ratios by the fixtures", () => {
      const sizes = new Set(
        collect(commerceFixtures.en)
          .filter((node) => node.key === "src")
          .map((node) => {
            const image = node.parent as { width: number; height: number };
            return `${image.width}x${image.height}`;
          }),
      );
      expect(sizes).toEqual(new Set(["600x800", "800x800", "800x600", "1600x900"]));
    });
  });
});

describe.each(designSystemLocales)("the %s fixtures", (locale) => {
  const fixture = commerceFixtures[locale];
  const { market, prefix } = fixture;
  const ds = designSystemFixtures[locale];

  describe("parse with their contract", () => {
    it("products are ProductCards", () => {
      expectAllParse(ProductCard, fixture.products, `${locale}.products`);
    });

    it("product is a ProductDetail", () => {
      expectParses(ProductDetail, fixture.product, `${locale}.product`);
    });

    it("categories are Categories", () => {
      expectAllParse(Category, fixture.categories, `${locale}.categories`);
    });

    it("cart is a Cart", () => {
      expectParses(Cart, fixture.cart, `${locale}.cart`);
    });

    it("addresses are Addresses", () => {
      expectAllParse(Address, fixture.addresses, `${locale}.addresses`);
    });

    it("addressSamples are Addresses, and the mistaken form an AddressFormState (T34)", () => {
      const { gb, fr, jp, generic, mistaken } = fixture.addressSamples;
      expectAllParse(Address, [gb, fr, jp, generic], `${locale}.addressSamples`);
      const countries = fixture.markets.map((market) => market.country);
      expectParses(
        AddressFormState,
        { countries, values: mistaken },
        `${locale}.addressSamples.mistaken`,
      );
      // Each is where its name says, and none is in the address book (a page with both has no id twice).
      expect([gb, fr, jp, generic].map((address) => address.countryCode)).toEqual([
        "gb",
        "fr",
        "jp",
        "ic",
      ]);
      const ids = [...fixture.addresses, gb, fr, jp, generic].map((address) => address.id);
      expect(new Set(ids).size).toBe(ids.length);
      // Seeded markets sell to GB and FR, Japan is not one of them, and `ic` has no format.
      expect(countries).toEqual(expect.arrayContaining(["gb", "fr"]));
      expect(countries).not.toContain("jp");
      expect(countries).not.toContain("ic");
      // The mistaken form has what a failed submit shows: a ZIP code of four digits and no state.
      expect(mistaken.countryCode).toBe("us");
      expect(mistaken.postalCode).toMatch(/^\d{4}$/);
      expect(mistaken.province).toBeUndefined();
    });

    it("orders are Orders", () => {
      expectAllParse(Order, fixture.orders, `${locale}.orders`);
    });

    it("reviews are Reviews and the summary a RatingSummary", () => {
      expectAllParse(Review, fixture.reviews, `${locale}.reviews`);
      expectParses(RatingSummary, fixture.ratingSummary, `${locale}.ratingSummary`);
    });

    it("navigation and footer are NavItems and FooterColumns", () => {
      expectAllParse(NavItem, fixture.navigation, `${locale}.navigation`);
      expectAllParse(FooterColumn, fixture.footer, `${locale}.footer`);
    });

    it("markets are MarketOptions", () => {
      expectAllParse(MarketOption, fixture.markets, `${locale}.markets`);
    });

    it("payment methods are PaymentMethods and SavedPaymentMethods", () => {
      expectAllParse(PaymentMethod, fixture.paymentMethods, `${locale}.paymentMethods`);
      expectAllParse(
        SavedPaymentMethod,
        fixture.savedPaymentMethods,
        `${locale}.savedPaymentMethods`,
      );
    });

    it("shippingOptions are ShippingOptions", () => {
      expectAllParse(ShippingOption, fixture.shippingOptions, `${locale}.shippingOptions`);
    });

    it("search is a SearchResult and facets are FacetGroups", () => {
      expectParses(SearchResult, fixture.search, `${locale}.search`);
      expectAllParse(FacetGroup, fixture.facets, `${locale}.facets`);
      expectParses(ActiveFilters, fixture.activeFilters, `${locale}.activeFilters`);
    });

    it("announcement is an Announcement and figure a MediaFigure", () => {
      expectParses(Announcement, fixture.announcement, `${locale}.announcement`);
      expectParses(MediaFigure, fixture.figure, `${locale}.figure`);
    });

    it("marketing is NewsletterSignups, DiscountCodes and Countdowns (T33)", () => {
      const { newsletter, discountCode, longDiscountCode, countdown } = fixture.marketing;
      expectAllParse(NewsletterSignup, Object.values(newsletter), `${locale}.marketing.newsletter`);
      expectAllParse(
        DiscountCode,
        [discountCode, longDiscountCode],
        `${locale}.marketing.discountCode`,
      );
      expectAllParse(Countdown, Object.values(countdown), `${locale}.marketing.countdown`);
      // The privacy page is under the market's prefix, like every link.
      for (const each of Object.values(newsletter))
        expect(each.privacyHref, `${locale}.marketing.newsletter`).toBe(
          `${fixture.prefix}/pages/privacy`,
        );
      // The chip shows the code the cart applied; the long one has nowhere to break.
      expect(discountCode.code).toBe(at(fixture.cart.promoCodes, 0).code);
      expect(longDiscountCode.code).toHaveLength(40);
      expect(longDiscountCode.code).toMatch(/^\S+$/);
      expect(newsletter.long.email.length).toBeGreaterThan(80);
      expect(newsletter.empty.email).toBe("");
      // Every countdown is rendered at the fixed now (D50) and none ends before it.
      for (const each of Object.values(countdown)) expect(each.now).toBe(fixtureNow);
    });

    it("cartSamples are CartLines, FreeShippings and PromoCodeEntries, each the state it names (T34)", () => {
      const { lines, freeShipping, promo } = fixture.cartSamples;
      expectAllParse(CartLine, Object.values(lines), `${locale}.cartSamples.lines`);
      expectAllParse(
        FreeShipping,
        Object.values(freeShipping),
        `${locale}.cartSamples.freeShipping`,
      );
      expectAllParse(PromoCodeEntry, Object.values(promo), `${locale}.cartSamples.promo`);

      // Each line is a state the cart's own three do not show, and its total adds up.
      expect(lines.outOfStock.stock.status).toBe("out");
      expect(lines.outOfStock.maxQuantity).toBeUndefined();
      expect(lines.atLimit.quantity).toBe(lines.atLimit.maxQuantity);
      expect(lines.atLimit.stock).toEqual({ status: "low", quantity: lines.atLimit.maxQuantity });
      expect(lines.noImage.image).toBeUndefined();
      expect(lines.noOptions.options).toEqual([]);
      expect(lines.noOptions.compareAtUnitPrice).toBeUndefined();
      for (const line of Object.values(lines))
        expectNear(line.total.amount, line.unitPrice.amount * line.quantity, `${line.id} total`);
      // They are not the cart's: a page that shows both has no id twice.
      const ids = [...fixture.cart.lines, ...Object.values(lines)].map((line) => line.id);
      expect(new Set(ids).size).toBe(ids.length);

      // The bar runs from nothing to the threshold, in the market's currency.
      const { threshold } = fixture.cart.freeShipping!;
      expect(freeShipping.empty.remaining).toEqual(threshold);
      expect(freeShipping.almost.remaining.amount).toBeGreaterThan(0);
      expect(freeShipping.almost.remaining.amount).toBeLessThan(1);
      expect(freeShipping.reached.remaining.amount).toBe(0);
      for (const each of Object.values(freeShipping))
        expect(each.threshold.currencyCode, `${locale}.cartSamples.freeShipping`).toBe(
          fixture.market.currency,
        );
      expect(freeShipping.large.threshold.amount).toBeGreaterThan(1_000_000);

      // The field: the cart's own code, a refused one kept in the field, and a code that is long.
      expect(promo.empty).toEqual({ applied: [], code: "" });
      expect(promo.applied.applied).toEqual(fixture.cart.promoCodes);
      expect(promo.typed.applied).toEqual([]);
      expect(promo.typed.code).not.toBe("");
      expect(promo.two.applied.map((each) => each.code)).toEqual([
        at(fixture.cart.promoCodes, 0).code,
        "FREESHIP",
      ]);
      expect(at(promo.two.applied, 1).discount).toBeUndefined();
      expect(at(promo.long.applied, 0).code).toBe(fixture.marketing.longDiscountCode.code);
      expect(promo.long.code).toBe(fixture.marketing.longDiscountCode.code);
    });

    it("the FAQ's sections are AccordionSections and the toasts ToastMessages (T33)", () => {
      const { faq, toasts } = fixture.site;
      expectAllParse(AccordionSection, [...faq.items, faq.long], `${locale}.site.faq`);
      expectAllParse(
        ToastMessage,
        Object.values(toasts).map((sample) => sample.message),
        `${locale}.site.toasts`,
      );
    });

    it("emptyStates are EmptyStateContents: two with a way on, one with none (T33)", () => {
      const { filters, search, category } = fixture.emptyStates;
      expectAllParse(EmptyStateContent, [filters, search, category], `${locale}.emptyStates`);
      expect(filters.text, `${locale}.emptyStates.filters`).toBeTruthy();
      // The way out of filters that match nothing is the listing without them, under the prefix.
      expect(filters.action?.href).toBe(`${fixture.prefix}/categories/women/clothing/hoodies`);
      expect(search.action?.href).toBe(fixture.prefix === "" ? "/" : fixture.prefix);
      expect(category.action, `${locale}.emptyStates.category`).toBeUndefined();
    });

    it("every long value parses with the contract of its ordinary counterpart", () => {
      const { long } = fixture;
      expectParses(ProductCard, long.product, `${locale}.long.product`);
      expectParses(CartLine, long.cartLine, `${locale}.long.cartLine`);
      expectParses(Address, long.address, `${locale}.long.address`);
      expectParses(NavItem, long.navItem, `${locale}.long.navItem`);
      expectParses(FooterColumn, long.footerColumn, `${locale}.long.footerColumn`);
      expectParses(Review, long.review, `${locale}.long.review`);
      expectParses(ShippingOption, long.shippingOption, `${locale}.long.shippingOption`);
    });
  });

  describe("the market", () => {
    it("takes its key, country, language and currency from the design system", () => {
      expect(market).toEqual(ds.market);
    });

    it("lists the six seeded countries in the map's order, with the locale's language current", () => {
      expect(fixture.markets.map((option) => option.country)).toEqual(
        markets.countries.map((country) => country.code),
      );
      expect(fixture.markets.map((option) => option.country)).toEqual([
        "cy",
        "us",
        "gb",
        "de",
        "fr",
        "ch",
      ]);
      expect(fixture.markets.map((option) => [option.country, option.currencyCode])).toEqual([
        ["cy", "EUR"],
        ["us", "USD"],
        ["gb", "GBP"],
        ["de", "EUR"],
        ["fr", "EUR"],
        ["ch", "CHF"],
      ]);
      for (const option of fixture.markets)
        expect(option.flagCode).toBe(option.country.toUpperCase());
      expect(
        fixture.markets.flatMap((option) =>
          option.languages.map((language) => [
            option.country,
            language.language,
            language.htmlLang,
          ]),
        ),
      ).toEqual([
        ["cy", "el", "el-CY"],
        ["us", "en", "en-US"],
        ["gb", "en", "en-GB"],
        ["de", "de", "de-DE"],
        ["fr", "fr", "fr-FR"],
        ["ch", "de", "de-CH"],
        ["ch", "fr", "fr-CH"],
      ]);
      expect(
        fixture.markets.flatMap((option) => option.languages.map((language) => language.href)),
      ).toEqual(["/", "/us", "/gb", "/de", "/fr", "/ch", "/ch/fr"]);
      const current = fixture.markets.flatMap((option) =>
        option.languages
          .filter((language) => language.current)
          .map((language) => ({ country: option.country, language: language.language })),
      );
      expect(current).toEqual([{ country: market.country, language: market.language }]);
    });

    it("has every amount in the market's currency", () => {
      const holders = collect(fixture, "", ["markets"]).filter(
        (node) => node.key === "currencyCode",
      );
      // Prices, totals, the cart, the orders, the price range: plenty to check.
      expect(holders.length).toBeGreaterThan(50);
      for (const node of holders) expect(node.value, node.path).toBe(market.currency);
    });

    it("starts every link with the market's prefix (SPEC §8.5)", () => {
      const links = collect(fixture, "", ["markets"]).filter(
        (node) =>
          node.key === "href" && typeof node.value === "string" && !/^https?:\/\//.test(node.value),
      );
      expect(links.length).toBeGreaterThan(100);
      for (const node of links) {
        const href = String(node.value);
        // The market's root is the prefix itself (or "/" when there is none); the rest is under it.
        const under =
          prefix === "" ? href.startsWith("/") : href === prefix || href.startsWith(`${prefix}/`);
        expect(under, `${node.path}: ${href}`).toBe(true);
        if (locale === "el") expect(href.startsWith("/cy"), `${node.path}: ${href}`).toBe(false);
      }
    });

    it("dates everything before the fixed now", () => {
      // A countdown ends after it: its `endsAt` is the one date in the future.
      const dates = collect(fixture, "", ["marketing.countdown"]).filter(
        (node) => typeof node.value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(node.value),
      );
      expect(dates.length).toBeGreaterThan(10);
      for (const node of dates)
        expect(Date.parse(String(node.value)), `${node.path}: ${String(node.value)}`).toBeLessThan(
          Date.parse(fixtureNow),
        );
    });
  });

  describe("the catalog", () => {
    it("has twelve products, the Heritage Hoodie first", () => {
      expect(fixture.products).toHaveLength(12);
      expect(new Set(fixture.products.map((product) => product.id)).size).toBe(12);
      expect(new Set(fixture.products.map((product) => product.handle)).size).toBe(12);
      for (const product of fixture.products) {
        expect(product.handle, product.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(product.href, product.id).toBe(`${prefix}/products/${product.handle}`);
      }
      const first = at(fixture.products, 0);
      expect(first.handle).toBe("heritage-hoodie");
      expect(first.title).toBe(ds.ordinary.productName);
      expect(first.price.price.amount).toBe(ds.prices.regular);
      expect(first.price.compareAt).toBeUndefined();
    });

    it("uses the design system's colours for the Heritage Hoodie", () => {
      const swatches = at(fixture.products, 0).swatches;
      expect(swatches.map((swatch) => [swatch.label, swatch.hex])).toEqual(
        ds.colours.slice(0, 4).map((colour) => [colour.name, colour.hex]),
      );
      const colours = at(fixture.product.options, 0);
      expect(colours.values.map((value) => [value.label, value.hex])).toEqual(
        ds.colours.slice(0, 4).map((colour) => [colour.name, colour.hex]),
      );
    });

    it("prices the Heritage Hoodie at EUR 59, USD 64 and CHF 58", () => {
      const expected = { EUR: 59, USD: 64, CHF: 58 }[market.currency as "EUR" | "USD" | "CHF"];
      expect(at(fixture.products, 0).price.price).toEqual({
        amount: expected,
        currencyCode: market.currency,
      });
      expect(fixture.product.price.price).toEqual(at(fixture.products, 0).price.price);
      for (const variant of fixture.product.variants) expect(variant.price.amount).toBe(expected);
    });

    it("has a product with a long title", () => {
      const longest = Math.max(...fixture.products.map((product) => product.title.length));
      expect(longest).toBeGreaterThanOrEqual(60);
    });

    it("has exactly one on sale, with the badge", () => {
      const onSale = fixture.products.filter((product) => product.price.compareAt !== undefined);
      expect(onSale).toHaveLength(1);
      const [sale] = onSale;
      expect(sale?.badges).toContainEqual({ kind: "sale" });
      expect(sale!.price.compareAt!.amount).toBeGreaterThan(sale!.price.price.amount);
    });

    it("has one sold out, with no stock", () => {
      const soldOut = fixture.products.filter((product) => product.stock.status === "out");
      expect(soldOut).toHaveLength(1);
      expect(soldOut[0]?.stock).toEqual({ status: "out", quantity: 0 });
      expect(soldOut[0]?.swatches.every((swatch) => !swatch.available)).toBe(true);
    });

    it("has one with exactly ten swatches, one of them unavailable", () => {
      const tens = fixture.products.filter((product) => product.swatches.length === 10);
      expect(tens).toHaveLength(1);
      const swatches = tens[0]!.swatches;
      expect(swatches.filter((swatch) => !swatch.available)).toHaveLength(1);
      expect(new Set(swatches.map((swatch) => swatch.id)).size).toBe(10);
      for (const swatch of swatches) expect(swatch.hex, swatch.label).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("has one whose price varies, one custom badge, one new and one low on stock", () => {
      expect(fixture.products.filter((product) => product.price.varies)).toHaveLength(1);
      const custom = fixture.products.flatMap((product) =>
        product.badges.filter((badge) => badge.kind === "custom"),
      );
      expect(custom).toHaveLength(1);
      expect(fixture.products.some((product) => product.badges.some((b) => b.kind === "new"))).toBe(
        true,
      );
      expect(fixture.products.some((product) => product.stock.status === "low")).toBe(true);
      expect(
        fixture.products.some((product) => product.badges.some((b) => b.kind === "bestseller")),
      ).toBe(true);
    });

    it("gives each product one or two images, mostly 3:4, with a rating on most", () => {
      for (const product of fixture.products) {
        expect([1, 2], product.id).toContain(product.images.length);
        for (const image of product.images) expect(image.alt, product.id).not.toBe("");
      }
      expect(
        fixture.products.filter((product) => product.images.length === 2).length,
      ).toBeGreaterThan(5);
      const portrait = fixture.products.filter(
        (product) => at(product.images, 0).width === 600 && at(product.images, 0).height === 800,
      );
      expect(portrait.length).toBeGreaterThan(6);
      const rated = fixture.products.filter((product) => product.rating !== undefined);
      expect(rated.length).toBeGreaterThanOrEqual(9);
      expect(rated.length).toBeLessThan(12);
      for (const product of rated) {
        expect(product.rating!.average).toBeGreaterThanOrEqual(0);
        expect(product.rating!.average).toBeLessThanOrEqual(5);
      }
    });

    it("counts each card's variants as its colours times its sizes", () => {
      // The Heritage Hoodie comes in four colours and six sizes.
      expect(at(fixture.products, 0).variantCount).toBe(24);
      expect(at(fixture.products, 0).variantCount).toBe(fixture.product.variants.length);
      for (const product of fixture.products)
        expect(product.variantCount, product.id).toBeGreaterThanOrEqual(product.swatches.length);
    });

    it("has the Heritage Hoodie's page with a variant for every colour and size", () => {
      const { product } = fixture;
      expect(product.id).toBe(at(fixture.products, 0).id);
      expect(product.title).toBe(ds.ordinary.productName);
      expect(product.description.startsWith(ds.ordinary.productDescription)).toBe(true);
      expect(product.description.split(/[.!?。]\s/).length).toBeGreaterThanOrEqual(3);
      const [colour, size] = product.options;
      expect(colour).toMatchObject({ kind: "color" });
      expect(colour!.values).toHaveLength(4);
      expect(size).toMatchObject({ kind: "size" });
      expect(size!.values.map((value) => value.label)).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
      expect(product.variants).toHaveLength(24);
      const combinations = product.variants.map((variant) =>
        Object.values(variant.options).join("|"),
      );
      expect(new Set(combinations).size).toBe(24);
      expect(new Set(product.variants.map((variant) => variant.id)).size).toBe(24);
      expect(product.variants.some((variant) => !variant.available)).toBe(true);
      expect(product.variants.filter((variant) => variant.stock.status === "low")).toHaveLength(1);
      expect(
        product.variants.some(
          (variant) => variant.available && variant.stock.status === "in-stock",
        ),
      ).toBe(true);
      for (const variant of product.variants)
        if (!variant.available) expect(variant.stock.status, variant.id).toBe("out");
    });

    it("gives the Heritage Hoodie four images, some for a colour, and a breadcrumb trail", () => {
      const { product } = fixture;
      expect(product.media).toHaveLength(4);
      const colourIds = new Set(at(product.options, 0).values.map((value) => value.id));
      const named = product.media.filter((media) => media.optionValueIds !== undefined);
      expect(named.length).toBeGreaterThanOrEqual(1);
      expect(named.length).toBeLessThan(4);
      for (const media of named)
        for (const id of media.optionValueIds!) expect(colourIds.has(id), id).toBe(true);
      expect(product.breadcrumbs).toHaveLength(4);
      expect(at(product.breadcrumbs, 0).href).toBe(prefix === "" ? "/" : prefix);
      expect(at(product.breadcrumbs, 3).href).toBe(`${prefix}/categories/women/clothing/hoodies`);
    });

    it("is a tree three levels deep with at least two roots", () => {
      const depth = (category: CategoryNode): number =>
        1 + Math.max(0, ...category.children.map(depth));
      expect(fixture.categories.length).toBeGreaterThanOrEqual(2);
      for (const root of fixture.categories) expect(depth(root), root.handle).toBe(3);
      const visit = (category: CategoryNode, path: string[]): void => {
        const here = [...path, category.handle];
        expect(category.href).toBe(`${prefix}/categories/${here.join("/")}`);
        expect(category.handle).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        if (here.length === 3) expect(category.children).toEqual([]);
        category.children.forEach((child) => visit(child, here));
      };
      fixture.categories.forEach((root) => visit(root, []));
      const ids: string[] = [];
      const gather = (category: CategoryNode): void => {
        ids.push(category.id);
        category.children.forEach(gather);
      };
      fixture.categories.forEach(gather);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("the cart", () => {
    it("has three lines: one of two, one on sale and one low on stock", () => {
      const { cart } = fixture;
      expect(cart.lines).toHaveLength(3);
      expect(cart.lines.some((line) => line.quantity === 2)).toBe(true);
      const onSale = cart.lines.filter((line) => line.compareAtUnitPrice !== undefined);
      expect(onSale).toHaveLength(1);
      expect(onSale[0]!.compareAtUnitPrice!.amount).toBeGreaterThan(onSale[0]!.unitPrice.amount);
      const low = cart.lines.filter((line) => line.stock.status === "low");
      expect(low).toHaveLength(1);
      expect(low[0]!.maxQuantity).toBe(low[0]!.stock.quantity);
      expect(low[0]!.quantity).toBeLessThanOrEqual(low[0]!.maxQuantity!);
      for (const line of cart.lines) {
        expect(line.options, line.id).toHaveLength(2);
        expect(line.href.startsWith(`${prefix}/products/`), line.id).toBe(true);
      }
    });

    it("adds up: lines, subtotal, discount, total and the free-shipping rest", () => {
      const { cart } = fixture;
      for (const line of cart.lines)
        expectNear(line.total.amount, line.unitPrice.amount * line.quantity, `${line.id} total`);
      expect(cart.itemCount).toBe(cart.lines.reduce((sum, line) => sum + line.quantity, 0));
      expectNear(
        cart.subtotal.amount,
        cart.lines.reduce((sum, line) => sum + line.total.amount, 0),
        "subtotal",
      );
      expect(cart.promoCodes).toHaveLength(1);
      expect(cart.promoCodes[0]!.code).not.toBe("");
      expect(cart.promoCodes[0]!.discount).toEqual(cart.discountTotal);
      expect(cart.discountTotal.amount).toBeGreaterThan(0);
      // No shipping option is chosen yet.
      expect(cart.shippingTotal).toBeUndefined();
      expectNear(cart.total.amount, cart.subtotal.amount - cart.discountTotal.amount, "total");
      const { threshold, remaining } = cart.freeShipping!;
      expect(cart.subtotal.amount).toBeLessThan(threshold.amount);
      expectNear(remaining.amount, threshold.amount - cart.subtotal.amount, "remaining");
      const expectedThreshold = { EUR: 150, USD: 165, CHF: 150 }[
        market.currency as "EUR" | "USD" | "CHF"
      ];
      expect(threshold.amount).toBe(expectedThreshold);
      expect(fixture.announcement.message).toContain(String(threshold.amount));
    });

    it("shows the VAT inside the total in the EU and Switzerland, and none in the US", () => {
      const { cart } = fixture;
      const rate = vat[market.country];
      if (rate === undefined) expect(cart.taxTotal).toBeUndefined();
      else expectNear(cart.taxTotal!.amount, (cart.total.amount * rate) / (1 + rate), "tax");
    });
  });

  describe("the addresses", () => {
    it("are one in each of CY, US, DE and CH, the market's own first and default", () => {
      const { addresses } = fixture;
      expect(addresses.map((address) => address.countryCode).sort()).toEqual([
        "ch",
        "cy",
        "de",
        "us",
      ]);
      expect(at(addresses, 0).countryCode).toBe(market.country);
      expect(at(addresses, 0).isDefaultShipping).toBe(true);
      expect(at(addresses, 0).isDefaultBilling).toBe(true);
      for (const address of addresses.slice(1)) {
        expect(address.isDefaultShipping, address.id).toBe(false);
        expect(address.isDefaultBilling, address.id).toBe(false);
      }
      expect(new Set(addresses.map((address) => address.id)).size).toBe(4);
    });

    it("are in each country's format", () => {
      const byCountry = Object.fromEntries(
        fixture.addresses.map((address) => [address.countryCode, address]),
      );
      expect(byCountry.cy?.postalCode).toMatch(/^\d{4}$/);
      expect(byCountry.cy?.province).toBeUndefined();
      expect(byCountry.us?.postalCode).toMatch(/^\d{5}$/);
      expect(byCountry.us?.province).toMatch(/^[A-Z]{2}$/);
      expect(byCountry.de?.postalCode).toMatch(/^\d{5}$/);
      expect(byCountry.de?.province).toBeUndefined();
      expect(byCountry.ch?.postalCode).toMatch(/^\d{4}$/);
      expect(byCountry.ch?.province).toBeUndefined();
      // Fictional numbers: the US one is in the reserved 555-01xx range.
      expect(byCountry.us?.phone).toMatch(/555 01\d\d$/);
    });

    it("have one with a company and a second address line", () => {
      const withCompany = fixture.addresses.filter((address) => address.company !== undefined);
      expect(withCompany).toHaveLength(1);
      expect(withCompany[0]!.address2).toBeDefined();
      expect(fixture.addresses.filter((address) => address.address2 !== undefined)).toHaveLength(1);
    });
  });

  describe("the orders", () => {
    it("are two: one delivered with its whole history, one placed and paid", () => {
      const [delivered, recent] = fixture.orders;
      expect(fixture.orders).toHaveLength(2);
      expect(delivered!.events.map((event) => event.kind)).toEqual([
        "placed",
        "paid",
        "fulfilled",
        "shipped",
        "delivered",
      ]);
      const shipped = delivered!.events.find((event) => event.kind === "shipped")!;
      expect(shipped.carrier).toBeTruthy();
      expect(shipped.trackingNumber).toBeTruthy();
      expect(shipped.trackingUrl).toMatch(/^https:\/\//);
      expect(delivered!.status).toBe("completed");
      expect(recent!.events.map((event) => event.kind)).toEqual(["placed", "paid"]);
      expect(recent!.status).toBe("pending");
      for (const order of fixture.orders) {
        const times = order.events.map((event) => Date.parse(event.at));
        expect(times, order.id).toEqual([...times].sort((a, b) => a - b));
        expect(order.placedAt).toBe(at(order.events, 0).at);
      }
    });

    it("add up, in the market's currency, with the VAT inside for the EU and Switzerland", () => {
      const rate = vat[market.country];
      for (const order of fixture.orders) {
        expect(order.currencyCode).toBe(market.currency);
        for (const line of order.lines)
          expectNear(
            line.total.amount,
            line.unitPrice.amount * line.quantity,
            `${order.id} ${line.id}`,
          );
        expectNear(
          order.subtotal.amount,
          order.lines.reduce((sum, line) => sum + line.total.amount, 0),
          `${order.id} subtotal`,
        );
        expectNear(
          order.total.amount,
          order.subtotal.amount - order.discountTotal.amount + order.shippingTotal.amount,
          `${order.id} total`,
        );
        expect(order.shippingMethod.price).toEqual(order.shippingTotal);
        if (rate === undefined) expect(order.taxTotal.amount).toBe(0);
        else
          expectNear(
            order.taxTotal.amount,
            (order.total.amount * rate) / (1 + rate),
            `${order.id} tax`,
          );
      }
    });

    it("go to one of the addresses, are paid by card, and belong to a fictional customer", () => {
      expect(fixture.orders.map((order) => order.displayId)).toEqual([1042, 1057]);
      for (const order of fixture.orders) {
        expect(fixture.addresses).toContainEqual(order.shippingAddress);
        expect(order.email).toMatch(/@example\.com$/);
        expect(order.payment.last4).toMatch(/^\d{4}$/);
        expect(order.lines.length).toBeGreaterThan(0);
      }
    });
  });

  describe("the reviews", () => {
    it("are six, in the locale's language, with one untitled and ratings from 2 to 5", () => {
      const { reviews } = fixture;
      expect(reviews).toHaveLength(6);
      expect(reviews.filter((review) => review.title === undefined)).toHaveLength(1);
      for (const review of reviews) {
        expect(review.rating).toBeGreaterThanOrEqual(2);
        expect(review.rating).toBeLessThanOrEqual(5);
      }
      expect(Math.min(...reviews.map((review) => review.rating))).toBe(2);
      expect(reviews.some((review) => review.verified)).toBe(true);
      expect(reviews.some((review) => !review.verified)).toBe(true);
      expect(new Set(reviews.map((review) => review.body)).size).toBe(6);
      const lengths = reviews.map((review) => review.body.length);
      expect(Math.max(...lengths)).toBeGreaterThan(Math.min(...lengths) + 30);
    });

    it("sum up to 128 ratings and match the hoodie's card", () => {
      const { ratingSummary } = fixture;
      expect(ratingSummary.distribution.map((row) => row.stars)).toEqual([5, 4, 3, 2, 1]);
      expect(ratingSummary.distribution.reduce((sum, row) => sum + row.count, 0)).toBe(
        ratingSummary.count,
      );
      expect(ratingSummary.count).toBeGreaterThan(fixture.reviews.length);
      const weighted = ratingSummary.distribution.reduce(
        (sum, row) => sum + row.stars * row.count,
        0,
      );
      expect(Math.abs(weighted / ratingSummary.count - ratingSummary.average)).toBeLessThan(0.05);
      expect(fixture.product.rating).toEqual(ratingSummary);
      expect(at(fixture.products, 0).rating).toEqual({
        average: ratingSummary.average,
        count: ratingSummary.count,
      });
    });
  });

  describe("the navigation and footer", () => {
    it("have a link, two mega menus, a dropdown and a link", () => {
      expect(fixture.navigation.map((item) => item.kind)).toEqual([
        "link",
        "megaMenu",
        "megaMenu",
        "dropdown",
        "link",
      ]);
      for (const item of fixture.navigation) {
        if (item.kind !== "megaMenu") continue;
        expect(item.columns.length).toBeGreaterThanOrEqual(2);
        expect(item.columns.length).toBeLessThanOrEqual(3);
        expect(item.featured.length).toBeGreaterThanOrEqual(1);
        expect(item.featured.length).toBeLessThanOrEqual(2);
        for (const tile of item.featured)
          expect(["800x600", "1600x900"], tile.title).toContain(
            `${tile.image.width}x${tile.image.height}`,
          );
      }
    });

    it("has four footer columns of three to five links", () => {
      expect(fixture.footer).toHaveLength(4);
      for (const column of fixture.footer) {
        expect(column.links.length, column.title).toBeGreaterThanOrEqual(3);
        expect(column.links.length, column.title).toBeLessThanOrEqual(5);
      }
      const external = fixture.footer.flatMap((column) =>
        column.links.filter((link) => link.external === true),
      );
      expect(external).toHaveLength(1);
      expect(external[0]!.href).toMatch(/^https:\/\//);
    });
  });

  describe("payment and shipping", () => {
    it("offers a card, two wallets, Revolut Pay, PayPal and Klarna", () => {
      const methods = fixture.paymentMethods;
      expect(methods.map((method) => [method.kind, method.brands])).toEqual([
        ["card", ["visa", "mastercard", "americanexpress"]],
        ["wallet", ["applepay"]],
        ["wallet", ["googlepay"]],
        ["wallet", ["revolut"]],
        ["redirect", ["paypal"]],
        ["redirect", ["klarna"]],
      ]);
      expect(methods.slice(1).map((method) => method.name)).toEqual([
        "Apple Pay",
        "Google Pay",
        "Revolut Pay",
        "PayPal",
        "Klarna",
      ]);
      expect(at(methods, 0).name).not.toBe("");
      expect(new Set(methods.map((method) => method.id)).size).toBe(methods.length);
    });

    it("saves two or three cards, one default, none expired at the fixed now", () => {
      const cards = fixture.savedPaymentMethods;
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.length).toBeLessThanOrEqual(3);
      expect(cards.filter((card) => card.isDefault)).toHaveLength(1);
      const now = new Date(fixtureNow);
      for (const card of cards) {
        const expires = card.expiryYear * 12 + card.expiryMonth;
        expect(expires, card.id).toBeGreaterThanOrEqual(
          now.getUTCFullYear() * 12 + now.getUTCMonth() + 1,
        );
      }
    });

    it("lists standard, express, free, pickup and one that is not available", () => {
      const options = fixture.shippingOptions;
      expect(options).toHaveLength(5);
      const [standard, express, free, pickup] = options;
      expect(express!.price.amount).toBeGreaterThan(standard!.price.amount);
      expect(standard!.estimate).toEqual({ minDays: 3, maxDays: 5 });
      expect(express!.estimate).toEqual({ minDays: 1, maxDays: 2 });
      expect(free!.price.amount).toBe(0);
      expect(free!.estimate).toEqual({ minDays: 5, maxDays: 8 });
      expect(pickup!.pickup?.locationName).toBeTruthy();
      expect(pickup!.pickup?.address?.countryCode).toBe(market.country);
      expect(options.filter((option) => !option.available)).toHaveLength(1);
      expect(new Set(options.map((option) => option.name)).size).toBe(5);
    });

    it("has the payment samples: an expired card, one that expires this month, the longest holder, no holder and a long method (T34)", () => {
      const { expiredCard, expiringCard, longHolderCard, anonymousCard, longMethod } =
        fixture.paymentSamples;
      const cards = [expiredCard, expiringCard, longHolderCard, anonymousCard];
      expectAllParse(SavedPaymentMethod, cards, `${locale}.paymentSamples cards`);
      expectParses(PaymentMethod, longMethod, `${locale}.paymentSamples.longMethod`);
      const now = new Date(fixtureNow);
      const thisMonth = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
      const monthOf = (card: { expiryYear: number; expiryMonth: number }) =>
        card.expiryYear * 12 + card.expiryMonth;
      // A card works through its last day: the month before the fixed now is over, this one is not.
      expect(monthOf(expiredCard)).toBe(thisMonth - 1);
      expect(monthOf(expiringCard)).toBe(thisMonth);
      expect(monthOf(longHolderCard)).toBeGreaterThan(thisMonth);
      expect(anonymousCard.holderName).toBeUndefined();
      expect(longHolderCard.holderName).toBe(ds.long.personName);
      expect(longMethod.name).toBe(ds.long.optionLabel);
      expect(longMethod.brands.length).toBe(3);
      // The account's own cards stay good, and no sample reuses their ids.
      const ids = [...fixture.savedPaymentMethods, ...cards].map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(fixture.paymentMethods.map((method) => method.id)).not.toContain(longMethod.id);
    });
  });

  describe("search and filters", () => {
    it("finds 14 for the locale's word, showing the first four cards", () => {
      const { search } = fixture;
      expect(search.query).not.toBe("");
      expect(search.total).toBe(14);
      expect(search.products).toEqual(fixture.products.slice(0, 4));
      expect(search.categories).toHaveLength(2);
      expect(search.suggestions).toHaveLength(3);
      for (const category of search.categories)
        expect(category.href.startsWith(`${prefix}/categories/`), category.label).toBe(true);
    });

    it("has a group of each kind, some options chosen, and the price in the market's currency", () => {
      const groups = fixture.facets;
      expect(groups.map((group) => [group.id, group.kind])).toEqual([
        ["category", "checkbox"],
        ["colour", "swatch"],
        ["size", "checkbox"],
        ["price", "range"],
        ["in-stock", "toggle"],
        ["on-sale", "toggle"],
      ]);
      const colours = groups.find((group) => group.kind === "swatch")!;
      for (const option of colours.options)
        expect(option.hex, option.label).toMatch(/^#[0-9a-f]{6}$/);
      const checkboxes = groups.filter(
        (group) => group.kind === "checkbox" || group.kind === "swatch",
      );
      for (const group of checkboxes) {
        expect(
          group.options.some((option) => option.selected),
          group.id,
        ).toBe(true);
        expect(
          group.options.some((option) => !option.selected),
          group.id,
        ).toBe(true);
      }
      const price = groups.find((group) => group.kind === "range")!;
      expect(price.currencyCode).toBe(market.currency);
      expect(price.selected).toBeDefined();
      expect(price.selected!.min).toBeGreaterThanOrEqual(price.min);
      expect(price.selected!.max).toBeLessThanOrEqual(price.max);
    });
  });

  describe("the chips of the chosen filters (ActiveFilterChips, T33)", () => {
    const { facets, activeFilters } = fixture;
    const listing = `${prefix}/store`;
    /** The query parameters of a URL under the listing, as [name, value] pairs. */
    const paramsOf = (href: string) => {
      expect(href.startsWith(listing), href).toBe(true);
      return [...new URLSearchParams(href.slice(listing.length + 1))].map(
        ([name, value]) => `${name}=${value}`,
      );
    };

    it("has a chip for every chosen option, the chosen price range and each switch that is on", () => {
      const chosen = facets.flatMap((facet) => {
        if (facet.kind === "checkbox" || facet.kind === "swatch")
          return facet.options.filter((option) => option.selected).map(() => facet.id);
        if (facet.kind === "range") return facet.selected === undefined ? [] : [facet.id];
        return facet.selected ? [facet.id] : [];
      });
      expect(chosen.length).toBeGreaterThan(3);
      expect(activeFilters.filters.map((filter) => filter.id.split(":")[0])).toEqual(chosen);
    });

    it("names the group with the facet's label, and an on/off filter with none", () => {
      const labels = Object.fromEntries(facets.map((facet) => [facet.id, facet.label]));
      for (const filter of activeFilters.filters) {
        const facetId = filter.id.split(":")[0]!;
        const facet = facets.find((candidate) => candidate.id === facetId)!;
        if (facet.kind === "toggle") {
          expect(filter.group, filter.id).toBeUndefined();
          expect(filter.label, filter.id).toBe(facet.label);
        } else {
          expect(filter.group, filter.id).toBe(labels[facetId]);
        }
      }
      // A chosen option is named by its label: the colours that are chosen.
      const colours = facets.find((facet) => facet.kind === "swatch");
      if (colours?.kind !== "swatch") throw new Error("no swatch group");
      const named = colours.options.filter((option) => option.selected).map((o) => o.label);
      expect(named.length).toBeGreaterThan(1);
      expect(
        activeFilters.filters
          .filter((filter) => filter.id.startsWith(`${colours.id}:`))
          .map((filter) => filter.label),
      ).toEqual(named);
    });

    it("writes the chosen price range in the market's currency, with its two bounds", () => {
      const price = facets.find((facet) => facet.kind === "range")!;
      if (price.kind !== "range") throw new Error("not a range");
      const chip = activeFilters.filters.find((filter) => filter.id === price.id)!;
      const symbol = { en: "$", el: "€", de: "€", fr: "CHF" }[locale];
      expect(chip.label).toContain(String(price.selected!.min));
      expect(chip.label).toContain(String(price.selected!.max));
      expect(chip.label).toContain(symbol);
    });

    it("links each chip to the listing without that value and every other value kept, under the prefix", () => {
      // What the sidebar's form sends for each chosen value, from the facets themselves.
      const sent = facets.flatMap((facet): string[][] => {
        if (facet.kind === "checkbox" || facet.kind === "swatch")
          return facet.options
            .filter((option) => option.selected)
            .map((option) => [`${facet.id}=${option.value}`]);
        if (facet.kind === "range")
          return facet.selected === undefined
            ? []
            : [[`${facet.id}.min=${facet.selected.min}`, `${facet.id}.max=${facet.selected.max}`]];
        return facet.selected ? [[`${facet.id}=1`]] : [];
      });
      expect(sent).toHaveLength(activeFilters.filters.length);
      expect(sent.length).toBeGreaterThan(3);
      activeFilters.filters.forEach((filter, index) => {
        // The link keeps every other chip's parameters, in order, and not this chip's own.
        expect(paramsOf(filter.removeHref), filter.id).toEqual(
          sent.filter((_, other) => other !== index).flat(),
        );
      });
    });

    it("clears everything with the listing itself", () => {
      expect(activeFilters.clearHref).toBe(listing);
    });
  });

  describe("the figure and announcement", () => {
    it("has a 16:9 picture with a caption and a credit, and a free-shipping message with a link", () => {
      const { figure, announcement } = fixture;
      expect(`${figure.image.width}:${figure.image.height}`).toBe("1600:900");
      expect(figure.caption).toBeTruthy();
      expect(figure.credit).toBeTruthy();
      expect(figure.image.alt).not.toBe("");
      expect(announcement.link?.href.startsWith(prefix === "" ? "/" : prefix)).toBe(true);
    });
  });

  describe("the site samples (AccordionItem and Toast, T33)", () => {
    it("has five questions with the same ids in every locale, each answered in paragraphs", () => {
      const { items, long } = fixture.site.faq;
      expect(items.map((item) => item.value)).toEqual([
        "shipping",
        "returns",
        "sizing",
        "payment",
        "care",
      ]);
      expect(new Set([...items, long].map((item) => item.value)).size).toBe(items.length + 1);
      for (const item of [...items, long]) {
        expect(item.title.trim(), item.value).not.toBe("");
        expect(item.answer.length, item.value).toBeGreaterThanOrEqual(2);
        for (const paragraph of item.answer) expect(paragraph.trim(), item.value).not.toBe("");
      }
    });

    it("has a long question and long answers, longer than every ordinary one", () => {
      const { items, long } = fixture.site.faq;
      const answer = (item: { answer: string[] }) => item.answer.join(" ").length;
      expect(long.title.length).toBeGreaterThan(
        Math.max(...items.map((item) => item.title.length)),
      );
      expect(answer(long)).toBeGreaterThan(Math.max(...items.map(answer)));
    });

    it("has a toast of each kind: a success with an action, an error with a description, an info with a title alone, and a long one with all three", () => {
      const { success, error, info, long } = fixture.site.toasts;
      expect([success, error, info].map((sample) => sample.message.kind)).toEqual([
        "success",
        "error",
        "info",
      ]);
      expect(success.message.actionLabel).toBeTruthy();
      expect(success.message.description).toBeTruthy();
      expect(error.message.description).toBeTruthy();
      expect(error.message.actionLabel).toBeUndefined();
      expect(info.message.description).toBeUndefined();
      expect(info.message.actionLabel).toBeUndefined();
      expect(long.message.description).toBeTruthy();
      expect(long.message.actionLabel).toBeTruthy();
      for (const sample of [success, error, info, long])
        expect(sample.trigger.trim(), sample.message.title).not.toBe("");
      const length = (text: string | undefined) => (text ?? "").length;
      expect(length(long.message.title)).toBeGreaterThan(length(success.message.title));
      expect(length(long.message.description)).toBeGreaterThan(length(success.message.description));
      expect(length(long.message.actionLabel)).toBeGreaterThan(length(success.message.actionLabel));
    });

    it("writes the German long samples longest of the four", () => {
      const german = commerceFixtures.de.site;
      const answer = (item: { answer: string[] }) => item.answer.join(" ").length;
      expect(german.faq.long.title.length).toBeGreaterThanOrEqual(
        fixture.site.faq.long.title.length,
      );
      expect(answer(german.faq.long)).toBeGreaterThanOrEqual(answer(fixture.site.faq.long));
      expect(german.toasts.long.message.title.length).toBeGreaterThanOrEqual(
        fixture.site.toasts.long.message.title.length,
      );
      expect(german.toasts.long.message.actionLabel?.length ?? 0).toBeGreaterThanOrEqual(
        fixture.site.toasts.long.message.actionLabel?.length ?? 0,
      );
    });
  });

  describe("the checkout flow samples (OrderSummaryRow, Stepper, ShippingEstimator, VerificationNotice, T34)", () => {
    const { summary, steps, estimator, verification } = fixture.checkoutFlow;

    it("parse with their contracts", () => {
      expectAllParse(SummaryLine, Object.values(summary), `${locale}.checkoutFlow.summary`);
      expectAllParse(StepperState, Object.values(steps), `${locale}.checkoutFlow.steps`);
      expectAllParse(
        ShippingEstimate,
        Object.values(estimator),
        `${locale}.checkoutFlow.estimator`,
      );
      expectAllParse(
        VerificationRequest,
        Object.values(verification),
        `${locale}.checkoutFlow.verification`,
      );
    });

    it("has summary rows that are the cart's own totals, each the state it names", () => {
      const { cart } = fixture;
      expect(summary.subtotal).toEqual({ kind: "subtotal", amount: cart.subtotal });
      // The amount taken off (never negative), with the cart's code beside it.
      expect(summary.discount).toEqual({
        kind: "discount",
        amount: cart.discountTotal,
        detail: at(cart.promoCodes, 0).code,
      });
      expect(summary.total).toEqual({ kind: "total", amount: cart.total });
      // Shipping: not chosen yet, a delivery's price, and free.
      expect(summary.shippingPending).toEqual({ kind: "shipping" });
      expect(summary.shippingPaid.amount).toEqual(
        fixture.shippingOptions.find((option) => option.id === "so_standard")?.price,
      );
      expect(summary.shippingFree.amount?.amount).toBe(0);
      // Tax is a row where the price includes it, and "calculated later" where it does not.
      if (vat[market.country] === undefined) expect(summary.tax.amount).toBeUndefined();
      else expect(summary.tax.amount).toEqual(cart.taxTotal);
      // The long ones: a code with nowhere to break, and a total of seven digits.
      expect(summary.longDetail.detail).toBe(fixture.marketing.longDiscountCode.code);
      expect(summary.longDetail.detail).toHaveLength(40);
      expect(summary.large.amount?.amount).toBeGreaterThan(1_000_000);
    });

    it("has steps in the locale's words, with a link only on the steps before the current one", () => {
      const places = (state: StepperState) =>
        state.steps.map((step) => [step.id, step.href !== undefined]);
      expect(steps.contact.steps).toHaveLength(3);
      expect(steps.contact.current).toBe("contact");
      expect(places(steps.contact)).toEqual([
        ["contact", false],
        ["delivery", false],
        ["review", false],
      ]);
      expect(steps.delivery.current).toBe("delivery");
      expect(places(steps.delivery)).toEqual([
        ["contact", true],
        ["delivery", false],
        ["review", false],
      ]);
      expect(steps.review.current).toBe("review");
      expect(places(steps.review)).toEqual([
        ["contact", true],
        ["delivery", true],
        ["review", false],
      ]);
      expect(steps.five.steps.map((step) => step.id)).toEqual([
        "cart",
        "contact",
        "delivery",
        "payment",
        "review",
      ]);
      expect(steps.five.current).toBe("payment");
      expect(steps.five.steps.filter((step) => step.href !== undefined)).toHaveLength(3);
      expect(steps.long.steps).toHaveLength(4);
      // The longest labels are long enough to break a layout, in each language.
      for (const step of steps.long.steps)
        expect(step.label.length, `${locale} ${step.id}`).toBeGreaterThan(28);
      // A done step's link is under the market's prefix, as every link is.
      expect(at(steps.review.steps, 0).href).toBe(`${prefix}/checkout/contact`);
      expect(at(steps.five.steps, 0).href).toBe(`${prefix}/cart`);
      if (locale !== "en") {
        for (const [id, label] of steps.delivery.steps.map((step) => [step.id, step.label]))
          expect(label, `${locale} ${id}`).not.toBe(
            commerceFixtures.en.checkoutFlow.steps.delivery.steps.find((step) => step.id === id)
              ?.label,
          );
      }
    });

    it("has an estimator in each state: not sent, one country, answered, nothing to offer, refused", () => {
      for (const each of Object.values(estimator)) {
        expect(each.action).toBe(`${prefix}/cart`);
        expect(new Set(each.countries).size).toBe(each.countries.length);
      }
      // The six countries the shop could deliver to, the market's own first.
      expect(estimator.empty.countries).toEqual(
        [market.country, ...markets.countries.map((country) => country.code)].filter(
          (code, index, all) => all.indexOf(code) === index,
        ),
      );
      expect(estimator.empty.countries).toHaveLength(6);
      expect(estimator.empty.countryCode).toBeUndefined();
      expect(estimator.empty.options).toBeUndefined();
      expect(estimator.empty.postalCode).toBe("");
      expect(estimator.single.countries).toEqual([market.country]);
      // Answered: the market's own address, and every option the shop has (one is not available).
      expect(estimator.answered.countryCode).toBe(market.country);
      expect(estimator.answered.postalCode).toBe(at(fixture.addresses, 0).postalCode);
      expect(estimator.answered.options).toEqual(fixture.shippingOptions);
      expect(estimator.answered.options?.some((option) => !option.available)).toBe(true);
      expect(estimator.answered.options?.some((option) => option.pickup)).toBe(true);
      expect(estimator.answered.options?.some((option) => option.price.amount === 0)).toBe(true);
      // Nothing to offer: answered, with an empty list (not a missing one).
      expect(estimator.none.options).toEqual([]);
      expect(estimator.none.countryCode).not.toBe(market.country);
      // Refused: the code is typed and wrong, with no answer.
      expect(estimator.mistaken.options).toBeUndefined();
      expect(estimator.mistaken.postalCode).not.toBe("");
      // The long one has an option named at the length that breaks a layout.
      expect(estimator.long.options).toContainEqual(fixture.long.shippingOption);
    });

    it("has verification requests with a wait running, with none, and with a very long address", () => {
      expect(verification.waiting.resendInSeconds).toBeGreaterThan(0);
      expect(verification.ready.resendInSeconds).toBe(0);
      expect(verification.waiting.email).toBe(fixture.marketing.newsletter.typed.email);
      expect(verification.long.email).toBe(fixture.marketing.newsletter.long.email);
      expect(verification.long.email.length).toBeGreaterThan(60);
    });
  });

  describe("the long values", () => {
    it("are longer than every ordinary counterpart", () => {
      const { long } = fixture;
      const longer = (label: string, value: string, ordinary: string[]) => {
        expect(ordinary.length, label).toBeGreaterThan(0);
        for (const other of ordinary)
          expect(value.length, `${label}: ${other}`).toBeGreaterThan(other.length);
      };
      longer(
        "product title",
        long.product.title,
        fixture.products.map((p) => p.title),
      );
      const badge = long.product.badges.find((b) => b.kind === "custom");
      const ordinaryBadges = fixture.products.flatMap((p) =>
        p.badges.flatMap((b) => (b.kind === "custom" ? [b.label] : [])),
      );
      longer("badge", badge?.kind === "custom" ? badge.label : "", ordinaryBadges);
      longer(
        "cart line title",
        long.cartLine.title,
        fixture.cart.lines.map((l) => l.title),
      );
      longer(
        "cart line option value",
        long.cartLine.options.map((o) => o.value).join(" "),
        fixture.cart.lines.flatMap((l) => l.options.map((o) => o.value)),
      );
      longer(
        "street",
        long.address.address1,
        fixture.addresses.map((a) => a.address1),
      );
      longer(
        "city",
        long.address.city,
        fixture.addresses.map((a) => a.city),
      );
      longer(
        "company",
        long.address.company ?? "",
        fixture.addresses.flatMap((a) => a.company ?? []),
      );
      longer(
        "address line 2",
        long.address.address2 ?? "",
        fixture.addresses.flatMap((a) => a.address2 ?? []),
      );
      longer(
        "nav label",
        long.navItem.label,
        fixture.navigation.map((i) => i.label),
      );
      longer(
        "footer title",
        long.footerColumn.title,
        fixture.footer.map((c) => c.title),
      );
      longer(
        "footer link",
        long.footerColumn.links.map((l) => l.label).join(" "),
        fixture.footer.flatMap((c) => c.links.map((l) => l.label)),
      );
      longer(
        "review body",
        long.review.body,
        fixture.reviews.map((r) => r.body),
      );
      longer(
        "shipping name",
        long.shippingOption.name,
        fixture.shippingOptions.map((o) => o.name),
      );
    });

    it("are the right shape: a mega menu, several paragraphs, a limited stock, an address of the market", () => {
      const { long } = fixture;
      expect(long.navItem.kind).toBe("megaMenu");
      expect(long.review.body.split("\n\n").length).toBeGreaterThanOrEqual(4);
      expect(long.address.countryCode).toBe(market.country);
      expect(long.cartLine.quantity).toBeGreaterThan(1);
      expect(long.cartLine.options.length).toBeGreaterThan(1);
      expect(long.footerColumn.links).toHaveLength(5);
    });
  });
});

describe("the parse checks catch a broken fixture", () => {
  const fixture = commerceFixtures.en;
  const parses = (schema: Schema, value: unknown) => schema.safeParse(value).success;

  it("a product without a title", () => {
    const broken: Partial<ProductCard> = structuredClone(at(fixture.products, 0));
    delete broken.title;
    expect(parses(ProductCard, broken)).toBe(false);
  });

  it("a price as a string", () => {
    const broken = structuredClone(at(fixture.products, 0)) as unknown as {
      price: { price: { amount: unknown } };
    };
    broken.price.price.amount = "59";
    expect(parses(ProductCard, broken)).toBe(false);
  });

  it("a sale price that is not lower", () => {
    const broken = structuredClone(at(fixture.products, 2));
    broken.price.compareAt = { ...broken.price.price };
    expect(parses(ProductCard, broken)).toBe(false);
  });

  it("a cart in two currencies, or with a wrong item count", () => {
    const mixed = structuredClone(fixture.cart);
    mixed.total = { ...mixed.total, currencyCode: "EUR" };
    expect(parses(Cart, mixed)).toBe(false);
    const counted = structuredClone(fixture.cart);
    counted.itemCount += 1;
    expect(parses(Cart, counted)).toBe(false);
  });

  it("an order whose first event is not `placed`", () => {
    const broken = structuredClone(at(fixture.orders, 0));
    broken.events.reverse();
    expect(parses(Order, broken)).toBe(false);
  });

  it("a saved card with a card number, and a link without a slash", () => {
    const card = { ...at(fixture.savedPaymentMethods, 0), number: "4242424242424242" };
    expect(parses(SavedPaymentMethod, card)).toBe(false);
    const link = { ...at(fixture.footer, 0).links[0], href: "pages/faq" };
    expect(parses(FooterColumn, { title: "x", links: [link] })).toBe(false);
  });
});
