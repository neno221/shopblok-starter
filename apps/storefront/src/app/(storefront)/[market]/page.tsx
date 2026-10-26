import type { Image } from "@shopblok/registry/contracts";
import { HomeTemplate, homeCopy } from "@shopblok/ui/templates/home";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { getCurrentMarket } from "../../../lib/current-market";
import { getMarketContext, type MarketContext } from "../../../lib/market-context";
import { hreflangAlternates } from "../../../lib/markets/hreflang";
import {
  flattenCategories,
  listCategories,
  type CategoryNode,
} from "../../../lib/medusa/categories";
import { listProductsByIds, type ProductDto } from "../../../lib/medusa/products";
import { searchProducts } from "../../../lib/medusa/search";
import { buildReadsMedusa } from "../../../lib/prerender";
import { homeJsonLd } from "../../../lib/seo/home";
import { jsonLdText } from "../../../lib/seo/product";
import { HERO_IMAGE, SHELL_PREFETCH, SITE, siteText } from "../../../lib/site";
import { PLACEHOLDER_IMAGE, toProductImage } from "../../../lib/view-models/common";
import { HOME_CATEGORIES, NEW_ARRIVALS, toHomePage } from "../../../lib/view-models/home";
import { toImages, toProductCard } from "../../../lib/view-models/product";

// D58 (T51): the market's home, in the static shell. Every read is a `cached()` entry (the
// categories under `navigation`, the searches under `search`, the products under
// `medusa:products`), so the route is `ensureStatic = "navigation"`: a `cookies()`, a
// `connection()` or an uncached read anywhere in it fails the build. The hero's words and picture
// are the shop's (`site.ts`) until M4's `hero` block; the categories, their pictures and the new
// arrivals are Medusa's.

export const ensureStatic = "navigation";

type HomeData = { context: MarketContext; messages: Awaited<ReturnType<typeof getMessages>> };

/** The market, or `null` for a market without a region (a 404). Shared by the page and metadata. */
const readHome = cache(async (): Promise<HomeData | null> => {
  // The stand-in (no Medusa, D10) has no region to read: the home is a 404 there, as a listing is.
  if (!buildReadsMedusa()) return null;
  const market = await getCurrentMarket();
  const [context, messages] = await Promise.all([getMarketContext(market.key), getMessages()]);
  return context === null ? null : { context, messages };
});

/** How many of a category's newest products are looked at for a picture. */
const PICTURE_CANDIDATES = 4;

/** A product's first usable picture: its images, then its thumbnail; never the placeholder. */
function usablePicture(product: ProductDto): Image | undefined {
  const thumbnail = product.thumbnail === null ? [] : [toProductImage(product.thumbnail, "")];
  return [...toImages(product), ...thumbnail].find((image) => image.src !== PLACEHOLDER_IMAGE.src);
}

/**
 * A category's picture: the first usable one among its newest products (its children's included),
 * so a product the channel does not sell or one without a picture does not leave the tile empty.
 */
async function firstPicture(
  context: MarketContext,
  node: CategoryNode,
): Promise<Image | undefined> {
  const { market, region } = context;
  const result = await searchProducts({
    locale: market.medusaLocale,
    currencyCode: region.currencyCode,
    query: "",
    filters: { categoryIds: flattenCategories([node]).map((each) => each.id) },
    sort: "newest",
    page: 1,
    pageSize: PICTURE_CANDIDATES,
  });
  if (result.ids.length === 0) return undefined;
  const products = await listProductsByIds(result.ids, {
    regionId: region.id,
    locale: market.medusaLocale,
  });
  for (const product of products) {
    const picture = usablePicture(product);
    // The tile's name is the category's: its picture is decoration.
    if (picture !== undefined) return { ...picture, alt: "" };
  }
  return undefined;
}

/** The newest products as cards, newest first. */
async function readNewArrivals(context: MarketContext) {
  const { market, region } = context;
  const result = await searchProducts({
    locale: market.medusaLocale,
    currencyCode: region.currencyCode,
    query: "",
    filters: {},
    sort: "newest",
    page: 1,
    pageSize: NEW_ARRIVALS,
  });
  if (result.ids.length === 0) return [];
  const products = await listProductsByIds(result.ids, {
    regionId: region.id,
    locale: market.medusaLocale,
  });
  return products.flatMap((product) => toProductCard(product, context.hrefs) ?? []);
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await readHome();
  if (data === null) return {};
  const { context } = data;
  const href = context.url("/");
  const text = siteText(context.market.language);
  return {
    // The layout's default title, the store's name, is the home's.
    description: text.hero.text,
    alternates: { canonical: href, languages: hreflangAlternates("/", context.map) },
    openGraph: { type: "website", title: SITE.storeName, url: href },
  };
}

export default async function MarketHome() {
  const data = await readHome();
  if (data === null) notFound();
  const { context, messages } = data;
  const { market } = context;
  const tree = (await listCategories(market.medusaLocale)).slice(0, HOME_CATEGORIES);
  const [pictures, newArrivals] = await Promise.all([
    Promise.all(tree.map((node) => firstPicture(context, node))),
    readNewArrivals(context),
  ]);
  const text = siteText(market.language);
  const content = toHomePage({
    hero: { ...text.hero, image: HERO_IMAGE },
    categories: tree.map((node, index) => {
      const image = pictures[index];
      return {
        label: node.name,
        href: context.hrefs.category(node.handle),
        ...(image === undefined ? {} : { image }),
      };
    }),
    newArrivals,
    copy: messages.templates.home,
    storeHref: context.url("/store"),
  });
  return (
    <>
      <script
        type="application/ld+json"
        // The store's name and the market's URLs, escaped by `jsonLdText` all the same.
        dangerouslySetInnerHTML={{
          __html: jsonLdText(
            homeJsonLd({
              storeName: SITE.storeName,
              homeHref: context.url("/"),
              searchHref: context.url("/search"),
              language: market.htmlLang,
            }),
          ),
        }}
      />
      <HomeTemplate
        {...content}
        copy={homeCopy(messages)}
        locale={market.htmlLang}
        prefetch={SHELL_PREFETCH}
      />
    </>
  );
}
