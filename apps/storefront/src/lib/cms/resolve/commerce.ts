import {
  BundleSection,
  CategoryShowcaseSection,
  CollectionSpotlightSection,
  ComparisonSection,
  FeaturedProductSection,
  HeroSection,
  ProductCollectionSection,
  PromoBannerSection,
  RecentlyViewedSection,
  type ComparisonProduct,
  type ProductCard,
} from "@shopblok/registry/contracts";
import type { ProductDto } from "../../medusa/products";
import type { Hrefs } from "../../view-models/common";
import { toProductCard } from "../../view-models/product";
import type { LinkValue } from "../link";
import { mediaImage } from "../shell";
import type { CatalogReads } from "./catalog";
import { resolveCategorySource } from "./categories";
import {
  handpickedCards,
  handpickedProducts,
  liveMedusaId,
  resolveProductSource,
} from "./products";
import type { LayoutBlock, ResolveContext } from "./sections";
import { paragraphs as split, parsed, sectionLink, settingsOf, text } from "./shared";

// SPEC §7.5's resolution rule for the commerce blocks (D79, T64): each block's references become
// its section's view model for the market, through `CatalogReads` (the market's region and
// language, the catalog's cached reads), and the result is parsed with the section's contract, so
// a block whose products are all gone, or one an editor left half-done, is left out of the page.
// The words an editor wrote come as they are; Medusa's (names, prices, options) in the market's
// language and currency.

/** What the commerce blocks need besides the links' context: the market's catalog and words. */
export type CommerceContext = {
  reads: CatalogReads;
  hrefs: Required<Hrefs>;
  /** The render's time (`renderTime`, D50): the countdown's `now` and the banners' expiry. */
  now: string;
  /** Every product's listing (`{m}/store`): the empty state's way out. */
  storeHref: string;
  /** The catalog's words a resolved block holds: the empty state's, the recently viewed heading. */
  words: {
    empty: { title: string; text: string; action: string };
    recentlyViewed: string;
  };
};

/** The commerce blocks' slugs (D79), in the registry's order. */
export const COMMERCE_BLOCKS = [
  "hero",
  "categoryShowcase",
  "productCollection",
  "featuredProduct",
  "bundle",
  "promoBanner",
  "comparison",
  "collectionSpotlight",
  "recentlyViewed",
] as const;

export type CommerceBlockType = (typeof COMMERCE_BLOCKS)[number];

/** A commerce block resolved for its section; `key` is the block's id, for React's list. */
export type ResolvedCommerceBlock = { key: string } & (
  | { blockType: "hero"; section: HeroSection }
  | { blockType: "categoryShowcase"; section: CategoryShowcaseSection }
  | { blockType: "productCollection"; section: ProductCollectionSection }
  | { blockType: "featuredProduct"; section: FeaturedProductSection }
  | { blockType: "bundle"; section: BundleSection }
  | { blockType: "promoBanner"; section: PromoBannerSection }
  | { blockType: "comparison"; section: ComparisonSection }
  | { blockType: "collectionSpotlight"; section: CollectionSpotlightSection }
  | { blockType: "recentlyViewed"; section: RecentlyViewedSection }
);

/** A time after `now`, as the contracts write it; `undefined` when it is missing or past. */
function future(value: string | null | undefined, now: string): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const at = Date.parse(value);
  return Number.isNaN(at) || at <= Date.parse(now) ? undefined : new Date(at).toISOString();
}

/** A product's options as a comparison's rows: one per option title, its values joined. */
function optionRows(
  products: readonly ProductDto[],
): { label: string; values: (string | null)[] }[] {
  const titles: string[] = [];
  for (const product of products)
    for (const option of product.options)
      if (option.values.length > 0 && !titles.includes(option.title)) titles.push(option.title);
  return titles.map((title) => ({
    label: title,
    values: products.map((product) => {
      const option = product.options.find((each) => each.title === title);
      const values = option?.values.map((value) => value.value) ?? [];
      return values.length === 0 ? null : values.join(", ");
    }),
  }));
}

/**
 * One commerce block as its section's view model, or `null` when it cannot be drawn: its products
 * are gone, it has fewer than it needs, or its offer has ended.
 */
export async function resolveCommerceBlock(
  block: Extract<LayoutBlock, { blockType: CommerceBlockType }>,
  context: ResolveContext,
  commerce: CommerceContext,
): Promise<ResolvedCommerceBlock | null> {
  const key = block.id ?? block.blockType;
  const settings = settingsOf(block);
  const { reads, hrefs, now } = commerce;
  const paragraphs = (value: string | null | undefined) => {
    const list = typeof value === "string" ? split(value) : [];
    return list.length === 0 ? undefined : list;
  };
  const links = (rows: readonly { link?: unknown }[] | null | undefined) =>
    (rows ?? []).flatMap((row) => sectionLink(row.link as LinkValue, context) ?? []);

  switch (block.blockType) {
    case "hero": {
      const source = await resolveProductSource(block.productSource, reads, hrefs, {
        max: 4,
        defaultLimit: 4,
      });
      const endsAt = future(block.countdownEnd, now);
      const section = parsed(HeroSection, {
        settings,
        eyebrow: text(block.eyebrow),
        heading: text(block.heading),
        subheading: text(block.subheading),
        image: mediaImage(block.media),
        links: links(block.links),
        countdown: endsAt === undefined ? undefined : { endsAt, now },
        // The hero stands without its products: an empty source leaves only them out.
        products: source?.products ?? [],
      });
      return section === undefined ? null : { key, blockType: "hero", section };
    }
    case "categoryShowcase": {
      const section = parsed(CategoryShowcaseSection, {
        settings,
        heading: text(block.heading),
        intro: text(block.intro),
        link: links(block.links)[0],
        tiles: await resolveCategorySource(block.categorySource, reads, hrefs),
      });
      return section === undefined ? null : { key, blockType: "categoryShowcase", section };
    }
    case "productCollection": {
      const source = await resolveProductSource(block.productSource, reads, hrefs);
      const products = source?.products ?? [];
      const { empty } = commerce.words;
      const section = parsed(ProductCollectionSection, {
        settings,
        heading: text(block.heading),
        intro: text(block.intro),
        link: links(block.links)[0],
        display: block.display,
        products,
        // `hide`: no `empty`, so the contract leaves the block out when there is no product.
        ...(products.length === 0 && source?.empty === "message"
          ? {
              empty: {
                title: empty.title,
                text: empty.text,
                action: { label: empty.action, href: commerce.storeHref },
              },
            }
          : {}),
      });
      return section === undefined ? null : { key, blockType: "productCollection", section };
    }
    case "featuredProduct": {
      const [card] = await handpickedCards([block.product], reads, hrefs);
      const image = mediaImage(block.media) ?? card?.images[0];
      const section = parsed(FeaturedProductSection, {
        settings,
        heading: text(block.heading),
        product: card,
        image,
        text: paragraphs(block.text),
      });
      return section === undefined ? null : { key, blockType: "featuredProduct", section };
    }
    case "bundle": {
      const section = parsed(BundleSection, {
        settings,
        heading: text(block.heading),
        text: paragraphs(block.text),
        products: await handpickedCards(block.products, reads, hrefs),
      });
      return section === undefined ? null : { key, blockType: "bundle", section };
    }
    case "promoBanner": {
      // An offer that has ended is not drawn; one without an end runs until the editor removes it.
      if (typeof block.endsAt === "string" && future(block.endsAt, now) === undefined) return null;
      const section = parsed(PromoBannerSection, {
        settings,
        heading: text(block.heading),
        text: paragraphs(block.text),
        code: text(block.code),
        terms: text(block.terms),
        endsAt: future(block.endsAt, now),
        image: mediaImage(block.media),
        link: links(block.links)[0],
      });
      return section === undefined ? null : { key, blockType: "promoBanner", section };
    }
    case "comparison": {
      const products = (await handpickedProducts(block.products, reads)).flatMap((product) => {
        const card = toProductCard(product, hrefs);
        return card === null ? [] : [{ product, card }];
      });
      const keys = (block.rows ?? []).flatMap((row) =>
        text(row.key) === undefined || text(row.label) === undefined ? [] : [row],
      );
      const metadata = await reads.metadata(
        products.map(({ product }) => product.id),
        keys.map((row) => row.key.trim()),
      );
      const columns: ComparisonProduct[] = products.map(({ card }) => ({
        id: card.id,
        title: card.title,
        href: card.href,
        ...(card.images[0] === undefined ? {} : { image: { ...card.images[0], alt: "" } }),
        price: card.price,
      }));
      const section = parsed(ComparisonSection, {
        settings,
        heading: text(block.heading),
        products: columns,
        rows: [
          ...(block.showOptions === false
            ? []
            : optionRows(products.map(({ product }) => product))),
          ...keys.map((row) => ({
            label: row.label,
            values: products.map(({ product }) => metadata[product.id]?.[row.key.trim()] ?? null),
          })),
        ],
      });
      return section === undefined ? null : { key, blockType: "comparison", section };
    }
    case "collectionSpotlight": {
      const id = liveMedusaId(block.collection);
      const collection =
        id === null ? undefined : (await reads.collections()).find((each) => each.id === id);
      // Gone from Medusa, or not sold through the key's channel: nothing to spotlight.
      if (collection === undefined) return null;
      const limit =
        typeof block.limit === "number" ? Math.max(0, Math.min(8, Math.floor(block.limit))) : 4;
      const products: ProductCard[] =
        limit === 0
          ? []
          : ((
              await resolveProductSource(
                {
                  mode: "collection",
                  collection: block.collection,
                  limit,
                  sort: block.sort,
                },
                reads,
                hrefs,
                { max: 8, defaultLimit: 4 },
              )
            )?.products ?? []);
      const section = parsed(CollectionSpotlightSection, {
        settings,
        heading: text(block.heading) ?? collection.title,
        text: paragraphs(block.text),
        image: mediaImage(block.media),
        href: hrefs.collection(collection.handle),
        products,
      });
      return section === undefined ? null : { key, blockType: "collectionSpotlight", section };
    }
    case "recentlyViewed": {
      const section = parsed(RecentlyViewedSection, {
        settings,
        heading: text(block.heading) ?? commerce.words.recentlyViewed,
        // The visitor's: the island fills them in the browser (D44).
        products: [],
      });
      return section === undefined ? null : { key, blockType: "recentlyViewed", section };
    }
  }
}
