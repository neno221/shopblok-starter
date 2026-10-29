// Ours (T63, SETUP.md "Blocks (T63)"; D70, D79). The stories of the Sections: SPEC §7.4's blocks as
// a page draws them, each across the frame's width (`stack`). The view models are
// `sectionFixtures[ctx.locale]`, the fixed words `catalogs[ctx.locale]` through `sectionsCopy`, and
// the rich text, which the storefront renders from Lexical, is drawn here from the fixtures' sample
// as plain elements. The states show the settings an editor changes most (the surface, the side of
// the picture) and the long texts. Every link is drawn with `prefetch={false}`. The entry page
// adds the block's Payload fields (`components/block-table.tsx`).
import { commerceFixtures, sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { SectionSettings } from "@shopblok/registry/contracts";
import { FaqSection } from "@shopblok/ui/sections/faq";
import { FormBlockSection, type FormBlockSectionProps } from "@shopblok/ui/sections/form-block";
import { LogoCloudSection } from "@shopblok/ui/sections/logo-cloud";
import { MediaWithTextSection } from "@shopblok/ui/sections/media-with-text";
import { NewsletterSection } from "@shopblok/ui/sections/newsletter";
import { RichTextSection } from "@shopblok/ui/sections/rich-text";
import { sectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SpacerSection } from "@shopblok/ui/sections/spacer";
import { TestimonialsSection } from "@shopblok/ui/sections/testimonials";
import { UspBarSection } from "@shopblok/ui/sections/usp-bar";
import { VideoSection } from "@shopblok/ui/sections/video";
import type { DsContext, DsStory } from "../types";

const fixtures = (ctx: DsContext) => sectionFixtures[ctx.locale];
const copy = (ctx: DsContext) => sectionsCopy(catalogs[ctx.locale]);
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;
const commerce = (ctx: DsContext) => commerceFixtures[ctx.locale];

const muted: SectionSettings = { surface: "muted" };
const inverse: SectionSettings = { surface: "inverse" };

/** The sample rich text: a heading, a paragraph, a list and a paragraph with a link in it. */
function sampleText(ctx: DsContext) {
  const { heading, paragraphs, list, link } = fixtures(ctx).richText.body;
  return (
    <>
      <h2>{heading}</h2>
      <p>{paragraphs[0]}</p>
      <ul>
        {list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        {paragraphs[1]} <a href={link.href}>{link.label}</a>.
      </p>
    </>
  );
}

function richText(ctx: DsContext, settings?: SectionSettings) {
  return <RichTextSection settings={settings}>{sampleText(ctx)}</RichTextSection>;
}

function mediaWithText(ctx: DsContext, which: "section" | "long", settings?: SectionSettings) {
  const { body, ...samples } = fixtures(ctx).mediaWithText;
  return (
    <MediaWithTextSection {...samples[which]} settings={settings} copy={copy(ctx)} prefetch={false}>
      {body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </MediaWithTextSection>
  );
}

function faq(
  ctx: DsContext,
  which: "section" | "long",
  open: "none" | "first",
  settings?: SectionSettings,
) {
  const section = fixtures(ctx).faq[which];
  const first = section.items[0]?.value;
  return (
    <FaqSection
      {...section}
      settings={settings}
      defaultOpen={open === "first" && first !== undefined ? [first] : []}
    />
  );
}

function video(ctx: DsContext, which: "embed" | "file" | "long", settings?: SectionSettings) {
  const section = fixtures(ctx).video[which];
  return <VideoSection {...section} settings={settings} copy={copy(ctx)} locale={lang(ctx)} />;
}

function newsletter(
  ctx: DsContext,
  which: "section" | "long",
  status?: "sending" | "done" | "error",
  settings?: SectionSettings,
) {
  const section = fixtures(ctx).newsletter[which];
  const typed = commerce(ctx).marketing.newsletter.typed;
  return (
    <NewsletterSection
      {...section}
      newsletter={
        status === undefined ? section.newsletter : { ...section.newsletter, email: typed.email }
      }
      settings={settings}
      status={status}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

/** The contact form, with its note between the fields; `state` is the action's answer. */
function contactForm(
  ctx: DsContext,
  which: "section" | "long",
  state: Pick<FormBlockSectionProps, "status" | "errors" | "values" | "settings"> = {},
) {
  const { note, confirmation, ...samples } = fixtures(ctx).formBlock;
  return (
    <FormBlockSection
      {...samples[which]}
      {...state}
      copy={copy(ctx)}
      messages={{ note: <p>{note}</p> }}
      confirmation={<p>{confirmation}</p>}
    />
  );
}

export const sectionStories = {
  "sections/rich-text": {
    summary:
      "The editor's text in the page's column: headings from h2, paragraphs, lists, quotes and links, which the storefront renders from the block's Lexical field.",
    a11y: [
      "The text starts at h2 (the editor offers h2 to h4), so the page's h1 stays its title.",
      "Links sit in running text, underlined, with the focus ring at full strength; WCAG 2.5.8's inline exception spares them the 44 px.",
      "An internal link points at the current market's URL; a custom one that is not a path, https, mailto or tel is drawn as text.",
    ],
    live: (ctx) => richText(ctx),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface",
        description: "`surface: muted`: the section on the muted fill, the text unchanged.",
        render: (ctx) => richText(ctx, muted),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the theme turned over; the link keeps its contrast.",
        render: (ctx) => richText(ctx, inverse),
      },
      {
        id: "narrow",
        label: "Narrow, small spacing",
        description: "`container: narrow`, `spacing: small`.",
        render: (ctx) => richText(ctx, { container: "narrow", spacing: "small" }),
      },
    ],
  },
  "sections/media-with-text": {
    summary:
      "A picture beside a heading, the editor's text and up to two links; the picture's side is the editor's, and on a phone it comes first.",
    a11y: [
      "The picture has the editor's alternative text; the heading is an h2.",
      "The links are 44 px buttons (or a 44 px text link), in a list; one to another site opens in a new tab and says so.",
      "The order in the markup is the reading order at every width: the side is set with CSS order from lg up.",
    ],
    live: (ctx) => mediaWithText(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "start",
        label: "Picture first, long heading",
        description: "`imageSide: start` and a heading that wraps over several lines.",
        render: (ctx) => mediaWithText(ctx, "long"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "The buttons swap their colours with the theme.",
        render: (ctx) => mediaWithText(ctx, "section", inverse),
      },
    ],
  },
  "sections/usp-bar": {
    summary:
      "The shop's promises in a row: an icon and a short title each, with a line under it; up to six, at most four across.",
    a11y: [
      "A list: a screen reader says how many promises there are.",
      "The icons are decoration (aria-hidden); the title says what each promise is.",
    ],
    live: (ctx) => <UspBarSection {...fixtures(ctx).uspBar.section} />,
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long text, three items",
        description: "Three columns from lg up; a long title and line wrap.",
        render: (ctx) => <UspBarSection {...fixtures(ctx).uspBar.long} />,
      },
      {
        id: "muted",
        label: "Muted surface, small spacing",
        description: "As a band under the header: `surface: muted`, `spacing: small`.",
        render: (ctx) => (
          <UspBarSection
            {...fixtures(ctx).uspBar.section}
            settings={{ surface: "muted", spacing: "small" }}
          />
        ),
      },
    ],
  },
  "sections/logo-cloud": {
    summary:
      "Logos in rows that wrap and centre: the brands a shop sells or the press that wrote about it.",
    a11y: [
      "Each logo's alternative text is the brand's name.",
      "A logo with a link is a 44 px target that opens the brand's site in a new tab, and says so.",
    ],
    live: (ctx) => <LogoCloudSection {...fixtures(ctx).logoCloud.section} copy={copy(ctx)} />,
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface, no heading",
        description: "`surface: muted`, and the heading left empty.",
        render: (ctx) => {
          const { heading: _heading, ...section } = fixtures(ctx).logoCloud.section;
          return <LogoCloudSection {...section} settings={muted} copy={copy(ctx)} />;
        },
      },
    ],
  },
  "sections/faq": {
    summary:
      "Questions that open to their answers, as native disclosures that work without JavaScript; the page's FAQs are its FAQPage JSON-LD.",
    a11y: [
      "Each question is a summary of a details element: a 44 px row that opens with Enter or Space, and announces whether it is open.",
      "Any number of questions may be open at once; the browser's find-in-page opens the one that holds a match.",
      "The answers are text, so the same words are the JSON-LD's acceptedAnswer.",
    ],
    live: (ctx) => faq(ctx, "section", "none"),
    statesLayout: "stack",
    states: [
      {
        id: "open",
        label: "One open",
        description: "The first question open: its chevron turned, its answer below.",
        render: (ctx) => faq(ctx, "section", "first"),
      },
      {
        id: "long",
        label: "Long question, open",
        description: "A long question wraps beside its chevron; the answer keeps its paragraphs.",
        render: (ctx) => faq(ctx, "long", "first"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`, the first question open.",
        render: (ctx) => faq(ctx, "section", "first", inverse),
      },
    ],
  },
  "sections/testimonials": {
    summary:
      "Customers' words in cards: the stars, the quote and who said it. Written in Payload until M8's reviews.",
    a11y: [
      "Each card is a figure: the quote is a blockquote, its author the figcaption.",
      'The stars are one image named "4 out of 5" in the page\'s language.',
      "An author's picture is decoration: their name is beside it.",
    ],
    live: (ctx) => (
      <TestimonialsSection
        {...fixtures(ctx).testimonials.section}
        copy={copy(ctx)}
        locale={lang(ctx)}
      />
    ),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "One long quote",
        description: "A single card across the column, a long quote and a long name.",
        render: (ctx) => (
          <TestimonialsSection
            {...fixtures(ctx).testimonials.long}
            copy={copy(ctx)}
            locale={lang(ctx)}
          />
        ),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The cards on the muted fill.",
        render: (ctx) => (
          <TestimonialsSection
            {...fixtures(ctx).testimonials.section}
            settings={muted}
            copy={copy(ctx)}
            locale={lang(ctx)}
          />
        ),
      },
    ],
  },
  "sections/video": {
    summary:
      "A YouTube or Vimeo video as the shop's poster and a play button, loaded only after a click; or an upload in the browser's player, with captions per language.",
    a11y: [
      'The play button is named "Play video: {title}"; after the click the player\'s frame takes the focus, titled by the video.',
      "Nothing moves by itself (WCAG 2.2.2): no autoplay before the click, and an upload loads nothing before play.",
      "An upload has a captions track per language (WCAG 1.2.2), the page's language on by default.",
      "Nothing is requested from YouTube or Vimeo before the click; a line names where the video plays from.",
    ],
    live: (ctx) => video(ctx, "embed"),
    statesLayout: "stack",
    states: [
      {
        id: "file",
        label: "An upload",
        description: "The browser's player with the poster, and captions in four languages.",
        render: (ctx) => video(ctx, "file"),
      },
      {
        id: "long",
        label: "Long title, no poster, muted",
        description: "Without a poster the button sits on the muted fill.",
        render: (ctx) => {
          const { poster: _poster, ...section } = fixtures(ctx).video.long;
          return (
            <VideoSection
              {...section}
              settings={{ surface: "muted", container: "narrow" }}
              copy={copy(ctx)}
              locale={lang(ctx)}
            />
          );
        },
      },
    ],
  },
  "sections/spacer": {
    summary: "Room between two sections, small, medium or large, with a line across it or without.",
    a11y: [
      "Not part of the page's outline: a div, and its line a separator.",
      "Its size is its own; the settings' spacing does not apply to it.",
    ],
    live: (ctx) => <SpacerSection {...fixtures(ctx).spacer.section} />,
    statesLayout: "stack",
    states: [
      {
        id: "small",
        label: "Small, no line",
        description: "`size: small`, `divider: false`.",
        render: () => <SpacerSection size="small" divider={false} />,
      },
      {
        id: "large",
        label: "Large, muted",
        description: "`size: large` with the line, on the muted fill.",
        render: () => <SpacerSection size="large" divider settings={muted} />,
      },
    ],
  },
  "sections/newsletter": {
    summary:
      "The newsletter signup as a band of the page: the editor's heading and line over one email field, the consent sentence with the privacy link, and the four states. It posts the editor's newsletter form, with scripts or without.",
    a11y: [
      "The heading is an h2; empty, the catalog's words stand in.",
      "The email field is labelled, typed `email` with `autocomplete=email`; the consent sentence links the privacy page.",
      "The answer is text in a polite status region that is always in the page; a refused address is marked `aria-invalid` and tied to its error.",
      "Without scripts the form posts and the page comes back scrolled to it, with the answer.",
    ],
    live: (ctx) => newsletter(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "sending",
        label: "Sending",
        description: "The button keeps its place and name, busy; Enter is stopped.",
        render: (ctx) => newsletter(ctx, "section", "sending"),
      },
      {
        id: "done",
        label: "Subscribed, muted",
        description: "The thank-you line in the status region, on the muted fill.",
        render: (ctx) => newsletter(ctx, "section", "done", muted),
      },
      {
        id: "long",
        label: "Long heading, error",
        description: "A heading that wraps, a long address kept, and the error line.",
        render: (ctx) => newsletter(ctx, "long", "error"),
      },
    ],
  },
  "sections/form-block": {
    summary:
      "A form an editor built in the admin: text, email, select, text area and checkbox fields in the editor's order, the editor's text between them, two half-width fields to a row where the form is wide enough, and the answer in place.",
    a11y: [
      "Each control is native and labelled; an optional field says so, a required one is `required`, so the browser checks it first.",
      "A refused field is marked `aria-invalid`, its error tied to it by `aria-describedby`, and what was typed is kept (WCAG 3.3.1).",
      "The answer is text in a polite status region that is always in the page (WCAG 4.1.3).",
      "Without scripts the form posts and the page comes back scrolled to it, with the answer.",
    ],
    live: (ctx) => contactForm(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "error",
        label: "Refused fields",
        description:
          "The server refused the address's shape and the unticked box; the other answers are kept.",
        render: (ctx) =>
          contactForm(ctx, "section", {
            status: "error",
            errors: { email: "pattern", consent: "required" },
            values: {
              name: "Alex Doe",
              email: "alex@",
              topic: "returns",
              message: fixtures(ctx).richText.body.paragraphs[0] ?? "",
            },
          }),
      },
      {
        id: "sending",
        label: "Sending",
        description: "The fields read-only and the button busy, in place.",
        render: (ctx) => contactForm(ctx, "section", { status: "sending" }),
      },
      {
        id: "done",
        label: "Sent, muted",
        description: "The editor's confirmation in the status region, on the muted fill.",
        render: (ctx) => contactForm(ctx, "section", { status: "done", settings: muted }),
      },
      {
        id: "long",
        label: "Long labels",
        description: "Labels that wrap in both halves of a row; the fields keep their width.",
        render: (ctx) => contactForm(ctx, "long"),
      },
    ],
  },
} satisfies Partial<Record<EntryId, DsStory>>;
