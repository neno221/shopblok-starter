import type { Block, BlockSlug } from "payload";
import { BundleBlock } from "./bundle";
import { CategoryShowcaseBlock } from "./category-showcase";
import { CollectionSpotlightBlock } from "./collection-spotlight";
import { ComparisonBlock } from "./comparison";
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
];

/** The slugs `pages.layout` offers (`BlockSlug`: the generated types' names for the root blocks). */
export const LAYOUT_BLOCKS = BLOCKS.map((block) => block.slug as BlockSlug);
