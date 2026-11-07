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
  type HeroCollection,
  type Image,
  type ProductCard,
  type ProductCollectionTab,
} from "@shopblok/registry/contracts";
import type { ProductDto } from "../../medusa/products";
import type { Hrefs } from "../../view-models/common";
import { toImages, toProductCard } from "../../view-models/product";
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
import { MAX_TABS, resolveTab, tabEndpoint, type StoredTab } from "./tabs";
import {
  paragraphs as split,
  parsed,
  sectionLink,
  settingsOf,
  storedVariant,
  text,
} from "./shared";

// SPEC §7.5's resolution rule for the commerce blocks (D79, T64): each block's references become
// its section's view model for the market, through `CatalogReads` (the market's region and
// language, the catalog's cached reads), and the result is parsed with the section's contract, so
// a block whose products are all gone, or one an editor left half-done, is left out of the page.
// The words an editor wrote come as they are; Medusa's (names, prices, options) in the market's
// language and currency.

/** What the commerce blocks need besides the links' context: the market's catalog and words. */
export type CommerceContext = {
  /** The market's key (`us`), which the `tabs` collection's endpoints name (T81). */
  market: string;
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

/**
 * The `collection-switcher` hero's collections (T80): each row's collection as Medusa has it for
 * the market (its translated title and its listing), with the row's picture. A row whose
 * collection is gone from Medusa, whose picture is missing or that repeats one is left out, so
 * the contract's two to four count what the market can draw; `undefined` when none is left.
 */
async function heroCollections(
  rows: readonly { collection?: unknown; media?: unknown }[] | null | undefined,
  reads: CatalogReads,
  hrefs: Required<Hrefs>,
): Promise<HeroCollection[] | undefined> {
  if (rows === null || rows === undefined || rows.length === 0) return undefined;
  const all = await reads.collections();
  const seen = new Set<string>();
  const found = rows.flatMap((row) => {
    const id = liveMedusaId(row.collection);
    const collection = id === null ? undefined : all.find((each) => each.id === id);
    const image = mediaImage(row.media);
    // A collection picked twice is one tab.
    if (collection === undefined || image === undefined || seen.has(collection.id)) return [];
    seen.add(collection.id);
    return [{ title: collection.title, href: hrefs.collection(collection.handle), image }];
  });
  return found.length === 0 ? undefined : found;
}

/** The product collection's designs that draw the editor's picture (T81); the others show none. */
const COLLECTION_PICTURE: readonly string[] = ["with-banner", "lookbook"];

/** The featured product's `gallery` (T81): the first picture, then the product's others, five at most. */
function galleryOf(first: Image, others: readonly Image[]): Image[] {
  const seen = new Set([first.src]);
  const rest = others.filter((each) => !seen.has(each.src) && seen.add(each.src));
  return [first, ...rest].slice(0, 5);
}

/**
 * The `tabs` product collection's tabs (T81): every stored tab resolved for the market (each its
 * own cached reads, as a source is), those with nothing the market sells left out. The first left
 * gives the section its `products`, the HTML's; the others go to the tab island by their endpoint,
 * which names their stored place, when the page is a published document the route can read
 * (`context.document`), and else (Draft Mode, a page with no document) with their products, so a
 * tab is never one that cannot load.
 */
async function collectionTabs(
  block: Extract<LayoutBlock, { blockType: "productCollection" }>,
  context: ResolveContext,
  commerce: CommerceContext,
): Promise<{ products: ProductCard[]; tabs: ProductCollectionTab[] | undefined }> {
  const stored = ((block.tabs ?? []) as StoredTab[]).slice(0, MAX_TABS);
  const resolved = await Promise.all(
    stored.map(async (tab, index) => {
      const found = await resolveTab(tab, commerce.reads, commerce.hrefs, commerce.storeHref);
      return found === null ? [] : [{ ...found, index }];
    }),
  );
  const tabs = resolved.flat();
  const [first] = tabs;
  if (first === undefined) return { products: [], tabs: undefined };
  const doc = context.document?.id;
  return {
    products: first.products,
    tabs: tabs.map(({ label, href, products, index }, place) => ({
      label,
      href,
      ...(place === 0
        ? {}
        : doc === undefined || block.id == null
          ? { products }
          : { endpoint: tabEndpoint(commerce.market, doc, block.id, index) }),
    })),
  };
}

/** The promo banner's designs that draw the editor's picture (T82); the others show none. */
const PROMO_PICTURE: readonly string[] = ["standard", "full-bleed", "popup"];

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
      // T80: the stored variant is parsed with the rest when the family has it, so the contract
      // refuses a member without what it needs (`variantNeeds`); a value from another version is
      // left to `withVariant`, which draws the first member.
      const variant = storedVariant("hero", block.variant);
      const [source, collections] = await Promise.all([
        // The collection switcher draws no products, so it reads none.
        variant === "collection-switcher"
          ? undefined
          : resolveProductSource(block.productSource, reads, hrefs, { max: 4, defaultLimit: 4 }),
        variant === "collection-switcher"
          ? heroCollections(block.collections, reads, hrefs)
          : undefined,
      ]);
      const endsAt = future(block.countdownEnd, now);
      const section = parsed(HeroSection, {
        settings,
        ...(variant === undefined ? {} : { variant }),
        eyebrow: text(block.eyebrow),
        heading: text(block.heading),
        subheading: text(block.subheading),
        // The text hero draws no picture.
        image: variant === "text" ? undefined : mediaImage(block.media),
        secondImage: variant === "editorial" ? mediaImage(block.secondMedia) : undefined,
        collections,
        links: links(block.links),
        countdown: endsAt === undefined ? undefined : { endsAt, now },
        // The hero stands without its products: an empty source leaves only them out (but the
        // product hero is its first product, and the contract leaves it out without one).
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
      // T81: the stored variant is parsed with the rest, so the contract refuses a `with-banner`
      // or a `lookbook` without its picture and a `tabs` without a tab; the picture is resolved
      // only for them, and `tabs` reads its tabs' sources instead of the block's.
      const variant = storedVariant("product-collection", block.variant);
      const tabbed = variant === "tabs" ? await collectionTabs(block, context, commerce) : null;
      const source =
        tabbed === null ? await resolveProductSource(block.productSource, reads, hrefs) : null;
      const products = tabbed?.products ?? source?.products ?? [];
      const { empty } = commerce.words;
      const section = parsed(ProductCollectionSection, {
        settings,
        ...(variant === undefined ? {} : { variant }),
        heading: text(block.heading),
        intro: text(block.intro),
        link: links(block.links)[0],
        // The display is the first design's alone (hidden for the others): Payload's default stands.
        display: block.display ?? "carousel",
        products,
        image: COLLECTION_PICTURE.includes(variant ?? "standard")
          ? mediaImage(block.media)
          : undefined,
        tabs: tabbed?.tabs,
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
      // T81: `gallery` draws the product's own pictures after the editor's, so it reads them.
      const variant = storedVariant("featured-product", block.variant);
      const [product] = await handpickedProducts([block.product], reads);
      const card = product === undefined ? undefined : (toProductCard(product, hrefs) ?? undefined);
      const editors = mediaImage(block.media);
      const image = editors ?? card?.images[0];
      const section = parsed(FeaturedProductSection, {
        settings,
        ...(variant === undefined ? {} : { variant }),
        heading: text(block.heading),
        product: card,
        image,
        text: paragraphs(block.text),
        gallery:
          variant === "gallery" && product !== undefined && image !== undefined
            ? galleryOf(image, toImages(product))
            : undefined,
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
      // T82: the stored variant is parsed with the rest, so the contract refuses a `full-bleed`
      // without its picture and a `countdown` without its end. The picture is resolved only for
      // the designs that draw it, and `now` (the countdown's start, D50) only for `countdown`.
      const variant = storedVariant("promo-banner", block.variant);
      const section = parsed(PromoBannerSection, {
        settings,
        ...(variant === undefined ? {} : { variant }),
        heading: text(block.heading),
        text: paragraphs(block.text),
        code: text(block.code),
        terms: text(block.terms),
        endsAt: future(block.endsAt, now),
        now: variant === "countdown" ? now : undefined,
        image: PROMO_PICTURE.includes(variant ?? "standard") ? mediaImage(block.media) : undefined,
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
      // T82: `highlight`'s pick, resolved only for it: the picked product's column, when it is
      // still one of the table's (a pick gone from Medusa leaves the block out, as the contract says).
      const variant = storedVariant("comparison", block.variant);
      const picked = variant === "highlight" ? liveMedusaId(block.pick) : null;
      const pick = products.find(({ product }) => product.id === picked)?.card.id;
      const section = parsed(ComparisonSection, {
        settings,
        ...(variant === undefined ? {} : { variant }),
        heading: text(block.heading),
        products: columns,
        pick,
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
