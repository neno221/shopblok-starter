import { z } from "zod";
import { Href, Id, IsoDateTime, Link } from "./content";
import { FORM_LIMITS } from "./form-limits";
import { Image } from "./image";
import { EmptyStateContent } from "./listing";
import { CategoryTile } from "./pages";
import { PriceSummary, ProductCard } from "./product";
import { AccordionSection, Countdown, DiscountCode, NewsletterSignup } from "./site";

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

// T64: the commerce blocks (D79). Their products and categories come from Medusa through a source
// (SPEC §7.5's `productSource` and `categorySource`), resolved on the server in the market's region
// and language, so a card's price is in the market's currency; Payload holds references only. The
// cards are ProductCard's (D46), the tiles M3's home's. A section with products never lists one
// twice.

const uniqueIds = (items: readonly { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

/** Products a section shows, each once. */
const products = (max: number) =>
  z.array(ProductCard).max(max).refine(uniqueIds, "a product is listed twice");

/** Text in paragraphs (an editor's blank line ends one). */
const text = z.array(z.string().min(1)).min(1).optional().describe("Paragraphs");

/**
 * `hero`: the page's opening band. An eyebrow, the heading, a line, up to two calls to action and
 * a picture beside them; optionally a countdown to an offer's end (D50: the server renders `now`)
 * and up to four products from a source.
 */
export const HeroSection = z.object({
  settings,
  eyebrow: z.string().min(1).optional().describe("A short line above the heading"),
  heading: z.string().min(1).describe("The hero's heading: the page's h1 when it opens the page"),
  subheading: z.string().min(1).optional(),
  image: Image.optional(),
  links: z.array(SectionLink).max(2),
  countdown: Countdown.optional(),
  products: products(4),
});

/** `categoryShowcase`: categories as tiles, a picture and a name each, from a `categorySource`. */
export const CategoryShowcaseSection = z.object({
  settings,
  heading,
  intro: z.string().min(1).optional(),
  link: SectionLink.optional(),
  tiles: z.array(CategoryTile).min(1).max(12),
});

/**
 * `productCollection`: products from a `productSource` as a grid or a carousel. With no product
 * the editor chose to say so (`emptyBehavior: message`), it draws `empty` instead.
 */
export const ProductCollectionSection = z
  .object({
    settings,
    heading: z.string().min(1).describe("The section's heading, which names the carousel"),
    intro: z.string().min(1).optional(),
    link: SectionLink.optional(),
    display: z.enum(["grid", "carousel"]),
    products: products(24),
    empty: EmptyStateContent.optional().describe("What it says when the source has no product"),
  })
  .refine(
    (section) => section.products.length > 0 || section.empty !== undefined,
    "no products and nothing to say instead",
  );

/** `featuredProduct`: one product, large, with the editor's words and picture. */
export const FeaturedProductSection = z.object({
  settings,
  heading,
  product: ProductCard,
  image: Image.describe("The editor's picture, or the product's first"),
  text,
});

/** `bundle`: products that go together, handpicked; no bundle price in v1 (D79). */
export const BundleSection = z.object({
  settings,
  heading: z.string().min(1),
  text,
  products: products(6).refine((list) => list.length >= 2, "a bundle has two products or more"),
});

/** `promoBanner`: an offer, with a code to copy (Medusa checks it at the cart) and its end. */
export const PromoBannerSection = z.object({
  settings,
  heading: z.string().min(1),
  text,
  code: DiscountCode.shape.code.optional(),
  terms: z.string().min(1).optional().describe("The small print"),
  endsAt: IsoDateTime.optional().describe("When the offer ends; past it the block is left out"),
  image: Image.optional(),
  link: SectionLink.optional(),
});

/** A product in a comparison's head: its name, its page, a picture and its price. */
export const ComparisonProduct = z.object({
  id: Id,
  title: z.string().min(1),
  href: Href,
  image: Image.optional(),
  price: PriceSummary,
});

/**
 * `comparison`: two to four handpicked products side by side, in a table: their prices, their
 * options' values and the `metadata` keys the editor names, one row each. A value a product does not
 * have is `null`.
 */
export const ComparisonSection = z
  .object({
    settings,
    heading: z.string().min(1).describe("The table's caption"),
    products: z
      .array(ComparisonProduct)
      .min(2)
      .max(4)
      .refine(uniqueIds, "a product is listed twice"),
    rows: z.array(
      z.object({ label: z.string().min(1), values: z.array(z.string().min(1).nullable()) }),
    ),
  })
  .refine(
    (table) => table.rows.every((row) => row.values.length === table.products.length),
    "a row has a value for each product",
  );

/** `collectionSpotlight`: a collection's picture and words beside a few of its products. */
export const CollectionSpotlightSection = z.object({
  settings,
  heading: z.string().min(1).describe("The editor's, or the collection's title"),
  text,
  image: Image.optional(),
  href: Href.describe("The collection's page"),
  products: products(8),
});

/**
 * `recentlyViewed`: the visitor's recently viewed products (ADR 0004: read in the browser). The
 * server knows only the heading; the island fills `products` from the browser's store and draws
 * nothing while it is empty.
 */
export const RecentlyViewedSection = z.object({
  settings,
  heading: z.string().min(1),
  products: products(8),
});

/** `newsletter`: the signup (NewsletterForm) as a section of its own, with the editor's words (D81). */
export const NewsletterSection = z.object({
  settings,
  heading: heading.describe("The form's heading; the catalog's “Join our newsletter” when empty"),
  text: z.string().min(1).optional().describe("The line under it; the catalog's when empty"),
  newsletter: NewsletterSignup,
});

/**
 * A form field's name (D81): what the form posts it under and the submission stores it as. Letters,
 * digits, `-` and `_`, starting with a letter, so it can never be one of Next's own fields
 * (`$ACTION_…`).
 */
export const FORM_FIELD_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

/** The kinds of field an editor may put in a form (D81): no payment, no upload. */
export const FORM_FIELD_KINDS = [
  "text",
  "textarea",
  "email",
  "select",
  "checkbox",
  "message",
] as const;

// The size limits live without zod, so a client component takes them without the contracts.
export { FORM_LIMITS };

const fieldBase = {
  name: z.string().regex(FORM_FIELD_NAME),
  label: z.string().min(1),
  required: z.boolean(),
  width: z.enum(["full", "half"]).describe("`half` shares a row with the next half from 28rem"),
};

/** One field of a form, as the section draws it; `message` is the editor's text between fields. */
export const FormField = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    ...fieldBase,
    defaultValue: z.string().optional(),
  }),
  z.object({
    kind: z.literal("textarea"),
    ...fieldBase,
    defaultValue: z.string().optional(),
  }),
  z.object({ kind: z.literal("email"), ...fieldBase }),
  z.object({
    kind: z.literal("select"),
    ...fieldBase,
    options: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1).max(FORM_LIMITS.option),
        }),
      )
      .min(1),
    defaultValue: z.string().optional(),
    placeholder: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal("checkbox"),
    ...fieldBase,
    defaultChecked: z.boolean(),
  }),
  z.object({
    kind: z.literal("message"),
    id: Id.describe("The key of its rendered text in the section's `messages`"),
  }),
]);

/**
 * `formBlock`: a form built in the admin (Payload's form builder, D81), posted to a server action.
 * Names are unique, so each answer has one place to go back to.
 */
export const FormBlockSection = z.object({
  settings,
  heading,
  intro: z.string().min(1).optional(),
  form: z.object({
    id: Id,
    fields: z
      .array(FormField)
      .min(1)
      .max(FORM_LIMITS.fields)
      .refine((fields) => fields.some((field) => field.kind !== "message"), "a field to fill in")
      .refine((fields) => {
        const names = fields.flatMap((field) => (field.kind === "message" ? [] : [field.name]));
        return new Set(names).size === names.length;
      }, "each name once"),
    submitLabel: z.string().min(1).optional().describe("The catalog's “Send” when empty"),
  }),
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
export type HeroSection = z.infer<typeof HeroSection>;
export type CategoryShowcaseSection = z.infer<typeof CategoryShowcaseSection>;
export type ProductCollectionSection = z.infer<typeof ProductCollectionSection>;
export type FeaturedProductSection = z.infer<typeof FeaturedProductSection>;
export type BundleSection = z.infer<typeof BundleSection>;
export type PromoBannerSection = z.infer<typeof PromoBannerSection>;
export type ComparisonProduct = z.infer<typeof ComparisonProduct>;
export type ComparisonSection = z.infer<typeof ComparisonSection>;
export type CollectionSpotlightSection = z.infer<typeof CollectionSpotlightSection>;
export type RecentlyViewedSection = z.infer<typeof RecentlyViewedSection>;
export type NewsletterSection = z.infer<typeof NewsletterSection>;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];
export type FormField = z.infer<typeof FormField>;
export type FormBlockSection = z.infer<typeof FormBlockSection>;
