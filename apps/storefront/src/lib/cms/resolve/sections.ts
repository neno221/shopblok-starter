import {
  FaqSection,
  LogoCloudSection,
  MediaWithTextSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
  type VideoSource,
} from "@shopblok/registry/contracts";
import type { Media, Page } from "../../../payload-types";
import { languageLabel } from "../../../payload/locales";
import type { Market, MarketMap } from "../../markets/types";
import type { InternalPaths, LinkValue } from "../link";
import { mediaImage } from "../shell";
import { parseVideoUrl } from "../video";
import {
  COMMERCE_BLOCKS,
  resolveCommerceBlock,
  type CommerceBlockType,
  type CommerceContext,
  type ResolvedCommerceBlock,
} from "./commerce";
import { paragraphs, parsed, sectionLink, settingsOf, text } from "./shared";

export { paragraphs, sectionLink };

// SPEC §7.5's resolution rule for the content blocks (D70, T63): a block of `pages.layout`, as
// Payload stores it (references, uploads at depth 1), becomes its section's view model for the
// market: links to the market's URLs, uploads to images and files, and the rest as written. Each
// view model is parsed with its contract (D41), so a block an editor left half-done (a logo without
// its picture, a video whose address is not YouTube's or Vimeo's) is left out of the page, not
// drawn broken; a link that cannot be resolved is left out of its block. The rich text stays
// Lexical's: `RenderBlocks` renders it, with this module's link rule.

/** A block of a page's layout. */
export type LayoutBlock = NonNullable<Page["layout"]>[number];
/** A block's Lexical state, as Payload stores it. */
export type LexicalState = NonNullable<Extract<LayoutBlock, { blockType: "richText" }>["content"]>;

/** What the links and the uploads resolve against. */
export type ResolveContext = {
  market: Market;
  map: MarketMap;
  /** The internal paths; `CMS_PATHS` unless the page has the category tree (`shellPaths`). */
  paths?: InternalPaths;
  /**
   * The market's catalog, for the commerce blocks (T64); without it they are left out (a page
   * read where Medusa is not, such as a build without it).
   */
  commerce?: CommerceContext;
};

/** A block resolved for its section; `key` is the block's id, for React's list. */
export type ResolvedBlock =
  | ({ key: string } & (
      | { blockType: "richText"; section: RichTextSection; content: LexicalState }
      | { blockType: "mediaWithText"; section: MediaWithTextSection; content: LexicalState | null }
      | { blockType: "uspBar"; section: UspBarSection }
      | { blockType: "logoCloud"; section: LogoCloudSection }
      | { blockType: "faq"; section: FaqSection }
      | { blockType: "testimonials"; section: TestimonialsSection }
      | { blockType: "video"; section: VideoSection }
      | { blockType: "spacer"; section: SpacerSection }
    ))
  | ResolvedCommerceBlock;

const mediaOf = (value: unknown): Media | undefined =>
  value !== null && typeof value === "object" ? (value as Media) : undefined;

/** An uploaded file's URL, when it is of one of `types`. */
function fileOf(
  value: unknown,
  types: readonly string[],
): { url: string; type: string } | undefined {
  const media = mediaOf(value);
  const url = text(media?.url);
  const type = media?.mimeType ?? "";
  return url !== undefined && types.includes(type) ? { url, type } : undefined;
}

function videoSource(block: Extract<LayoutBlock, { blockType: "video" }>): VideoSource | undefined {
  if (block.source === "embed") {
    const parsed = parseVideoUrl(block.url ?? "");
    return parsed === null ? undefined : { kind: "embed", ...parsed };
  }
  const file = fileOf(block.file, ["video/mp4", "video/webm"]);
  if (file === undefined) return undefined;
  // One track per language, the first of a language a draft holds twice (the block refuses it on
  // save, PR 95 review item 6).
  const seen = new Set<string>();
  const tracks = (block.captions ?? []).flatMap((row) => {
    const vtt = fileOf(row.file, ["text/vtt"]);
    if (vtt === undefined || seen.has(row.language)) return [];
    seen.add(row.language);
    return [{ src: vtt.url, srclang: row.language, label: languageLabel(row.language) }];
  });
  return { kind: "file", src: file.url, type: file.type as "video/mp4" | "video/webm", tracks };
}

/**
 * One content block of a page's layout as its section's view model, or `null` when it cannot be
 * drawn. A commerce block reads Medusa: `resolveLayout` resolves it.
 */
export function resolveBlock(block: LayoutBlock, context: ResolveContext): ResolvedBlock | null {
  const key = block.id ?? `${block.blockType}`;
  const settings = settingsOf(block);
  switch (block.blockType) {
    case "richText": {
      const section = parsed(RichTextSection, { settings });
      return section === undefined
        ? null
        : { key, blockType: "richText", section, content: block.content };
    }
    case "mediaWithText": {
      const section = parsed(MediaWithTextSection, {
        settings,
        heading: text(block.heading),
        image: mediaImage(block.media),
        imageSide: block.imageSide,
        links: (block.links ?? []).flatMap(
          (row) => sectionLink(row.link as LinkValue, context) ?? [],
        ),
      });
      return section === undefined
        ? null
        : { key, blockType: "mediaWithText", section, content: block.content ?? null };
    }
    case "uspBar": {
      const section = parsed(UspBarSection, {
        settings,
        items: (block.items ?? []).map((item) => ({
          icon: item.icon,
          title: item.title,
          text: text(item.text),
        })),
      });
      return section === undefined ? null : { key, blockType: "uspBar", section };
    }
    case "logoCloud": {
      const section = parsed(LogoCloudSection, {
        settings,
        heading: text(block.heading),
        logos: (block.logos ?? []).flatMap((logo, index) => {
          const image = mediaImage(logo.image);
          if (image === undefined) return [];
          const href = text(logo.url);
          return [
            {
              id: logo.id ?? `logo-${index}`,
              name: logo.name,
              image: { ...image, alt: logo.name },
              ...(href !== undefined && href.startsWith("https://") ? { href } : {}),
            },
          ];
        }),
      });
      return section === undefined ? null : { key, blockType: "logoCloud", section };
    }
    case "faq": {
      const section = parsed(FaqSection, {
        settings,
        heading: text(block.heading),
        items: (block.items ?? []).map((item, index) => ({
          value: item.id ?? `question-${index}`,
          title: item.question,
          // A draft is saved before its required fields are filled (autosave): a row without its
          // answer has no paragraphs, so the contract leaves the block out instead of the page failing.
          answer: typeof item.answer === "string" ? paragraphs(item.answer) : [],
        })),
      });
      return section === undefined ? null : { key, blockType: "faq", section };
    }
    case "testimonials": {
      const section = parsed(TestimonialsSection, {
        settings,
        heading: text(block.heading),
        quotes: (block.quotes ?? []).map((quote, index) => ({
          id: quote.id ?? `quote-${index}`,
          quote: quote.quote,
          author: quote.author,
          role: text(quote.role),
          rating: quote.rating ?? undefined,
          avatar: mediaImage(quote.avatar),
        })),
      });
      return section === undefined ? null : { key, blockType: "testimonials", section };
    }
    case "video": {
      const section = parsed(VideoSection, {
        settings,
        heading: text(block.heading),
        title: block.title,
        caption: text(block.caption),
        poster: mediaImage(block.poster),
        source: videoSource(block),
      });
      return section === undefined ? null : { key, blockType: "video", section };
    }
    case "spacer": {
      const section = parsed(SpacerSection, {
        settings,
        size: block.size,
        divider: block.divider === true,
      });
      return section === undefined ? null : { key, blockType: "spacer", section };
    }
    default:
      return null;
  }
}

const isCommerce = (
  block: LayoutBlock,
): block is Extract<LayoutBlock, { blockType: CommerceBlockType }> =>
  (COMMERCE_BLOCKS as readonly string[]).includes(block.blockType);

/**
 * A page's layout, resolved: the blocks that can be drawn, in the editor's order. The commerce
 * blocks read the market's catalog at the same time (T64); without `context.commerce` they are
 * left out.
 */
export async function resolveLayout(
  layout: Page["layout"] | undefined,
  context: ResolveContext,
): Promise<ResolvedBlock[]> {
  const { commerce } = context;
  const resolved = await Promise.all(
    (layout ?? []).map((block) =>
      isCommerce(block)
        ? commerce === undefined
          ? null
          : resolveCommerceBlock(block, context, commerce)
        : resolveBlock(block, context),
    ),
  );
  return resolved.flatMap((block) => block ?? []);
}
