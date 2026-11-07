// Ours (T63, SETUP.md "Blocks (T63)"; D70, D79). The stories of the Sections: SPEC §7.4's blocks as
// a page draws them, each across the frame's width (`stack`). The view models are
// `sectionFixtures[ctx.locale]`, the fixed words `catalogs[ctx.locale]` through `sectionsCopy`, and
// the rich text, which the storefront renders from Lexical, is drawn here from the fixtures' sample
// as plain elements. The states show the settings an editor changes most (the surface, the side of
// the picture) and the long texts. Every link is drawn with `prefetch={false}`. The entry page
// adds the block's Payload fields (`components/block-table.tsx`). The commerce sections (T64) are
// drawn from the commerce fixtures' products and categories, as the resolvers would give them; a
// countdown is frozen at the fixtures' `now`, and the recently viewed list is the browser's own in
// the shop, a fixed list here.
import { commerceFixtures, markets, sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { SectionSettings } from "@shopblok/registry/contracts";
import { BundleSection } from "@shopblok/ui/sections/bundle";
import { CategoryShowcaseSection } from "@shopblok/ui/sections/category-showcase";
import { CollectionSpotlightSection } from "@shopblok/ui/sections/collection-spotlight";
import { EditorialListSection } from "@shopblok/ui/sections/editorial-list";
import { ComparisonSection } from "@shopblok/ui/sections/comparison";
import { FaqSection } from "@shopblok/ui/sections/faq";
import { FeaturedProductSection } from "@shopblok/ui/sections/featured-product";
import { FormBlockSection, type FormBlockSectionProps } from "@shopblok/ui/sections/form-block";
import { HeroSection } from "@shopblok/ui/sections/hero";
import { LogoCloudSection } from "@shopblok/ui/sections/logo-cloud";
import { MediaWithTextSection } from "@shopblok/ui/sections/media-with-text";
import { NewsletterSection } from "@shopblok/ui/sections/newsletter";
import { ProductCollectionSection } from "@shopblok/ui/sections/product-collection";
import { PromoBannerSection } from "@shopblok/ui/sections/promo-banner";
import { RecentlyViewedSection } from "@shopblok/ui/sections/recently-viewed";
import { RichTextSection } from "@shopblok/ui/sections/rich-text";
import { sectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SpacerSection } from "@shopblok/ui/sections/spacer";
import { TestimonialsSection } from "@shopblok/ui/sections/testimonials";
import { UspBarSection } from "@shopblok/ui/sections/usp-bar";
import { VideoSection } from "@shopblok/ui/sections/video";
import type { DsContext, DsStory } from "../types";

const fixtures = (ctx: DsContext) => sectionFixtures[ctx.locale];
type MediaWithTextVariant = "overlap" | "full-bleed";
const copy = (ctx: DsContext) => sectionsCopy(catalogs[ctx.locale]);
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;
const commerce = (ctx: DsContext) => commerceFixtures[ctx.locale];

/** The DS market's country's time zone (D65), as the shop's markets global seeds it. */
const timeZone = (ctx: DsContext) =>
  markets.countries.find((country) => country.code === ctx.fixture.market.country)?.timeZone;

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

export function richText(ctx: DsContext, settings?: SectionSettings) {
  return <RichTextSection settings={settings}>{sampleText(ctx)}</RichTextSection>;
}

export function mediaWithText(
  ctx: DsContext,
  which: "section" | "long",
  settings?: SectionSettings,
  /** T82: the member to draw (`standard` when none). */
  variant?: MediaWithTextVariant,
) {
  const { body, ...samples } = fixtures(ctx).mediaWithText;
  return (
    <MediaWithTextSection
      {...samples[which]}
      {...(variant === undefined ? {} : { variant })}
      settings={settings}
      copy={copy(ctx)}
      prefetch={false}
    >
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
  /** T82: the member to draw (`standard` when none). */
  variant?: "side-heading",
) {
  const section = fixtures(ctx).faq[which];
  const first = section.items[0]?.value;
  return (
    <FaqSection
      {...section}
      {...(variant === undefined ? {} : { variant })}
      settings={settings}
      defaultOpen={open === "first" && first !== undefined ? [first] : []}
    />
  );
}

function video(ctx: DsContext, which: "embed" | "file" | "long", settings?: SectionSettings) {
  const section = fixtures(ctx).video[which];
  return <VideoSection {...section} settings={settings} copy={copy(ctx)} locale={lang(ctx)} />;
}

type Fixtures = ReturnType<typeof fixtures>;
type HeroVariant = NonNullable<Fixtures["hero"]["section"]["variant"]>;
type PromoBannerVariant = NonNullable<Fixtures["promoBanner"]["section"]["variant"]>;
type CategoryShowcaseVariant = NonNullable<Fixtures["categoryShowcase"]["section"]["variant"]>;
type ProductCollectionVariant = NonNullable<Fixtures["productCollection"]["grid"]["variant"]>;

export function hero(
  ctx: DsContext,
  which: keyof Fixtures["hero"],
  settings?: SectionSettings,
  headingLevel: 1 | 2 = 2,
  /** T80: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: HeroVariant,
) {
  return (
    <HeroSection
      {...fixtures(ctx).hero[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      timeZone={timeZone(ctx)}
      headingLevel={headingLevel}
      // Drawn at the fixtures' fixed now: the page must not count on from the real date.
      frozen
      prefetch={false}
    />
  );
}

function categoryShowcase(
  ctx: DsContext,
  which: keyof Fixtures["categoryShowcase"],
  settings?: SectionSettings,
  /** T81: the member to draw (`standard` when none). */
  variant?: CategoryShowcaseVariant,
) {
  return (
    <CategoryShowcaseSection
      {...fixtures(ctx).categoryShowcase[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function productCollection(
  ctx: DsContext,
  which: keyof Fixtures["productCollection"],
  settings?: SectionSettings,
  /** T81: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: ProductCollectionVariant,
) {
  return (
    <ProductCollectionSection
      {...fixtures(ctx).productCollection[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function featuredProduct(
  ctx: DsContext,
  which: keyof Fixtures["featuredProduct"],
  settings?: SectionSettings,
  /** T81: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: "overlay" | "gallery",
) {
  return (
    <FeaturedProductSection
      {...fixtures(ctx).featuredProduct[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function bundle(
  ctx: DsContext,
  which: keyof Fixtures["bundle"],
  settings?: SectionSettings,
  /** T81: the member to draw (`standard` when none). */
  variant?: "list",
) {
  return (
    <BundleSection
      {...fixtures(ctx).bundle[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function promoBanner(
  ctx: DsContext,
  which: keyof Fixtures["promoBanner"],
  settings?: SectionSettings,
  /** T82: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: PromoBannerVariant,
) {
  return (
    <PromoBannerSection
      {...fixtures(ctx).promoBanner[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      frozen
      copy={copy(ctx)}
      locale={lang(ctx)}
      timeZone={timeZone(ctx)}
      prefetch={false}
    />
  );
}

function comparison(
  ctx: DsContext,
  which: keyof Fixtures["comparison"],
  settings?: SectionSettings,
  /** T82: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: "cards" | "highlight",
) {
  return (
    <ComparisonSection
      {...fixtures(ctx).comparison[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function collectionSpotlight(
  ctx: DsContext,
  which: keyof Fixtures["collectionSpotlight"],
  settings?: SectionSettings,
  /** T81: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: "stacked",
) {
  return (
    <CollectionSpotlightSection
      {...fixtures(ctx).collectionSpotlight[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function recentlyViewed(ctx: DsContext, settings?: SectionSettings) {
  return (
    <RecentlyViewedSection
      {...fixtures(ctx).recentlyViewed.section}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

function newsletter(
  ctx: DsContext,
  which: keyof Fixtures["newsletter"],
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

function editorialList(
  ctx: DsContext,
  which: keyof Fixtures["editorialList"],
  settings?: SectionSettings,
  /** T82: the member to draw, over the fixture's own (`standard` when it has none). */
  variant?: "featured",
) {
  return (
    <EditorialListSection
      {...fixtures(ctx).editorialList[which]}
      {...(variant === undefined ? {} : { variant })}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
      timeZone={timeZone(ctx)}
      prefetch={false}
    />
  );
}

/** T82: the testimonials, drawn by the member `variant`. */
function testimonials(
  ctx: DsContext,
  which: keyof Fixtures["testimonials"],
  variant: "single" | "carousel" | "wall",
  settings?: SectionSettings,
) {
  return (
    <TestimonialsSection
      {...fixtures(ctx).testimonials[which]}
      variant={variant}
      {...(settings === undefined ? {} : { settings })}
      copy={copy(ctx)}
      locale={lang(ctx)}
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
    live: (ctx) => <UspBarSection {...fixtures(ctx).uspBar.section} copy={copy(ctx)} />,
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long text, three items",
        description: "Three columns from lg up; a long title and line wrap.",
        render: (ctx) => <UspBarSection {...fixtures(ctx).uspBar.long} copy={copy(ctx)} />,
      },
      {
        id: "muted",
        label: "Muted surface, small spacing",
        description: "As a band under the header: `surface: muted`, `spacing: small`.",
        render: (ctx) => (
          <UspBarSection
            {...fixtures(ctx).uspBar.section}
            settings={{ surface: "muted", spacing: "small" }}
            copy={copy(ctx)}
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
  "sections/hero": {
    summary:
      "The page's opening: a heading, a line and up to two links beside the editor's picture; optionally a countdown to the offer's end and up to four products from its source.",
    a11y: [
      "The heading is the page's h1 when the hero opens a page without a title of its own (its picture is then preloaded), otherwise an h2; the product cards' names are one level below it.",
      "The text never sits on the picture (WCAG 1.4.3): beside it from md up, above it on a phone, so the heading is read and seen first.",
      "The countdown is text the server renders (D50), CountdownTimer's; the products are a list named as a grid of products.",
    ],
    live: (ctx) => hero(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "offer",
        label: "Countdown and products",
        description:
          "An offer with its end and four products from its source, frozen at the fixtures' time.",
        render: (ctx) => hero(ctx, "offer"),
      },
      {
        id: "long",
        label: "Long heading, page title",
        description: "No picture and one link, a heading that wraps, drawn as the page's h1.",
        render: (ctx) => hero(ctx, "long", undefined, 1),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the links swap their colours with the theme.",
        render: (ctx) => hero(ctx, "offer", inverse),
      },
    ],
  },
  // T80 (M5 plan §1a): the hero's seven more members, each from the family's fixtures with what it
  // needs. Their Payload fields are the hero block's.
  "sections/hero-overlay": {
    summary:
      "The editor's picture fills the band and the words lie over it at the start, on the overlay scrim; when it opens a page, the transparent header lies over the picture.",
    a11y: [
      "Text on the picture only on the overlay token's scrim (60 % black): light text keeps 5.7:1 on a white photo (D100). Inside it the tokens are turned light, so the links, the countdown and the focus ring keep their contrast.",
      "The section says it has a picture behind its words (`data-under-header`); the shell's rule lays the transparent header over it only then, and draws it solid on every other page (D103).",
      "The heading is the page's h1 when the hero opens it; the products follow the band, their names one level below.",
    ],
    live: (ctx) => hero(ctx, "overlay"),
    statesLayout: "stack",
    states: [
      {
        id: "offer",
        label: "Countdown and products",
        description: "The offer's countdown on the scrim, and four products under the band.",
        render: (ctx) => hero(ctx, "offer", undefined, 2, "overlay"),
      },
      {
        id: "long",
        label: "Long heading, page title",
        description: "A heading that wraps on the scrim, drawn as the page's h1.",
        render: (ctx) => hero(ctx, "overlay", undefined, 1),
      },
    ],
  },
  "sections/hero-centered": {
    summary:
      "The words centred above a wide picture across the content's width, then the source's products.",
    a11y: [
      "The text never sits on the picture: the words come first, the picture under them.",
      "The links stay a row that wraps, centred, each at least 44 px high.",
    ],
    live: (ctx) => hero(ctx, "section", undefined, 2, "centered"),
    statesLayout: "stack",
    states: [
      {
        id: "offer",
        label: "Countdown and products",
        description: "An offer with its end and four products, frozen at the fixtures' time.",
        render: (ctx) => hero(ctx, "offer", undefined, 2, "centered"),
      },
      {
        id: "long",
        label: "Long heading, no picture",
        description: "A heading that wraps and one link, drawn as the page's h1.",
        render: (ctx) => hero(ctx, "long", undefined, 1, "centered"),
      },
    ],
  },
  "sections/hero-editorial": {
    summary:
      "A large heading across both columns, then a tall picture beside a smaller second one, with the line and the links under it.",
    a11y: [
      "Both pictures are described; the reading order is the heading, the tall picture, the second, then the words and links.",
      "The heading is set large but stays one heading: the page's h1 when the hero opens it, otherwise an h2.",
    ],
    live: (ctx) => hero(ctx, "editorial"),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface, page title",
        description: "On the muted fill, drawn as the page's h1.",
        render: (ctx) => hero(ctx, "editorial", muted, 1),
      },
    ],
  },
  "sections/hero-bento": {
    summary:
      "The message in one tile beside up to four products from its source, as a grid of cards; without products, the picture takes the second tile.",
    a11y: [
      "The products are a list named as a grid of products; their names are one level below the heading.",
      "The message tile is the muted fill: the text keeps the theme's contrast pairing.",
    ],
    live: (ctx) => hero(ctx, "bento"),
    statesLayout: "stack",
    states: [
      {
        id: "picture",
        label: "No products: the picture",
        description: "A source with nothing: the editor's picture beside the message.",
        render: (ctx) => hero(ctx, "section", undefined, 2, "bento"),
      },
      {
        id: "inverse",
        label: "Inverse surface, countdown",
        description: "`surface: inverse` with the offer's countdown and four products.",
        render: (ctx) => hero(ctx, "offer", inverse, 2, "bento"),
      },
    ],
  },
  "sections/hero-collection-switcher": {
    summary:
      "Two to four collections as tabs that switch the picture and the way into the collection; without scripts, a list of the collections' links over the first one's picture.",
    a11y: [
      "The tabs are Base UI's: one tab stop, the arrow keys move between them and show each panel as they reach it; nothing changes by itself.",
      "The tab list is named by the hero's heading. Each panel's link says which collection it opens (Shop the collection, then its name, to a screen reader).",
      "Without scripts, and for a crawler, the collections are a list of links (the tabs' code is loaded only in the browser, D102).",
    ],
    live: (ctx) => hero(ctx, "collections"),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface, page title",
        description: "On the muted fill, drawn as the page's h1 (its first picture preloaded).",
        render: (ctx) => hero(ctx, "collections", muted, 1),
      },
    ],
  },
  "sections/hero-product": {
    summary:
      "The source's first product as the page's opening: its picture, its name and price in the market's currency, and the way to its page.",
    a11y: [
      "The product's name is one level below the hero's heading; the price is PriceBlock's, with its hidden labels.",
      "The way to the product is a 44 px button; the editor's links follow it in the same row.",
    ],
    live: (ctx) => hero(ctx, "product"),
    statesLayout: "stack",
    states: [
      {
        id: "picture",
        label: "The editor's picture, countdown",
        description:
          "The editor's picture in place of the product's, and the offer's countdown under the price.",
        render: (ctx) => (
          <HeroSection
            {...fixtures(ctx).hero.offer}
            variant="product"
            copy={copy(ctx)}
            locale={lang(ctx)}
            timeZone={timeZone(ctx)}
            frozen
            prefetch={false}
          />
        ),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description:
          "`surface: inverse`: the price and the button swap their colours with the theme.",
        render: (ctx) => hero(ctx, "product", inverse),
      },
    ],
  },
  "sections/hero-text": {
    summary:
      "Words only, the heading in display type, no picture; the source's products under them.",
    a11y: [
      "No picture is drawn, so nothing lies under the transparent header: the section has no `data-under-header` (D103).",
      "The display heading wraps anywhere, so a long word in German or Greek does not overflow a phone.",
    ],
    live: (ctx) => hero(ctx, "section", undefined, 2, "text"),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long heading, page title",
        description: "A heading that wraps, drawn as the page's h1.",
        render: (ctx) => hero(ctx, "long", undefined, 1, "text"),
      },
      {
        id: "inverse",
        label: "Inverse surface, products",
        description: "`surface: inverse` with the offer's countdown and four products.",
        render: (ctx) => hero(ctx, "offer", inverse, 2, "text"),
      },
    ],
  },
  "sections/category-showcase": {
    summary:
      "The shop's categories as picture tiles: the top-level ones, a category's children or the editor's list, each with its translated name and its newest product's picture.",
    a11y: [
      "A list of links, each a whole tile of at least 44 px named by the category; the picture is decoration.",
      "Two across on a phone, four from md up; the order is Medusa's rank or the editor's.",
    ],
    live: (ctx) => categoryShowcase(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "edited",
        label: "Three, edited",
        description: "A handpicked list of three, one with the editor's label and picture.",
        render: (ctx) => categoryShowcase(ctx, "edited"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The tiles on the muted fill.",
        render: (ctx) => categoryShowcase(ctx, "edited", muted),
      },
    ],
  },
  "sections/category-showcase-circles": {
    summary:
      "Each category a round picture with its name under it: one row that scrolls sideways on a phone, wrapped and centred from md up.",
    a11y: [
      "A list of links named by the heading (or “Shop by category”), each a whole circle and name of at least 44 px; the pictures are decoration.",
      "On a phone the row scrolls inside its own box, which takes the focus so the keyboard can scroll it too; the page never scrolls sideways.",
    ],
    live: (ctx) => categoryShowcase(ctx, "section", undefined, "circles"),
    statesLayout: "stack",
    states: [
      {
        id: "edited",
        label: "Three, edited",
        description:
          "A handpicked list of three, one with the editor's label and picture; no heading's line.",
        render: (ctx) => categoryShowcase(ctx, "edited", undefined, "circles"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The circles on the muted fill.",
        render: (ctx) => categoryShowcase(ctx, "section", muted, "circles"),
      },
    ],
  },
  "sections/category-showcase-bento": {
    summary:
      "The first category as one large tile and up to four more beside it, smaller, each name on its picture's foot over a dark scrim.",
    a11y: [
      "Each tile is one link named by its category; the names sit on the overlay scrim, so light text keeps 5.7:1 on any picture.",
      "Tiles past the fifth are not drawn; on a phone the large tile takes the width and the others go two across.",
    ],
    live: (ctx) => categoryShowcase(ctx, "section", undefined, "bento"),
    statesLayout: "stack",
    states: [
      {
        id: "edited",
        label: "Three",
        description: "Three categories: the large tile and two small ones.",
        render: (ctx) => categoryShowcase(ctx, "edited", undefined, "bento"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the tiles' scrim keeps its contrast on the dark end.",
        render: (ctx) => categoryShowcase(ctx, "section", inverse, "bento"),
      },
    ],
  },
  "sections/category-showcase-carousel": {
    summary:
      "The category tiles in a row that scrolls, two on a phone, three from md and four from lg, with previous and next buttons beside the heading.",
    a11y: [
      "The carousel is a region named by the heading (or “Shop by category”); each tile is a slide named “2 of 8”, and nothing moves by itself.",
      "The buttons are 44 px, say where they go and stay focusable at the ends; a swipe and the arrow keys move it too.",
    ],
    live: (ctx) => categoryShowcase(ctx, "section", undefined, "carousel"),
    statesLayout: "stack",
    states: [
      {
        id: "edited",
        label: "Three, no line",
        description: "Three tiles, fewer than a row: the buttons stay, switched off.",
        render: (ctx) => categoryShowcase(ctx, "edited", undefined, "carousel"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The tiles on the muted fill.",
        render: (ctx) => categoryShowcase(ctx, "section", muted, "carousel"),
      },
    ],
  },
  "sections/category-showcase-list": {
    summary:
      "An index of the shop: the categories' names in columns, each beside a small round picture, between two rules.",
    a11y: [
      "A list of links named by the heading (or “Shop by category”), each row at least 44 px high; the pictures are decoration.",
      "One column on a phone, up to four from lg; a row never breaks across two columns.",
    ],
    live: (ctx) => categoryShowcase(ctx, "section", undefined, "list"),
    statesLayout: "stack",
    states: [
      {
        id: "edited",
        label: "Three, edited",
        description: "A handpicked list of three.",
        render: (ctx) => categoryShowcase(ctx, "edited", undefined, "list"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the rules and the names turn with the theme.",
        render: (ctx) => categoryShowcase(ctx, "section", inverse, "list"),
      },
    ],
  },
  "sections/category-showcase-banner": {
    summary:
      "Wide tiles, one across on a phone and two from md, each category's name large on its picture over a dark scrim; an odd last tile takes the row.",
    a11y: [
      "Each tile is one link named by its category; the names sit on the overlay scrim, so light text keeps 5.7:1 on any picture.",
      "The pictures are decoration: the names say where each tile goes.",
    ],
    live: (ctx) => categoryShowcase(ctx, "edited", undefined, "banner"),
    statesLayout: "stack",
    states: [
      {
        id: "all",
        label: "Eight categories",
        description: "The tree's first eight, in four rows of two.",
        render: (ctx) => categoryShowcase(ctx, "section", undefined, "banner"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The banners on the muted fill.",
        render: (ctx) => categoryShowcase(ctx, "edited", muted, "banner"),
      },
    ],
  },
  "sections/product-collection": {
    summary:
      "Products from a source (a collection, a category, a tag, a type, the newest, those on sale, or the editor's list) as a carousel or a grid, in the market's prices.",
    a11y: [
      "The heading is an h2, the cards' names h3; the carousel is a region named by its heading, with 44 px buttons that say where they go.",
      "With no product the block is left out, or says so with a link to every product, or shows the newest: the editor's choice.",
    ],
    live: (ctx) => productCollection(ctx, "carousel"),
    statesLayout: "stack",
    states: [
      {
        id: "grid",
        label: "Grid",
        description: "`display: grid`: four products in rows.",
        render: (ctx) => productCollection(ctx, "grid"),
      },
      {
        id: "empty",
        label: "Nothing found, message",
        description: "`emptyBehavior: message`: the empty state and a link to every product.",
        render: (ctx) => productCollection(ctx, "empty"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The grid on the muted fill.",
        render: (ctx) => productCollection(ctx, "grid", muted),
      },
    ],
  },
  "sections/product-collection-featured-first": {
    summary:
      "The source's first product as one large card, two columns wide and two rows high from md, then the others in the listing's columns around it.",
    a11y: [
      "One list of product cards, the large one first; the heading is an h2 and the cards' names h3.",
      "On a phone the large card takes the first row and the others go two across.",
    ],
    live: (ctx) => productCollection(ctx, "carousel", undefined, "featured-first"),
    statesLayout: "stack",
    states: [
      {
        id: "four",
        label: "Four products",
        description: "The large card and three beside it.",
        render: (ctx) => productCollection(ctx, "grid", undefined, "featured-first"),
      },
      {
        id: "empty",
        label: "Nothing found, message",
        description: "`emptyBehavior: message`: the empty state and a link to every product.",
        render: (ctx) => productCollection(ctx, "empty", undefined, "featured-first"),
      },
    ],
  },
  "sections/product-collection-editorial": {
    summary:
      "The heading, the line and the link in a column of their own beside a two-column grid of products from lg; above it on a phone and a tablet.",
    a11y: [
      "The column comes first in the reading order; it stays in view while the grid scrolls past (sticky), and nothing in it moves.",
      "The cards are the standard look; their names are h3 under the heading's h2.",
    ],
    live: (ctx) => productCollection(ctx, "carousel", undefined, "editorial"),
    statesLayout: "stack",
    states: [
      {
        id: "four",
        label: "Four products, no line",
        description: "A heading without its line or link.",
        render: (ctx) => productCollection(ctx, "grid", undefined, "editorial"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "On the muted fill.",
        render: (ctx) => productCollection(ctx, "carousel", muted, "editorial"),
      },
    ],
  },
  "sections/product-collection-tabs": {
    summary:
      "Up to four sources as tabs (“New in”, “On sale”), each over a grid of products; the first tab's products are in the page, the others' are fetched when their tab is chosen.",
    a11y: [
      "The tabs are Base UI's: one tab stop, the arrow keys move between them and show each panel as they reach it; nothing changes by itself.",
      "The tab list is named by the heading. A panel that is loading says so in a polite live region, and one that could not load says so with “Try again”.",
      "Without scripts, and for a crawler, the tabs are a list of links to their listings over the first tab's products (the tabs' code is loaded only in the browser, D102).",
    ],
    live: (ctx) => productCollection(ctx, "tabs"),
    statesLayout: "stack",
    states: [
      {
        id: "one",
        label: "One tab left",
        description:
          "The other tabs' sources have nothing in the market: the heading over the one grid, no tab list.",
        render: (ctx) => (
          <ProductCollectionSection
            {...fixtures(ctx).productCollection.tabs}
            tabs={fixtures(ctx).productCollection.tabs.tabs?.slice(0, 1)}
            copy={copy(ctx)}
            locale={lang(ctx)}
            prefetch={false}
          />
        ),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The tabs on the muted fill.",
        render: (ctx) => productCollection(ctx, "tabs", muted),
      },
    ],
  },
  "sections/product-collection-ranked": {
    summary:
      "A numbered list (“Our top five”): each product a row with its number large at the start, then its picture, name and price; two columns from md.",
    a11y: [
      "An ordered list; each product's link is named with its number first (“Number 1: Heritage Hoodie”), and the large number is drawn for the eye only, so it is not read twice.",
      "The whole row is the link's target, and its focus ring is the row's.",
    ],
    live: (ctx) => productCollection(ctx, "ranked"),
    statesLayout: "stack",
    states: [
      {
        id: "eight",
        label: "Eight products",
        description: "A longer list, in four rows of two from md.",
        render: (ctx) => productCollection(ctx, "carousel", undefined, "ranked"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the numbers and the rules turn with the theme.",
        render: (ctx) => productCollection(ctx, "ranked", inverse),
      },
    ],
  },
  "sections/product-collection-with-banner": {
    summary:
      "The editor's picture in the grid's first cells, with its line and link over it on a dark scrim, and the products two across beside it.",
    a11y: [
      "The words on the picture sit on the overlay scrim, so light text, the link and its focus ring keep their contrast on any picture.",
      "The picture has the editor's alternative text; the products are a list of cards under the heading's h2.",
    ],
    live: (ctx) => productCollection(ctx, "banner"),
    statesLayout: "stack",
    states: [
      {
        id: "plain",
        label: "No line or link",
        description: "The picture alone beside the products.",
        render: (ctx) => {
          const { intro: _intro, link: _link, ...banner } = fixtures(ctx).productCollection.banner;
          return (
            <ProductCollectionSection
              {...banner}
              copy={copy(ctx)}
              locale={lang(ctx)}
              prefetch={false}
            />
          );
        },
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "On the muted fill.",
        render: (ctx) => productCollection(ctx, "banner", muted),
      },
    ],
  },
  "sections/product-collection-compact": {
    summary:
      "Horizontal cards (a narrow picture, the name and the price beside it) in two columns from md, a rule under each row, so many products fit in little height.",
    a11y: [
      "One list of product cards; each card is one link named by the product, at least 44 px high.",
      "One column on a phone.",
    ],
    live: (ctx) => productCollection(ctx, "carousel", undefined, "compact"),
    statesLayout: "stack",
    states: [
      {
        id: "four",
        label: "Four products",
        description: "Two rows of two.",
        render: (ctx) => productCollection(ctx, "grid", undefined, "compact"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`.",
        render: (ctx) => productCollection(ctx, "carousel", inverse, "compact"),
      },
    ],
  },
  "sections/product-collection-lookbook": {
    summary:
      "The editor's large picture of a look with up to four of its products listed beside it from lg (under it on a phone and a tablet); no hotspots.",
    a11y: [
      "The picture has the editor's alternative text; the products are a list of horizontal cards, each one link.",
      "The heading, its line and the link come before the list in the reading order.",
    ],
    live: (ctx) => productCollection(ctx, "look"),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface",
        description: "On the muted fill.",
        render: (ctx) => productCollection(ctx, "look", muted),
      },
    ],
  },
  "sections/featured-product": {
    summary:
      "One product beside a large picture and the editor's words: its price in the market's currency and a link to its page.",
    a11y: [
      "With the editor's heading, it is the h2 and the product's name an h3; without one the name is the h2.",
      "The picture is the editor's, with its alternative text, or the product's first.",
    ],
    live: (ctx) => featuredProduct(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "sale",
        label: "On sale, no words",
        description: "The product's own picture and its sale price, without heading or text.",
        render: (ctx) => featuredProduct(ctx, "sale"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`.",
        render: (ctx) => featuredProduct(ctx, "section", inverse),
      },
    ],
  },
  "sections/featured-product-overlay": {
    summary:
      "The picture across the band, the product's name, price, the editor's words and the way to its page on a card over the picture's foot.",
    a11y: [
      "The card is the page's own surface, so its words keep the theme's contrast; on a phone it overlaps the picture's edge and runs on below it.",
      "With the editor's heading it is the h2 and the product's name an h3; without one the name is the h2.",
    ],
    live: (ctx) => featuredProduct(ctx, "section", undefined, "overlay"),
    statesLayout: "stack",
    states: [
      {
        id: "sale",
        label: "On sale, no words",
        description: "The product's own picture and its sale price, without heading or text.",
        render: (ctx) => featuredProduct(ctx, "sale", undefined, "overlay"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the card turns with the theme.",
        render: (ctx) => featuredProduct(ctx, "section", inverse, "overlay"),
      },
    ],
  },
  "sections/featured-product-gallery": {
    summary:
      "The product's pictures as a small gallery (the editor's large, then up to four of the product's under it) beside its name, price, the editor's words and the way to its page.",
    a11y: [
      "Every picture is drawn at once: nothing has to be pressed to see them, so it needs no script; each keeps its alternative text.",
      "The words stay in view beside the gallery from md (sticky); on a phone they follow it.",
    ],
    live: (ctx) => featuredProduct(ctx, "gallery"),
    statesLayout: "stack",
    states: [
      {
        id: "two",
        label: "Two pictures",
        description: "The editor's picture and one of the product's.",
        render: (ctx) => {
          const section = fixtures(ctx).featuredProduct.gallery;
          return (
            <FeaturedProductSection
              {...section}
              gallery={section.gallery?.slice(0, 2)}
              copy={copy(ctx)}
              locale={lang(ctx)}
              prefetch={false}
            />
          );
        },
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "On the muted fill.",
        render: (ctx) => featuredProduct(ctx, "gallery", muted),
      },
    ],
  },
  "sections/bundle": {
    summary:
      "Products that go together, side by side with a plus between them: the editor's list, in its order.",
    a11y: [
      "A list of product cards; the plus signs are decoration (aria-hidden).",
      "Two to six products: two across on a phone, three from md up, where the plus appears between two cards of a row.",
    ],
    live: (ctx) => bundle(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "full",
        label: "Six products",
        description: "The most a bundle holds: six, in rows.",
        render: (ctx) => bundle(ctx, "full"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The cards on the muted fill.",
        render: (ctx) => bundle(ctx, "section", muted),
      },
    ],
  },
  "sections/bundle-list": {
    summary:
      "The products that go together as compact rows, each its picture, name, price and own way to its page, and the sum of the listed prices under them.",
    a11y: [
      "A list of rows, each one link named by the product; the price is PriceBlock's, with its hidden labels.",
      "The sum is text (“Together €95.00”), with “from” when a price depends on the options: v1 has no bundle price (D79).",
    ],
    live: (ctx) => bundle(ctx, "section", undefined, "list"),
    statesLayout: "stack",
    states: [
      {
        id: "full",
        label: "Six products",
        description: "The most a bundle holds.",
        render: (ctx) => bundle(ctx, "full", undefined, "list"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The rows on the muted fill.",
        render: (ctx) => bundle(ctx, "section", muted, "list"),
      },
    ],
  },
  "sections/promo-banner": {
    summary:
      "An offer: a heading, a line, a code to copy, when it ends and the small print, beside a picture; left out of the page once its end has passed.",
    a11y: [
      "The code's copy button says what it copies and announces that it did, in a polite live region.",
      "The end is a date written in the market's time zone, so the server and the browser say the same; nothing counts down.",
    ],
    live: (ctx) => promoBanner(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "plain",
        label: "Words only",
        description: "No picture, code or end: a heading and a line.",
        render: (ctx) => promoBanner(ctx, "plain"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the code chip keeps its contrast.",
        render: (ctx) => promoBanner(ctx, "section", inverse),
      },
    ],
  },
  "sections/comparison": {
    summary:
      "Two to four products in a table: their pictures, names and prices, their options and the details the editor names from their metadata.",
    a11y: [
      "A table with a caption, the products as column headers and each row's label as a row header.",
      'A missing value is a dash that a screen reader reads as "Not specified".',
      "On a phone the table scrolls sideways inside its own box, which takes the focus and is named by the caption.",
    ],
    live: (ctx) => comparison(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "two",
        label: "Two products, a value missing",
        description: "Two columns; one product has no value for a row.",
        render: (ctx) => comparison(ctx, "two"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The table on the muted fill.",
        render: (ctx) => comparison(ctx, "section", muted),
      },
    ],
  },
  "sections/collection-spotlight": {
    summary:
      "A collection's picture and words beside a few of its products, with a link to the whole collection.",
    a11y: [
      "The heading is an h2 (the collection's translated title when the editor leaves it empty); the link names the collection.",
      "The products are a list of cards; the picture has the editor's alternative text.",
    ],
    live: (ctx) => collectionSpotlight(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long heading, no products",
        description: "`limit: 0`: the picture, the words and the link only.",
        render: (ctx) => collectionSpotlight(ctx, "long"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`.",
        render: (ctx) => collectionSpotlight(ctx, "section", inverse),
      },
    ],
  },
  "sections/collection-spotlight-stacked": {
    summary:
      "A wide picture across the section, the heading, the editor's words and the way to the collection under it, and a row of the collection's products under them.",
    a11y: [
      "The heading is an h2 (the collection's translated title when the editor leaves it empty); the link names the collection.",
      "The products are a list of cards, two across on a phone and four from md.",
    ],
    live: (ctx) => collectionSpotlight(ctx, "section", undefined, "stacked"),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long heading, no products",
        description: "`limit: 0`: the picture, the words and the link only.",
        render: (ctx) => collectionSpotlight(ctx, "long", undefined, "stacked"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`.",
        render: (ctx) => collectionSpotlight(ctx, "section", inverse, "stacked"),
      },
    ],
  },
  "sections/recently-viewed": {
    summary:
      "The products this visitor has viewed in this market, as a carousel under the editor's heading; the browser's list, drawn after hydration, and nothing on a first visit.",
    a11y: [
      "Nothing is rendered until there is a product, so a first visit has no empty region.",
      "The carousel is a region named by its heading, with 44 px buttons.",
    ],
    live: (ctx) => recentlyViewed(ctx),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface",
        description: "The carousel on the muted fill.",
        render: (ctx) => recentlyViewed(ctx, muted),
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
  "sections/editorial-list": {
    summary:
      "Posts of the journal on a page: the newest or the editor's picks, in the market's language, as cards with the way to the journal.",
    a11y: [
      "Each post is an `<article>`: its title is an `<h3>` under the section's heading (an `<h2>` without one) and the card's only link, stretched over the card.",
      "The picture is decoration: the title beside it names the post.",
      "Each date is a `<time>` with the instant, written in the market's time zone and language.",
    ],
    live: (ctx) => editorialList(ctx, "section"),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "One post, long title",
        description: "A single card across the column, no picture, no heading and no link.",
        render: (ctx) => editorialList(ctx, "long"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The cards on the muted fill.",
        render: (ctx) => editorialList(ctx, "section", muted),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "The cards on the theme turned over; the dates keep their contrast.",
        render: (ctx) => editorialList(ctx, "section", inverse),
      },
    ],
  },
  // T82 (M5 plan §1a): the content and promotion blocks' seventeen more members, each from its
  // family's fixtures with what it needs. Their Payload fields are their block's.
  "sections/media-with-text-overlap": {
    summary:
      "The text on a card that overlaps the picture's edge: beside it from lg, rising over its bottom edge on a phone.",
    a11y: [
      "The card is on the card fill, never on the picture, so the text keeps the theme's contrast.",
      "The order in the markup is the reading order at every width; the side is set with grid columns from lg.",
    ],
    live: (ctx) => mediaWithText(ctx, "section", undefined, "overlap"),
    statesLayout: "stack",
    states: [
      {
        id: "start",
        label: "Picture first, long heading",
        description: "`imageSide: start`, the card on the end side, and a heading that wraps.",
        render: (ctx) => mediaWithText(ctx, "long", undefined, "overlap"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The card on the muted section; its own fill keeps it apart.",
        render: (ctx) => mediaWithText(ctx, "section", muted, "overlap"),
      },
    ],
  },
  "sections/media-with-text-full-bleed": {
    summary:
      "The picture fills the band and the text lies over it on the overlay scrim; when it opens a page, the transparent header lies over the picture.",
    a11y: [
      "Text on the picture only on the overlay token's scrim (60 % black): light text keeps 5.7:1 on a white photo (D100); the links and the focus ring are turned light inside it.",
      "The section says it has a picture behind its words (`data-under-header`), so the shell's rule may lay the transparent header over it (D103).",
    ],
    live: (ctx) => mediaWithText(ctx, "section", undefined, "full-bleed"),
    statesLayout: "stack",
    states: [
      {
        id: "start",
        label: "Picture's side start, long heading",
        description: "`imageSide: start` puts the text at the end; the heading wraps on the scrim.",
        render: (ctx) => mediaWithText(ctx, "long", undefined, "full-bleed"),
      },
    ],
  },
  "sections/usp-bar-strip": {
    summary:
      "A thin row of small icons and titles for under the header, centred on a wide screen and scrolling sideways on a phone.",
    a11y: [
      "A list named “What we promise”: on a phone it scrolls in its own box, which takes the focus so the keyboard can scroll it.",
      "The icons are decoration; the titles say what each promise is. The lines under them are left out.",
    ],
    live: (ctx) => (
      <UspBarSection {...fixtures(ctx).uspBar.section} variant="strip" copy={copy(ctx)} />
    ),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface, small spacing",
        description: "As a band under the header: `surface: muted`, `spacing: small`.",
        render: (ctx) => (
          <UspBarSection
            {...fixtures(ctx).uspBar.section}
            variant="strip"
            settings={{ surface: "muted", spacing: "small" }}
            copy={copy(ctx)}
          />
        ),
      },
      {
        id: "long",
        label: "Long titles",
        description: "Three promises with a long title: the row scrolls on a phone.",
        render: (ctx) => (
          <UspBarSection {...fixtures(ctx).uspBar.long} variant="strip" copy={copy(ctx)} />
        ),
      },
    ],
  },
  "sections/logo-cloud-grid": {
    summary:
      "The logos in equal cells of a ruled grid: two across on a phone, three from md, four from lg.",
    a11y: [
      "Each logo's alternative text is the brand's name.",
      "A logo with a link makes its whole cell the target (well over 44 px), which opens the brand's site in a new tab and says so.",
    ],
    live: (ctx) => (
      <LogoCloudSection {...fixtures(ctx).logoCloud.section} variant="grid" copy={copy(ctx)} />
    ),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface, no heading",
        description: "`surface: muted`, and the heading left empty.",
        render: (ctx) => {
          const { heading: _heading, ...section } = fixtures(ctx).logoCloud.section;
          return <LogoCloudSection {...section} variant="grid" settings={muted} copy={copy(ctx)} />;
        },
      },
    ],
  },
  "sections/faq-side-heading": {
    summary:
      "The heading in a column of its own beside the questions from lg, held in view while they scroll past; the questions are native disclosures.",
    a11y: [
      "The questions are the first design's details and summaries: 44 px rows that open with Enter or Space without JavaScript.",
      "Like every FAQ, its questions join the page's one FAQPage JSON-LD, which the shop writes once for the page.",
    ],
    live: (ctx) => faq(ctx, "section", "none", undefined, "side-heading"),
    statesLayout: "stack",
    states: [
      {
        id: "open",
        label: "One open",
        description: "The first question open: its chevron turned, its answer below.",
        render: (ctx) => faq(ctx, "section", "first", undefined, "side-heading"),
      },
      {
        id: "long",
        label: "Long question, muted",
        description: "A long question wraps beside its chevron, on the muted fill.",
        render: (ctx) => faq(ctx, "long", "first", muted, "side-heading"),
      },
    ],
  },
  "sections/testimonials-single": {
    summary:
      "One quote, large and centred under the heading: its stars, its words in display type and who said them.",
    a11y: [
      "The quote is a figure: the words a blockquote, its author the figcaption.",
      "It draws the editor's first quote; the stars are one image named in the page's language.",
    ],
    live: (ctx) => testimonials(ctx, "section", "single"),
    statesLayout: "stack",
    states: [
      {
        id: "long",
        label: "Long quote",
        description: "The longest review and a long name, wrapping in the centre.",
        render: (ctx) => testimonials(ctx, "long", "single"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the words and the stars keep their contrast.",
        render: (ctx) => testimonials(ctx, "section", "single", inverse),
      },
    ],
  },
  "sections/testimonials-carousel": {
    summary:
      "A row of quote cards that scrolls, with previous and next buttons; nothing moves by itself.",
    a11y: [
      "One region named by the heading, described as a carousel; each card is a slide named “2 of 6”.",
      "Only the visitor moves it: the 44 px buttons, the arrow keys, a swipe, or Tab into a card out of view (WCAG 2.2.2). The buttons stay focusable at the ends.",
    ],
    live: (ctx) => testimonials(ctx, "wall", "carousel"),
    statesLayout: "stack",
    states: [
      {
        id: "three",
        label: "Three quotes, muted",
        description: "Three quotes on the muted fill: all in view from lg, the buttons off.",
        render: (ctx) => testimonials(ctx, "section", "carousel", muted),
      },
    ],
  },
  "sections/testimonials-wall": {
    summary:
      "Short quotes in columns of different heights: one on a phone, two from md, three from lg.",
    a11y: [
      "A list of figures; the reading order is the editor's, down the first column and then the next.",
      "A card is never split between two columns.",
    ],
    live: (ctx) => testimonials(ctx, "wall", "wall"),
    statesLayout: "stack",
    states: [
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the cards and the stars keep their contrast.",
        render: (ctx) => testimonials(ctx, "wall", "wall", inverse),
      },
    ],
  },
  "sections/promo-banner-strip": {
    summary:
      "A thin band with the offer on one line where it fits: the heading, its words, the code to copy and the link; the end and the small print under it.",
    a11y: [
      "The heading is an h2; the code's copy button is named “Copy code WELCOME10” and says when it has copied.",
      "The band is on the muted fill: its text keeps the theme's contrast pairing. No picture.",
    ],
    live: (ctx) => promoBanner(ctx, "section", undefined, "strip"),
    statesLayout: "stack",
    states: [
      {
        id: "plain",
        label: "Words and code only",
        description: "No end, link or small print.",
        render: (ctx) => promoBanner(ctx, "plain", undefined, "strip"),
      },
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the band and the code's box turn with the theme.",
        render: (ctx) => promoBanner(ctx, "section", inverse, "strip"),
      },
    ],
  },
  "sections/promo-banner-ticket": {
    summary:
      "A coupon card centred in the section: the offer on one side of a perforated line, the code to copy and the link on the other.",
    a11y: [
      "The perforation and its notches are decoration (hidden from assistive technology).",
      "Reading order: the heading, the words and the end, then the code and the link, then the small print.",
    ],
    live: (ctx) => promoBanner(ctx, "section", undefined, "ticket"),
    statesLayout: "stack",
    states: [
      {
        id: "plain",
        label: "Words and code only",
        description: "No end, link or small print.",
        render: (ctx) => promoBanner(ctx, "plain", undefined, "ticket"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The notches are cut in the muted fill.",
        render: (ctx) => promoBanner(ctx, "section", muted, "ticket"),
      },
    ],
  },
  "sections/promo-banner-full-bleed": {
    summary:
      "The picture fills the band and the offer lies over it on the overlay scrim; when it opens a page, the transparent header lies over the picture.",
    a11y: [
      "Text on the picture only on the overlay token's scrim (D100); the code's box, the link and the focus ring are turned light inside it.",
      "The section says it has a picture behind its words (`data-under-header`), D103.",
    ],
    live: (ctx) => promoBanner(ctx, "section", undefined, "full-bleed"),
    statesLayout: "stack",
    states: [
      {
        id: "muted",
        label: "Muted surface",
        description: "The band is the picture's; the section's space under it is muted.",
        render: (ctx) => promoBanner(ctx, "section", muted, "full-bleed"),
      },
    ],
  },
  "sections/promo-banner-countdown": {
    summary:
      "The offer around a large countdown to its end, centred in a card, then the code to copy and the link.",
    a11y: [
      "The countdown is CountdownTimer's: a timer that is not announced every second, its sentence saying when the offer ends; its end is announced once (WCAG 4.1.3).",
      "It counts from the time the server rendered at (D50), frozen here at the fixtures' time.",
    ],
    live: (ctx) => promoBanner(ctx, "countdown"),
    statesLayout: "stack",
    states: [
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the card and the digits turn with the theme.",
        render: (ctx) => promoBanner(ctx, "countdown", inverse),
      },
    ],
  },
  "sections/promo-banner-popup": {
    summary:
      "The offer as a card at the window's end corner, once per visitor and after the cookie choice; it takes no focus and goes with Close or Escape. Drawn here in place.",
    a11y: [
      "A region named by the offer's heading, not a dialog: it takes no focus and leaves the page usable; its height is kept clear at the page's end while it is shown (WCAG 2.4.11).",
      "It never opens before the cookie banner is answered, nor over it; the close button is a 44 px icon button named “Close”.",
      "Without scripts the offer is drawn in its place as the first design.",
    ],
    live: (ctx) => promoBanner(ctx, "section", undefined, "popup"),
    statesLayout: "stack",
    states: [
      {
        id: "plain",
        label: "Words and code only",
        description: "No end, link or small print.",
        render: (ctx) => promoBanner(ctx, "plain", undefined, "popup"),
      },
    ],
  },
  "sections/comparison-cards": {
    summary:
      "A card per product with its price and the table's rows stacked under it, side by side from md; nothing scrolls sideways.",
    a11y: [
      "The heading is an h2 and each product's name an h3 link to its page; the rows are a description list.",
      "A missing value is a dash read as “Not specified”.",
    ],
    live: (ctx) => comparison(ctx, "section", undefined, "cards"),
    statesLayout: "stack",
    states: [
      {
        id: "two",
        label: "Two products, one value missing",
        description: "Two cards side by side from md.",
        render: (ctx) => comparison(ctx, "two", undefined, "cards"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The cards on the muted fill.",
        render: (ctx) => comparison(ctx, "section", muted, "cards"),
      },
    ],
  },
  "sections/comparison-highlight": {
    summary:
      "The table with one product the editor marks as the pick: its column set apart and named “Our pick”.",
    a11y: [
      "“Our pick” is in the column's header, so a screen reader says it with the product as it reads that column's cells.",
      "The column is set apart by its rules and its fill, not by colour alone: the badge names it.",
    ],
    live: (ctx) => comparison(ctx, "highlight"),
    statesLayout: "stack",
    states: [
      {
        id: "inverse",
        label: "Inverse surface",
        description: "`surface: inverse`: the pick's rules and badge turn with the theme.",
        render: (ctx) => comparison(ctx, "highlight", inverse),
      },
    ],
  },
  "sections/newsletter-split": {
    summary:
      "The editor's picture beside the signup, the form on the end side from md and under the picture on a phone.",
    a11y: [
      "The form is NewsletterForm: one email field, the consent sentence with the privacy link and the four states, posting without a script.",
      "The picture has the editor's alternative text.",
    ],
    live: (ctx) => newsletter(ctx, "split"),
    statesLayout: "stack",
    states: [
      {
        id: "done",
        label: "Signed up",
        description: "The answer after the form was sent.",
        render: (ctx) => newsletter(ctx, "split", "done"),
      },
      {
        id: "error",
        label: "Not sent",
        description: "The form's answer when it could not be sent.",
        render: (ctx) => newsletter(ctx, "split", "error"),
      },
    ],
  },
  "sections/editorial-list-featured": {
    summary:
      "The journal's first post large, with its summary, and the others as a list beside it from lg.",
    a11y: [
      "Each post is an article whose title is its one link, stretched over it; the titles are h3s under the section's heading.",
      "The pictures are decoration; each date is a `<time>` in the market's time zone and language.",
    ],
    live: (ctx) => editorialList(ctx, "featured"),
    statesLayout: "stack",
    states: [
      {
        id: "one",
        label: "One post, long title",
        description: "One post alone is drawn large, with no list beside it.",
        render: (ctx) => editorialList(ctx, "long", undefined, "featured"),
      },
      {
        id: "muted",
        label: "Muted surface",
        description: "The posts on the muted fill.",
        render: (ctx) => editorialList(ctx, "featured", muted),
      },
    ],
  },
} satisfies Partial<Record<EntryId, DsStory>>;
