import type {
  Announcement,
  FooterColumn,
  Link,
  MarketOption,
  MediaFigure,
  MegaMenuColumn,
  NavItem,
  ProductCard,
  Review,
  ShippingOption,
  CartLine,
  Address,
} from "@shopblok/registry/contracts";
import { marketPrefix, marketRoot, round2, type Context } from "../context";
import { type CategoryHandle, type CategoryNode, categoryTree, palette } from "../data/catalog";
import type { Prices } from "../data/catalog";
import { fixtureImage } from "../images";
import { markets } from "../../markets";
import type { CommerceFixture } from "../types";

/** The node at `path` of the category tree. */
function findNode(path: CategoryHandle[]): CategoryNode {
  let level = categoryTree;
  let found: CategoryNode | undefined;
  for (const handle of path) {
    found = level.find((node) => node.handle === handle);
    if (found === undefined) throw new Error(`There is no category ${path.join("/")}`);
    level = found.children;
  }
  if (found === undefined) throw new Error("A category path needs at least one handle");
  return found;
}

/** The links to a category's children. */
function childLinks(ctx: Context, path: CategoryHandle[]): Link[] {
  return findNode(path).children.map((child) => ({
    label: ctx.copy.categories[child.handle],
    href: ctx.categoryHref(...path, child.handle),
  }));
}

/** A mega menu's column: a category's title and links to its children. */
function categoryColumn(ctx: Context, path: CategoryHandle[]): MegaMenuColumn {
  const handle = path[path.length - 1];
  if (handle === undefined) throw new Error("A column needs a category");
  return {
    title: ctx.copy.categories[handle],
    href: ctx.categoryHref(...path),
    links: childLinks(ctx, path),
  };
}

export function buildNavigation(ctx: Context): NavItem[] {
  const { copy } = ctx;
  const { navigation } = copy;
  const page = (label: string, path: string): Link => ({ label, href: ctx.href(path) });
  const [autumn, knitwear] = navigation.womenFeatures;
  const [essentials] = navigation.menFeatures;
  return [
    { kind: "link", ...page(navigation.newIn, "/pages/new-in") },
    {
      kind: "megaMenu",
      label: copy.categories.women,
      href: ctx.categoryHref("women"),
      columns: [
        categoryColumn(ctx, ["women", "clothing"]),
        categoryColumn(ctx, ["accessories"]),
        {
          title: navigation.discover,
          links: [
            page(navigation.bestsellers, "/pages/bestsellers"),
            page(navigation.giftCards, "/pages/gift-cards"),
            page(navigation.organic, "/pages/organic-cotton"),
          ],
        },
      ],
      featured: [
        {
          title: autumn.title,
          href: ctx.href("/pages/autumn-edit"),
          image: fixtureImage({ seed: 30, ratio: "4:3", alt: autumn.alt }),
        },
        {
          title: knitwear.title,
          href: ctx.categoryHref("women", "clothing", "knitwear"),
          image: fixtureImage({ seed: 31, ratio: "16:9", alt: knitwear.alt }),
        },
      ],
    },
    {
      kind: "megaMenu",
      label: copy.categories.men,
      href: ctx.categoryHref("men"),
      columns: [categoryColumn(ctx, ["men", "clothing"]), categoryColumn(ctx, ["accessories"])],
      featured: [
        {
          title: essentials.title,
          href: ctx.href("/pages/everyday-essentials"),
          image: fixtureImage({ seed: 32, ratio: "16:9", alt: essentials.alt }),
        },
      ],
    },
    {
      kind: "dropdown",
      label: copy.categories.accessories,
      items: childLinks(ctx, ["accessories"]),
    },
    { kind: "link", ...page(navigation.sale, "/pages/sale") },
  ];
}

// The currency each seeded country sells in (the backend's regions); the seeded map has none.
const currencyByCountry: Record<string, string> = {
  cy: "EUR",
  us: "USD",
  gb: "GBP",
  de: "EUR",
  fr: "EUR",
  ch: "CHF",
};

/** The six seeded countries in the map's order, the DS market's language current. */
export function buildMarkets(ctx: Context): MarketOption[] {
  return markets.countries
    .filter((country) => country.enabled)
    .map((country) => {
      const currencyCode = currencyByCountry[country.code];
      if (currencyCode === undefined) throw new Error(`No currency for ${country.code}`);
      const upper = country.code.toUpperCase();
      return {
        country: country.code,
        flagCode: upper,
        currencyCode,
        languages: country.languages.map((language) => ({
          language,
          htmlLang: `${language}-${upper}`,
          href: marketRoot(marketPrefix(country.code, language)),
          current: country.code === ctx.market.country && language === ctx.market.language,
        })),
      };
    });
}

export function buildAnnouncement(ctx: Context): Announcement {
  return {
    message: ctx.copy.announcement.message,
    link: { label: ctx.copy.announcement.link, href: ctx.href("/pages/shipping-returns") },
  };
}

export function buildFigure(ctx: Context): MediaFigure {
  const { figure } = ctx.copy;
  return {
    image: fixtureImage({ seed: 40, ratio: "16:9", alt: figure.alt }),
    caption: figure.caption,
    credit: figure.credit,
  };
}

// The long product is a hoodie on sale whose prices vary.
const longPrices: Prices = { EUR: 79, USD: 85, CHF: 77 };
const longCompareAt: Prices = { EUR: 99, USD: 109, CHF: 97 };
const longExpress: Prices = { EUR: 12.9, USD: 14, CHF: 14.9 };

const longHandle = "heritage-hoodie-limited-autumn-edition";
const longProductId = "prod_heritage_hoodie_limited";

/** A long mega-menu column: the locale's long title and labels over links to real categories. */
function longColumn(
  ctx: Context,
  column: { title: string; links: [string, string, string] },
  path: CategoryHandle[],
  leaves: [CategoryHandle, CategoryHandle, CategoryHandle],
): MegaMenuColumn {
  return {
    title: column.title,
    href: ctx.categoryHref(...path),
    links: leaves.map((leaf, index) => ({
      label: column.links[index] ?? "",
      href: ctx.categoryHref(...path, leaf),
    })),
  };
}

/** The same kinds of values at the length that breaks a layout. */
export function buildLong(ctx: Context): CommerceFixture["long"] {
  const { long } = ctx.copy;
  const href = ctx.href(`/products/${longHandle}`);
  const front = fixtureImage({
    seed: 50,
    ratio: "3:4",
    alt: ctx.copy.imageAlt.front(long.productTitle),
  });
  const back = fixtureImage({
    seed: 51,
    ratio: "3:4",
    alt: ctx.copy.imageAlt.back(long.productTitle),
  });
  const product: ProductCard = {
    id: longProductId,
    handle: longHandle,
    title: long.productTitle,
    href,
    images: [front, back],
    price: {
      price: ctx.price(longPrices),
      compareAt: ctx.price(longCompareAt),
      varies: true,
    },
    badges: [{ kind: "custom", label: long.badge }, { kind: "sale" }],
    rating: { average: 4.5, count: 1284 },
    swatches: (["black", "oatmeal", "forest", "sky"] as const).map((key) => ({
      id: `colour-${key}`,
      label: ctx.colourName(key),
      hex: palette[key],
      available: true,
    })),
    variantCount: 24,
    stock: { status: "low", quantity: 2 },
  };

  const unitPrice = ctx.price(longPrices);
  const cartLine: CartLine = {
    id: "line_long",
    productId: longProductId,
    variantId: "var_heritage_hoodie_limited_oatmeal_xl",
    title: long.cartLine.title,
    href,
    image: front,
    options: long.cartLine.options.map((option) => ({ ...option })),
    quantity: 2,
    maxQuantity: 5,
    unitPrice,
    compareAtUnitPrice: ctx.price(longCompareAt),
    total: ctx.money(round2(unitPrice.amount * 2)),
    stock: { status: "low", quantity: 5 },
  };

  const address: Address = {
    id: "addr_long",
    ...long.address,
    countryCode: ctx.market.country,
  };

  const [first, second] = long.nav.columns;
  const navItem: NavItem = {
    kind: "megaMenu",
    label: long.nav.label,
    href: ctx.categoryHref("women"),
    columns: [
      longColumn(ctx, first, ["women", "clothing"], ["hoodies", "t-shirts", "knitwear"]),
      longColumn(ctx, second, ["accessories"], ["bags", "headwear", "socks"]),
    ],
    featured: [
      {
        title: long.nav.feature.title,
        href: ctx.href("/pages/autumn-edit"),
        image: fixtureImage({ seed: 52, ratio: "16:9", alt: long.nav.feature.alt }),
      },
    ],
  };

  // The five help pages, in the order of the long labels.
  const helpPaths = [
    "/pages/shipping-returns",
    "/pages/returns",
    "/pages/size-guide",
    "/pages/contact",
    "/pages/faq",
  ];
  const footerColumn: FooterColumn = {
    title: long.footer.title,
    links: helpPaths.map((path, index) => ({
      label: long.footer.links[index] ?? "",
      href: ctx.href(path),
    })),
  };

  const review: Review = {
    id: "rev_long",
    author: long.review.author,
    rating: 4,
    title: long.review.title,
    body: long.review.body,
    createdAt: "2026-09-20T08:15:00.000Z",
    verified: true,
  };

  const shippingOption: ShippingOption = {
    id: "so_long",
    name: long.shippingName,
    price: ctx.price(longExpress),
    estimate: { minDays: 1, maxDays: 2 },
    available: true,
  };

  return { product, cartLine, address, navItem, footerColumn, review, shippingOption };
}
