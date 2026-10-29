import type {
  FaqSection,
  FormBlockSection,
  Image,
  LogoCloudSection,
  MediaWithTextSection,
  NewsletterSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
} from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { copies } from "../commerce/copy";
import { fixtureImage } from "../commerce/images";
import {
  designSystemFixtures,
  designSystemLocales,
  type DesignSystemLocale,
} from "../design-system";
import { sectionCopies } from "./copy";

// The sections' fixtures (T63, D79): one view model per content block in each DS locale, as
// `RenderBlocks` would hand it to the section after resolving a page's blocks, and a `long` one
// where the block has text that can break a layout. Links are the market's own (its prefix);
// pictures are `fixtureImage`'s data URIs and the logos are drawn here, so nothing is fetched.
// The rich text is not a contract (Lexical is the storefront's): `richText.body` is the sample a
// story draws as the section's children. The FAQ and the testimonials reuse the commerce
// fixtures' questions and reviews.

/** The sample rich text a story draws: a heading, two paragraphs, a list and a link. */
export type RichTextSample = {
  heading: string;
  paragraphs: readonly string[];
  list: readonly string[];
  link: { label: string; href: string };
};

export type SectionFixtures = {
  richText: { section: RichTextSection; body: RichTextSample };
  mediaWithText: {
    section: MediaWithTextSection;
    body: readonly string[];
    long: MediaWithTextSection;
  };
  uspBar: { section: UspBarSection; long: UspBarSection };
  logoCloud: { section: LogoCloudSection };
  faq: { section: FaqSection; long: FaqSection };
  testimonials: { section: TestimonialsSection; long: TestimonialsSection };
  /** An embed (the live render), an upload with captions in the four languages, a long title. */
  video: { embed: VideoSection; file: VideoSection; long: VideoSection };
  spacer: { section: SpacerSection };
  /** The newsletter with the editor's words, and with a heading that wraps (T67). */
  newsletter: { section: NewsletterSection; long: NewsletterSection };
  /**
   * A contact form (T67): every kind of field, two halves on a row, the editor's note between the
   * fields (`note`, drawn as the `message` field's text) and the confirmation the form shows when it
   * is sent; `long` has a label that wraps.
   */
  formBlock: {
    section: FormBlockSection;
    note: string;
    confirmation: string;
    long: FormBlockSection;
  };
};

/** The press and brands of the logo cloud: names, so they are not translated. */
const brands = [
  "Northwind Weekly",
  "Atelier Review",
  "Fabric & Form",
  "The Daily Thread",
  "Kiko Journal",
  "Outdoor Quarterly",
] as const;

/**
 * A logo as a data-URI SVG: a mark (a disc, a square or a diamond) and three bars in place of a
 * wordmark, in the muted grey a logo cloud draws its logos in, 160 × 64. Its alternative text is
 * the brand's name, so the picture needs no words of its own.
 */
export function fixtureLogo(seed: number, name: string): Image {
  const width = 160;
  const height = 64;
  const fill = "#737373";
  const marks = [
    `<circle cx="28" cy="32" r="14" fill="${fill}"/>`,
    `<rect x="14" y="18" width="28" height="28" rx="4" fill="${fill}"/>`,
    `<path d="M28 16L44 32L28 48L12 32Z" fill="${fill}"/>`,
  ];
  const bar = (y: number, length: number) =>
    `<rect x="54" y="${y}" width="${length}" height="6" rx="3" fill="${fill}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `${marks[seed % marks.length]}${bar(20, 70 + ((seed * 13) % 26))}${bar(31, 88)}${bar(42, 52 + ((seed * 7) % 30))}</svg>`;
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt: name, width, height };
}

/** A WebVTT file as a data URI: two cues, so a player has captions to show without a request. */
function captions(text: string): string {
  const vtt = `WEBVTT\n\n00:00.000 --> 00:04.000\n${text}\n\n00:04.000 --> 00:08.000\n…\n`;
  return `data:text/vtt,${encodeURIComponent(vtt)}`;
}

/** An empty MP4 as a data URI: the DS's player never plays (its `preload` is `none`). */
const SAMPLE_VIDEO = "data:video/mp4;base64,";

function build(locale: DesignSystemLocale): SectionFixtures {
  const words = sectionCopies[locale];
  const { prefix, site } = commerceFixtures[locale];
  const href = (path: string) => `${prefix}${path}`;
  const reviews = copies[locale].reviews;

  const usp = words.usp;
  const quotes = reviews.slice(0, 3).map((review, index) => ({
    id: `review-${index + 1}`,
    quote: review.body,
    author: review.author,
    role: words.testimonials.roles[index],
    rating: [5, 4, 5][index],
  }));
  const longest = [...reviews].sort((a, b) => b.body.length - a.body.length)[0];
  if (longest === undefined) throw new Error("The commerce copy has no review");

  const poster = fixtureImage({ seed: 11, ratio: "16:9", alt: words.video.poster });
  const embed: VideoSection = {
    heading: words.video.heading,
    title: words.video.title,
    caption: words.video.caption,
    poster,
    // Big Buck Bunny (CC BY 3.0, the Blender Foundation): an id that exists, never loaded in the DS.
    source: { kind: "embed", provider: "youtube", videoId: "aqz-KE-bpKQ" },
  };

  const mediaWithText: MediaWithTextSection = {
    heading: words.mediaWithText.heading,
    image: fixtureImage({ seed: 3, ratio: "4:3", alt: words.mediaWithText.alt }),
    imageSide: "end",
    links: [
      { label: words.mediaWithText.primary, href: href("/collections/heritage") },
      {
        label: words.mediaWithText.secondary,
        href: href("/pages/how-it-is-made"),
        appearance: "outline",
      },
    ],
  };

  const form = words.form;
  const contact: FormBlockSection = {
    heading: form.heading,
    intro: form.intro,
    form: {
      id: "contact",
      submitLabel: form.submit,
      fields: [
        {
          kind: "text",
          name: "name",
          label: form.name,
          required: true,
          width: "half",
        },
        {
          kind: "email",
          name: "email",
          label: form.email,
          required: true,
          width: "half",
        },
        {
          kind: "select",
          name: "topic",
          label: form.topic,
          required: false,
          width: "half",
          options: form.topics.map((label, index) => ({
            label,
            value: ["order", "returns", "other"][index] ?? "other",
          })),
        },
        {
          kind: "text",
          name: "order",
          label: form.order,
          required: false,
          width: "half",
        },
        {
          kind: "textarea",
          name: "message",
          label: form.message,
          required: true,
          width: "full",
        },
        { kind: "message", id: "note" },
        {
          kind: "checkbox",
          name: "consent",
          label: form.consent,
          required: true,
          width: "full",
          defaultChecked: false,
        },
      ],
    },
  };
  const newsletter: NewsletterSection = {
    heading: words.newsletter.heading,
    text: words.newsletter.text,
    newsletter: commerceFixtures[locale].marketing.newsletter.empty,
  };

  return {
    richText: {
      section: {},
      body: {
        heading: words.richText.heading,
        paragraphs: words.richText.paragraphs,
        list: words.richText.list,
        link: { label: words.richText.linkLabel, href: href("/pages/care") },
      },
    },
    mediaWithText: {
      section: mediaWithText,
      body: words.mediaWithText.paragraphs,
      long: { ...mediaWithText, heading: words.mediaWithText.longHeading, imageSide: "start" },
    },
    uspBar: {
      section: {
        items: [
          { icon: "delivery", ...usp.delivery },
          { icon: "returns", ...usp.returns },
          { icon: "secure", ...usp.secure },
          { icon: "support", ...usp.support },
        ],
      },
      long: {
        items: [
          { icon: "sustainable", ...usp.long },
          { icon: "returns", ...usp.returns },
          { icon: "quality", title: usp.secure.title },
        ],
      },
    },
    logoCloud: {
      section: {
        heading: words.logoCloud.heading,
        logos: brands.map((name, index) => ({
          id: `logo-${index + 1}`,
          name,
          image: fixtureLogo(index, name),
          ...(index < 2 ? { href: `https://press.example/${index + 1}` } : {}),
        })),
      },
    },
    faq: {
      section: {
        heading: words.faq.heading,
        items: site.faq.items.map(({ value, title, answer }) => ({ value, title, answer })),
      },
      long: {
        heading: words.faq.heading,
        items: [site.faq.long, ...site.faq.items.slice(0, 1)].map(({ value, title, answer }) => ({
          value,
          title,
          answer,
        })),
      },
    },
    testimonials: {
      section: { heading: words.testimonials.heading, quotes },
      long: {
        heading: words.testimonials.heading,
        quotes: [
          {
            id: "review-long",
            quote: longest.body,
            author: designSystemFixtures[locale].long.personName,
            role: words.testimonials.roles[2],
            rating: 4,
          },
        ],
      },
    },
    video: {
      embed,
      file: {
        heading: words.video.heading,
        title: words.video.title,
        poster,
        source: {
          kind: "file",
          src: SAMPLE_VIDEO,
          type: "video/mp4",
          tracks: designSystemLocales.map((language) => ({
            src: captions(words.video.caption),
            srclang: language,
            label: words.video.tracks[language],
          })),
        },
      },
      long: { ...embed, title: words.video.longTitle },
    },
    spacer: { section: { size: "medium", divider: true } },
    newsletter: {
      section: newsletter,
      long: {
        ...newsletter,
        heading: words.newsletter.longHeading,
        newsletter: commerceFixtures[locale].marketing.newsletter.long,
      },
    },
    formBlock: {
      section: contact,
      note: form.note,
      confirmation: form.confirmation,
      long: {
        ...contact,
        form: {
          ...contact.form,
          fields: contact.form.fields.map((field) =>
            field.kind === "text" && field.name === "order"
              ? { ...field, label: form.longLabel }
              : field,
          ),
        },
      },
    },
  };
}

/** The sections' fixtures in each DS locale (T63). */
export const sectionFixtures: Record<DesignSystemLocale, SectionFixtures> = {
  en: build("en"),
  el: build("el"),
  de: build("de"),
  fr: build("fr"),
};
