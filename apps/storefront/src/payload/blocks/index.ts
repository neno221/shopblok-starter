import type { Block, BlockSlug } from "payload";
import { FaqBlock } from "./faq";
import { FormBlockBlock } from "./form-block";
import { LogoCloudBlock } from "./logo-cloud";
import { MediaWithTextBlock } from "./media-with-text";
import { NewsletterBlock } from "./newsletter";
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
  NewsletterBlock,
  FormBlockBlock,
];

/** The slugs `pages.layout` offers (`BlockSlug`: the generated types' names for the root blocks). */
export const LAYOUT_BLOCKS = BLOCKS.map((block) => block.slug as BlockSlug);
