import {
  FaqSection,
  Href,
  LogoCloudSection,
  MediaWithTextSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
  type SectionLink,
  type SectionSettings,
  type VideoSource,
} from "@shopblok/registry/contracts";
import type { z } from "zod";
import type { Media, Page } from "../../../payload-types";
import { languageLabel } from "../../../payload/locales";
import type { Market, MarketMap } from "../../markets/types";
import { resolveLink, type InternalPaths, type LinkValue } from "../link";
import { mediaImage } from "../shell";
import { parseVideoUrl } from "../video";

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
};

/** A block resolved for its section; `key` is the block's id, for React's list. */
export type ResolvedBlock = { key: string } & (
  | { blockType: "richText"; section: RichTextSection; content: LexicalState }
  | { blockType: "mediaWithText"; section: MediaWithTextSection; content: LexicalState | null }
  | { blockType: "uspBar"; section: UspBarSection }
  | { blockType: "logoCloud"; section: LogoCloudSection }
  | { blockType: "faq"; section: FaqSection }
  | { blockType: "testimonials"; section: TestimonialsSection }
  | { blockType: "video"; section: VideoSection }
  | { blockType: "spacer"; section: SpacerSection }
);

type Defined<T> = { [K in keyof T]: Exclude<T[K], null> };

/** Drops the nulls Payload stores for an empty field, so `undefined` means "the default". */
function defined<T extends Record<string, unknown>>(
  value: T | null | undefined,
): Partial<Defined<T>> {
  if (value == null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, each]) => each !== null && each !== undefined && each !== ""),
  ) as Partial<Defined<T>>;
}

const text = (value: string | null | undefined): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const SETTINGS = ["anchor", "spacing", "surface", "container", "visibility"] as const;

/** The settings an editor set, and only those: no key for the rest, so a section's own default holds. */
function settingsOf(block: { sectionSettings?: Record<string, unknown> | null }): SectionSettings {
  const set = defined(block.sectionSettings);
  return Object.fromEntries(
    SETTINGS.flatMap((key) => (set[key] === undefined ? [] : [[key, set[key]]])),
  ) as SectionSettings;
}

/** A blank line ends a paragraph: LF or CRLF (a textarea sends CRLF), spaces on it allowed. */
export function paragraphs(value: string): string[] {
  return value
    .split(/\r?\n[^\S\r\n]*(?:\r?\n[^\S\r\n]*)+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

/** A `link` field as a section's call to action, or none (nowhere to go, no label, not a page). */
export function sectionLink(
  value: LinkValue | null | undefined,
  context: ResolveContext,
): SectionLink | undefined {
  const resolved = resolveLink(value, context);
  const label = text(resolved?.label);
  // `mailto:` and `tel:` are links the field allows, but not a section's call to action (`Href`).
  if (resolved === null || label === undefined || !Href.safeParse(resolved.href).success)
    return undefined;
  return {
    label,
    href: resolved.href,
    ...(resolved.newTab ? { external: true } : {}),
    ...(resolved.appearance === null
      ? {}
      : { appearance: resolved.appearance as SectionLink["appearance"] }),
  };
}

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

/** The section's view model, parsed with its contract, or `undefined` when it does not parse. */
function parsed<T extends z.ZodType>(contract: T, candidate: unknown): z.infer<T> | undefined {
  const result = contract.safeParse(candidate);
  return result.success ? result.data : undefined;
}

/** One block of a page's layout as its section's view model, or `null` when it cannot be drawn. */
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

/** A page's layout, resolved: the blocks that can be drawn, in the editor's order. */
export function resolveLayout(
  layout: Page["layout"] | undefined,
  context: ResolveContext,
): ResolvedBlock[] {
  return (layout ?? []).flatMap((block) => resolveBlock(block, context) ?? []);
}
