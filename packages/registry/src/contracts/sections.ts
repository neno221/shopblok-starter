import { z } from "zod";
import { Href, Id, Link } from "./content";
import { Image } from "./image";
import { AccordionSection } from "./site";

// The sections' view models (D70, D79): what each of SPEC §7.4's blocks shows, once Payload's
// content has been resolved for the market (links as `href`s, uploads as images). Text is the
// editor's, in the page's language; the sections' fixed words ("Play video") are copy (D43). A
// block's rich text is not here: the storefront renders Lexical and passes it as the section's
// `children`, so the registry and `@shopblok/ui` stay free of Payload.

/** The space above and below a section (SPEC §7.4, `sectionSettings`). */
export const SECTION_SPACINGS = ["none", "small", "medium", "large"] as const;
/** The surfaces a section sits on; the theme's tokens decide what each looks like. */
export const SECTION_SURFACES = ["default", "muted", "inverse"] as const;
/** How wide the content runs. */
export const SECTION_CONTAINERS = ["narrow", "default", "wide", "full"] as const;
/** Where a section shows: everywhere, or only below or from the `lg` breakpoint. */
export const SECTION_VISIBILITIES = ["all", "mobile", "desktop"] as const;

/** A section's anchor: an `id` a link can jump to. */
export const ANCHOR_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Every block's `sectionSettings` (SPEC §7.4); a missing one is the field's default. */
export const SectionSettings = z
  .object({
    anchor: z
      .string()
      .regex(ANCHOR_PATTERN, "lower-case letters, digits and hyphens")
      .optional()
      .describe("The section's id, for a link to #anchor"),
    spacing: z.enum(SECTION_SPACINGS).optional().describe('Default "medium"'),
    surface: z.enum(SECTION_SURFACES).optional().describe('Default "default"'),
    container: z.enum(SECTION_CONTAINERS).optional().describe('Default "default"'),
    visibility: z.enum(SECTION_VISIBILITIES).optional().describe('Default "all"'),
  })
  .describe("Anchor, spacing, surface, container and visibility");

/** A call to action: a link, drawn as a button (`default`, `outline`) or as a text link. */
export const SectionLink = Link.extend({
  appearance: z.enum(["default", "outline", "text"]).optional().describe('Default "default"'),
});

const heading = z.string().min(1).optional().describe("The section's heading (an h2)");
const settings = SectionSettings.optional();

/** `richText`: the editor's text alone; the text itself is the section's `children`. */
export const RichTextSection = z.object({ settings });

/** `mediaWithText`: a picture beside the text, on the side the editor picks, and up to two links. */
export const MediaWithTextSection = z.object({
  settings,
  heading,
  image: Image,
  imageSide: z
    .enum(["start", "end"])
    .describe("The picture's side from `lg` up; above the text below it"),
  links: z.array(SectionLink).max(2),
});

/** The icons a USP item may show: what shops promise most. */
export const USP_ICONS = [
  "delivery",
  "returns",
  "secure",
  "support",
  "sustainable",
  "gift",
  "quality",
  "fast",
] as const;

/** `uspBar`: two to six promises in a row (free delivery, returns…). */
export const UspBarSection = z.object({
  settings,
  items: z
    .array(
      z.object({
        icon: z.enum(USP_ICONS),
        title: z.string().min(1),
        text: z.string().min(1).optional(),
      }),
    )
    .min(1)
    .max(6),
});

/** `logoCloud`: the brands a shop sells or the press that wrote about it, each a picture. */
export const LogoCloudSection = z.object({
  settings,
  heading,
  logos: z
    .array(
      z.object({
        id: Id,
        /** The brand's name: the logo's alternative text. */
        name: z.string().min(1),
        image: Image,
        href: Href.optional().describe("The brand's page"),
      }),
    )
    .min(1)
    .max(24),
});

/** One question and its answer in paragraphs (the answer is also the JSON-LD's text). */
export const FaqItem = AccordionSection.extend({ answer: z.array(z.string().min(1)).min(1) });

/** `faq`: questions in an accordion; the page's FAQs together are its `FAQPage` JSON-LD. */
export const FaqSection = z.object({ settings, heading, items: z.array(FaqItem).min(1) });

/** One customer's words. */
export const Testimonial = z.object({
  id: Id,
  quote: z.string().min(1),
  author: z.string().min(1),
  role: z.string().min(1).optional().describe("Where the author is from, or what they bought"),
  rating: z.int().min(1).max(5).optional(),
  avatar: Image.optional(),
});

/** `testimonials`: quotes from customers, written in Payload until M8's reviews. */
export const TestimonialsSection = z.object({
  settings,
  heading,
  quotes: z.array(Testimonial).min(1).max(12),
});

/**
 * Where a video or its captions file is: Payload's file URL (absolute on the site's own origin, or a
 * path), or a data URI (the DS's fixtures, which fetch nothing).
 */
export const MediaSrc = z
  .string()
  .regex(
    /^(?:data:(?:video\/(?:mp4|webm)|text\/vtt)[;,]|https?:\/\/|\/(?!\/))/,
    "a path from /, an http(s) URL or a video or WebVTT data URI",
  )
  .describe("A path from /, an http(s) URL or a data URI");

/** A captions file for one language (WebVTT). */
export const VideoTrack = z.object({
  src: MediaSrc,
  /** ISO 639-1, the language of the captions. */
  srclang: z.string().regex(/^[a-z]{2}$/),
  label: z.string().min(1),
});

/** The two hosts an embed may come from, and nothing else (M7's CSP lists them). */
export const VIDEO_PROVIDERS = ["youtube", "vimeo"] as const;

/** What a video plays: an upload with its captions, or a YouTube or Vimeo video. */
export const VideoSource = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    src: MediaSrc,
    type: z.enum(["video/mp4", "video/webm"]),
    /** WCAG 1.2.2: an uploaded video has captions, at least in one language, one track each. */
    tracks: z
      .array(VideoTrack)
      .min(1)
      .refine(
        (tracks) => new Set(tracks.map((track) => track.srclang)).size === tracks.length,
        "one captions track per language",
      ),
  }),
  z.object({
    kind: z.literal("embed"),
    provider: z.enum(VIDEO_PROVIDERS),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
    /** An unlisted Vimeo video's privacy hash (`h=`), without which its player refuses it. */
    hash: z
      .string()
      .regex(/^[0-9a-f]{6,20}$/i)
      .optional(),
  }),
]);

/**
 * `video`: an upload, or an embed drawn as a poster with a play button: the player's frame, and
 * every request to its host, only after a click (D79).
 */
export const VideoSection = z.object({
  settings,
  heading,
  /** What the video is: the player's accessible name and the play button's. */
  title: z.string().min(1),
  caption: z.string().min(1).optional(),
  poster: Image.optional(),
  source: VideoSource,
});

/** `spacer`: room between two sections, with a line or without. */
export const SpacerSection = z.object({
  settings,
  size: z.enum(["small", "medium", "large"]),
  divider: z.boolean(),
});

export type SectionSettings = z.infer<typeof SectionSettings>;
export type SectionLink = z.infer<typeof SectionLink>;
export type RichTextSection = z.infer<typeof RichTextSection>;
export type MediaWithTextSection = z.infer<typeof MediaWithTextSection>;
export type UspIcon = (typeof USP_ICONS)[number];
export type UspBarSection = z.infer<typeof UspBarSection>;
export type LogoCloudSection = z.infer<typeof LogoCloudSection>;
export type FaqItem = z.infer<typeof FaqItem>;
export type FaqSection = z.infer<typeof FaqSection>;
export type Testimonial = z.infer<typeof Testimonial>;
export type TestimonialsSection = z.infer<typeof TestimonialsSection>;
export type VideoTrack = z.infer<typeof VideoTrack>;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];
export type VideoSource = z.infer<typeof VideoSource>;
export type VideoSection = z.infer<typeof VideoSection>;
export type SpacerSection = z.infer<typeof SpacerSection>;
