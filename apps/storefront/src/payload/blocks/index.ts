import type { Block, BlockSlug } from "payload";
import { BundleBlock } from "./bundle";
import { CategoryShowcaseBlock } from "./category-showcase";
import { CollectionSpotlightBlock } from "./collection-spotlight";
import { ComparisonBlock } from "./comparison";
import { EditorialListBlock } from "./editorial-list";
import { FaqBlock } from "./faq";
import { FeaturedProductBlock } from "./featured-product";
import { FormBlockBlock } from "./form-block";
import { HeroBlock } from "./hero";
import { LogoCloudBlock } from "./logo-cloud";
import { MediaWithTextBlock } from "./media-with-text";
import { NewsletterBlock } from "./newsletter";
import { ProductCollectionBlock } from "./product-collection";
import { PromoBannerBlock } from "./promo-banner";
import { RecentlyViewedBlock } from "./recently-viewed";
import { RichTextBlock } from "./rich-text";
import { SpacerBlock } from "./spacer";
import { TestimonialsBlock } from "./testimonials";
import { VideoBlock } from "./video";
import { UspBarBlock } from "./usp-bar";

/**
 * SPEC §7.4's blocks (D70, D79): the root config's `blocks`, which `pages.layout` uses through
 * `blockReferences`, so a block is defined once (and Lexical's blocks feature can reuse it later).
 * In the registry's order; each is a Sections entry's `block` (`blocks.test.ts`, the drift test).
 */
export const BLOCKS: Block[] = [
  RichTextBlock,
  MediaWithTextBlock,
  UspBarBlock,
  LogoCloudBlock,
  FaqBlock,
  TestimonialsBlock,
  VideoBlock,
  SpacerBlock,
  // T64: the commerce blocks.
  HeroBlock,
  CategoryShowcaseBlock,
  ProductCollectionBlock,
  FeaturedProductBlock,
  BundleBlock,
  PromoBannerBlock,
  ComparisonBlock,
  CollectionSpotlightBlock,
  RecentlyViewedBlock,
  // T67: the blocks that post a form.
  NewsletterBlock,
  FormBlockBlock,
  // T66: the journal's posts.
  EditorialListBlock,
];

/** The slugs `pages.layout` offers (`BlockSlug`: the generated types' names for the root blocks). */
export const LAYOUT_BLOCKS = BLOCKS.map((block) => block.slug as BlockSlug);

/**
 * A deep copy of a config value: plain objects and arrays are copied, everything else (functions,
 * class instances such as a Lexical editor, symbols' values) is kept as it is.
 */
function copyConfig<T>(value: T): T {
  if (Array.isArray(value)) return value.map(copyConfig) as T;
  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, each]) => [key, copyConfig(each)]),
    ) as T;
  }
  return value;
}

/**
 * The blocks of `pages.localizedLayout` (D105, T88): copies of `BLOCKS`, not `blockReferences`.
 * Payload 3.93's Postgres adapter gives a localized blocks field that names a block already used
 * by a shared one its own tables (`pages_blocks_faq_2`, with `_locale`), but it marks the block
 * object itself to say so, and through `blockReferences` both fields hold the one root block: the
 * shared `layout`'s rows then go to the `_2` tables too, and the first save fails ("null value in
 * column _locale", T88's check). Copies keep the two apart. They must be deep: Payload sanitizes a
 * localized field's blocks by taking `localized` off the fields inside them, and a shallow copy
 * shares those field objects with `BLOCKS`, so the shared layout's texts would stop being localized.
 * Each call returns new copies (Payload's sanitizing writes to them).
 */
export function localizedLayoutBlocks(): Block[] {
  return BLOCKS.map(copyConfig);
}

/**
 * The blocks a product's, a category's or a collection's `sections` offer, and the `templates`
 * global's default sections (D104, T87): every block but the `hero` (the page's `<h1>` is the
 * product's or the listing's name), `recentlyViewed` (the product page draws its own row) and
 * `editorialList` (the journal's posts are read for pages only).
 */
export const CATALOG_SECTION_BLOCKS = LAYOUT_BLOCKS.filter(
  (slug) => !["hero", "recentlyViewed", "editorialList"].includes(slug),
);
