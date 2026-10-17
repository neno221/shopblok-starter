// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4 and §13, D42, D45, D46). The
// stories of the five footers. Sample data is `commerceFixtures[ctx.locale].footer` (`content`, which
// every footer draws: three columns, the newsletter, five profiles, four legal links, all eight
// payment marks, the markets and the copyright; and `bare`, the least a shop can have), the long
// column in `.long.footerColumn`, the navigation's mega menu for two more columns, and the strings
// in `ctx.fixture.long`. The copy is `catalogs[ctx.locale]`, and the locale every `Intl` call uses
// is the market's `<html lang>`. Every link is drawn with `prefetch={false}`: the pages a footer
// points to answer 404 until M3.
//
// The live render is the footer the way a page draws it: the fixtures' `content`, `prefetch={false}`
// and no `newsletterAction` (M3's server action), so the form is the plain form that posts to its
// own page. A footer has no per-visitor part (D44): the cart's count and the cookie banner are the
// header's and the site's, so nothing here waits for the browser.
//
// Every state is a landmark of the same page as the others, so its two navigations (the columns'
// and the legal links') are named apart with the state's label, in brackets, as the headers' are
// (`wordsFor`): two navigations named alike on one page confuse a screen-reader user, who then has
// to guess which is which. The states that depend on a width say so: the accordion of the columns
// exists below `md` (768 px), so the state that draws a column open is drawn for windows narrower
// than that, and a note takes its place from there, as the headers' drawer states do.
//
// The two-tier footer's switcher is drawn open in an `OverlayBox` (D45) with the footers' `drawn`
// prop, which passes the organisms' own ways of starting open (`defaultOpen`, `modal={false}`, the
// sheet's slide switched off). The footer is reduced in those two states to its logo and its bar
// (no columns, newsletter or profiles): the switcher is at the foot of the footer, and a popup
// that opens under its trigger needs the room under it, which a box that also held the columns
// would have to be a screen taller to give. The popover's box is taller than the sheet's, since
// the sheet rises from the bottom of its box.
//
// What the minimal footer leaves out of the contract (the columns, the newsletter, the payment
// marks and the logo) is said in its summary and its notes: a single row has no room for a list of
// links or a form, so it has no states about them either.
//
// Every story sets `statesLayout: "stack"`: a footer follows the window's breakpoints, so a state
// has the frame's whole width, one under the other.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { Footer, FooterColumn, SocialLink } from "@shopblok/registry/contracts";
import { FooterMinimal } from "@shopblok/ui/organisms/footer/minimal";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { FooterNewsletterFirst } from "@shopblok/ui/organisms/footer/newsletter-first";
import type { FooterProps } from "@shopblok/ui/organisms/footer/parts";
import { FooterTwoTier } from "@shopblok/ui/organisms/footer/two-tier";
import { FooterWordmark } from "@shopblok/ui/organisms/footer/wordmark";
import type { ReactElement } from "react";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The shop's profile on each of the eight networks the footer has a mark for, in the contract's order. */
const everyNetwork: readonly SocialLink[] = [
  { network: "instagram", href: "https://www.instagram.com/shopblok" },
  { network: "facebook", href: "https://www.facebook.com/shopblok" },
  { network: "tiktok", href: "https://www.tiktok.com/@shopblok" },
  { network: "youtube", href: "https://www.youtube.com/@shopblok" },
  { network: "pinterest", href: "https://www.pinterest.com/shopblok" },
  { network: "x", href: "https://x.com/shopblok" },
  { network: "threads", href: "https://www.threads.com/@shopblok" },
  { network: "bluesky", href: "https://bsky.app/profile/shopblok.bsky.social" },
];

/** The catalog's words with the columns' navigation and the legal navigation named for one state. */
function wordsFor(ctx: DsContext, state: string): FooterProps["copy"] {
  const words = catalogs[ctx.locale].organisms.footer;
  return {
    ...words,
    navigation: `${words.navigation} (${state})`,
    legal: `${words.legal} (${state})`,
  };
}

/**
 * The footer's props: the fixtures' `content` (or the base given), the catalogs' words and no
 * prefetching. A state's `label` names its landmarks apart; the live render has the catalog's names.
 */
function footerProps(
  ctx: DsContext,
  over: Partial<FooterProps> = {},
  label?: string,
  base: Footer = fixtures(ctx).footer.content,
): FooterProps {
  const catalog = catalogs[ctx.locale];
  return {
    ...base,
    copy: label === undefined ? catalog.organisms.footer : wordsFor(ctx, label),
    newsletterCopy: catalog.molecules.newsletterForm,
    marketSwitcherCopy: catalog.molecules.marketSwitcher,
    locale: lang(ctx),
    prefetch: false,
    ...over,
  };
}

/** Five columns, the most the contract takes: the footer's three and two of the mega menu's. */
function fiveColumns(ctx: DsContext): FooterColumn[] {
  const mega = fixtures(ctx).navigation.find((item) => item.kind === "megaMenu");
  const more = (mega?.columns ?? []).slice(0, 2).map(({ title, links }) => ({ title, links }));
  return [...fixtures(ctx).footer.content.columns, ...more];
}

/** What differs between the five: how a footer is drawn, and what it has to be shown. */
type Spec = {
  summary: string;
  a11y: readonly string[];
  draw: (props: FooterProps) => ReactElement;
  /** The footer draws the columns, so the states about them apply (all but the minimal one). */
  columns: boolean;
  /** The footer draws the newsletter. */
  newsletter: boolean;
  /** What the bare footer shows beyond the two legal links and the copyright. */
  bare: string;
  /** What leaving out the newsletter does to this footer. */
  withoutNewsletter: string;
};

/** A state drawn with nothing open: the props it changes, and its own landmark names. */
function plainState(
  spec: Spec,
  id: string,
  label: string,
  description: string,
  over: (ctx: DsContext) => Partial<FooterProps> = () => ({}),
  base?: (ctx: DsContext) => Footer,
): DsState {
  return {
    id,
    label,
    description,
    render: (ctx) => spec.draw(footerProps(ctx, over(ctx), label, base?.(ctx))),
  };
}

/** The states every footer has; the ones about columns and the newsletter where it has them. */
function commonStates(spec: Spec): DsState[] {
  const states: DsState[] = [
    plainState(
      spec,
      "bare",
      "Bare footer",
      `The fixtures' bare footer: two legal links and the copyright, and no columns, newsletter, profiles, payment marks or market switcher. ${spec.bare}`,
      () => ({}),
      (ctx) => fixtures(ctx).footer.bare,
    ),
  ];
  if (spec.newsletter) {
    states.push(
      plainState(
        spec,
        "no-newsletter",
        "No newsletter",
        `A shop with no signup form: the newsletter is left out and everything else stays. ${spec.withoutNewsletter}`,
        () => ({ newsletter: undefined }),
      ),
    );
  }
  states.push(
    plainState(
      spec,
      "long",
      "Long labels",
      spec.columns
        ? "The longest store name, a column with the longest title and links of the locale, a legal link at the longest length and a long copyright line: the logo, the headings, the links and the line wrap, and nothing is cut."
        : "The longest store name in the copyright line, a legal link at the longest length and a long copyright line: the row wraps onto more lines, and nothing is cut.",
      (ctx) => {
        const strings = ctx.fixture.long;
        const { footer, long } = fixtures(ctx);
        return {
          storeName: strings.storeName,
          columns: [long.footerColumn, ...footer.content.columns.slice(0, 2)],
          legalLinks: footer.content.legalLinks.map((link, index) =>
            index === 0 ? { ...link, label: strings.linkLabel } : link,
          ),
          copyright: `© 2026 ${strings.storeName}. ${strings.helpText}`,
        };
      },
    ),
  );
  if (spec.columns) {
    states.push(
      plainState(
        spec,
        "five-columns",
        "Five columns",
        "The most the contract takes: the footer's three columns and two of the mega menu's. Where the row is too short for five columns of 10rem they wrap onto a second row instead of shrinking past their words.",
        (ctx) => ({ columns: fiveColumns(ctx) }),
      ),
    );
  }
  states.push(
    plainState(
      spec,
      "all-networks",
      "All eight networks",
      "A profile on every network the footer has a mark for, in the contract's order: Instagram, Facebook, TikTok, YouTube, Pinterest, X, Threads and Bluesky, each a 44 px link named for the store and the network, wrapping onto a second row where the room is short.",
      () => ({ social: everyNetwork.map((profile) => ({ ...profile })) }),
    ),
  );
  if (spec.columns) {
    states.push({
      id: "column-open",
      label: "Column open",
      description:
        "Below 768 px each column is an accordion item, closed at first; here the second column is drawn open, with its trigger saying so and its links under it, and the other two closed.",
      render: (ctx) => (
        <>
          <p className="hidden px-1 text-sm text-muted-foreground md:block">
            The columns are an accordion in windows narrower than 768 px; from there they stand side
            by side and every list is open (see the live render).
          </p>
          <div className="md:hidden">
            {spec.draw(footerProps(ctx, { drawn: { column: 1 } }, "Column open"))}
          </div>
        </>
      ),
    });
  }
  return states;
}

/** A story from a spec: the live render with the fixtures' footer, and the states. */
function story(spec: Spec, tail: DsState[] = []): DsStory {
  return {
    summary: spec.summary,
    a11y: spec.a11y,
    live: (ctx) => spec.draw(footerProps(ctx)),
    states: [...commonStates(spec), ...tail],
    statesLayout: "stack",
  };
}

// What the footers' a11y notes say, once each.
const landmarksNote =
  "The footer is the page's contentinfo landmark. The columns of links are one navigation landmark named by the catalog's “Footer”, and the legal links are another, named “Legal”, so a screen-reader user can jump to either from the landmarks list.";
const columnsNote =
  "Each column is a heading at level 2 over a list of links. Below 768 px the columns are an accordion: each heading holds a button that opens its list and says whether it is open (Enter or Space toggles it, and several can be open at once), with every column closed at first. From 768 px the columns stand side by side and every list is open. The links of every column are in the page's HTML at both widths, closed panels included, so a crawler or find-in-page reaches them, and a link that opens another site opens a new tab and says so after its text.";
const newsletterNote =
  "The newsletter is a form named by its heading, “Join our newsletter”, with a labelled email field, a Subscribe button and a consent sentence that links to the privacy policy; the result of sending it is announced politely.";
const socialNote =
  "The profiles are a heading, “Follow us”, over a list of icon links. Each link is named for the store and the network (“Shopblok on Instagram”), the drawing is hidden from assistive technology, and the link is a 44 px square.";
const switcherNote =
  "The market switcher is one button named by the market it shows (“Country and language: United States, English, USD”). From 768 px it opens a popover and below that a bottom sheet; either keeps focus inside, closes on Escape and gives focus back to the button, and each language in it is a link.";
const paymentNote =
  "The ways to pay are a list named “Ways to pay” of marks, each an image named by its brand (“Visa”, “PayPal”), so a screen reader reads what the shop accepts; they are not controls and take no focus.";
const targetsNote =
  "Every link and button is at least 44 px square, the focus ring is at full strength, the small text keeps a contrast of 4.5 to 1 on the footer's muted ground, and long labels wrap and are never cut.";

// --- The five ---

const multiColumn: Spec = {
  summary:
    "The multi-column footer: the logo, then the columns of links and the newsletter in a row, then a bottom row with the profiles, the market switcher, the legal links, the payment marks and the copyright.",
  a11y: [
    landmarksNote,
    columnsNote,
    "The newsletter is the last column from 1024 px, in a box of 22rem so that its field and button stack, and under the columns below that width; the logo is a link named “Shopblok, home”.",
    newsletterNote,
    socialNote,
    switcherNote,
    paymentNote,
    targetsNote,
  ],
  draw: (props) => <FooterMultiColumn {...props} />,
  columns: true,
  newsletter: true,
  bare: "The logo and the bottom row are still there.",
  withoutNewsletter: "The columns take the whole row.",
};

const newsletterFirst: Spec = {
  summary:
    "The newsletter-first footer: a signup band across the full width at the top, then the logo and the columns, then the bottom row.",
  a11y: [
    landmarksNote,
    "The band comes first in the footer, so the form's heading is the first heading a screen reader meets in it and its field the first control a keyboard reaches; the band is part of the footer's landmark, not a region of its own, and it sits on the page's ground so it stands apart from the muted footer under it.",
    newsletterNote,
    columnsNote,
    socialNote,
    switcherNote,
    paymentNote,
    targetsNote,
  ],
  draw: (props) => <FooterNewsletterFirst {...props} />,
  columns: true,
  newsletter: true,
  bare: "The band is left out with the newsletter, and the logo and the bottom row remain.",
  withoutNewsletter: "The band is not drawn and the footer begins with the logo and the columns.",
};

const minimal: Spec = {
  summary:
    "The minimal footer: one row that wraps, with the copyright at the start and the legal links, the profiles and the market switcher at the end, leaving out the columns, the newsletter, the payment marks and the logo because a single row has no room for them.",
  a11y: [
    "The footer is the page's contentinfo landmark. It has no columns of links, so its one navigation landmark is the legal links, named by the catalog's “Legal”, which a screen-reader user can jump to from the landmarks list.",
    "The columns, the newsletter, the payment marks and the logo are left out of this footer, on purpose: a shop that picks a single row has chosen to say little, and the header above already holds the logo, so there is no logo link here and the copyright line names the store.",
    "The profiles keep their heading, “Follow us”, for a screen reader and leave it off the screen, because a row has no room for a caption; each icon link is named for the store and the network (“Shopblok on Instagram”), the drawing is hidden from assistive technology, and the link is a 44 px square.",
    switcherNote,
    "The row wraps: on a narrow screen the legal links, the profiles and the switcher fall under the copyright, in the same order for a keyboard and a screen reader.",
    targetsNote,
  ],
  draw: (props) => <FooterMinimal {...props} />,
  columns: false,
  newsletter: false,
  bare: "That is all this footer draws from it: the copyright and the legal links.",
  withoutNewsletter: "",
};

const wordmark: Spec = {
  summary:
    "The big wordmark footer: the logo, the columns, the newsletter and the bottom row as the multi-column footer has them, then the store's name set very large across the width of the footer.",
  a11y: [
    landmarksNote,
    "The store's name set large is decoration: it repeats the logo's name, so it is hidden from assistive technology, is not a link and takes no focus, and a screen reader meets the name once, in the logo link named “Shopblok, home”. It scales with the footer's own width (container query units) and a long name wraps onto more lines.",
    columnsNote,
    newsletterNote,
    socialNote,
    switcherNote,
    paymentNote,
    targetsNote,
  ],
  draw: (props) => <FooterWordmark {...props} />,
  columns: true,
  newsletter: true,
  bare: "The wordmark is still drawn, since it needs nothing but the name.",
  withoutNewsletter:
    "The columns take the whole row, and the wordmark is still the last thing in the footer.",
};

const twoTier: Spec = {
  summary:
    "The two-tier footer: a main tier with the logo, the profiles, the columns and the newsletter, and under it a bar with the legal links, the payment marks, the market switcher and the copyright.",
  a11y: [
    landmarksNote,
    "The bar is part of the footer, not a landmark of its own; it holds the legal links, the ways to pay, the market switcher and the copyright line, always drawn since every shop has a copyright.",
    columnsNote,
    newsletterNote,
    socialNote,
    "The bar's market switcher is on the screen at every width, so a visitor on a phone finds the bottom sheet in the bar. " +
      switcherNote,
    paymentNote,
    targetsNote,
  ],
  draw: (props) => <FooterTwoTier {...props} />,
  columns: true,
  newsletter: true,
  bare: "The bar is still drawn, since it holds the copyright, under the logo.",
  withoutNewsletter: "The columns take the whole row of the main tier.",
};

/**
 * The two-tier footer's switcher, drawn open in a box. The footer is reduced to its logo and its
 * bar so the bar is near the top of the box and the popup has the room under it.
 */
function switcherState(
  id: string,
  label: string,
  description: string,
  form: "popover" | "drawer",
  height: number,
): DsState {
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <OverlayBox name={label} height={height}>
        {twoTier.draw(
          footerProps(
            ctx,
            { columns: [], newsletter: undefined, social: [], drawn: { switcher: form } },
            label,
          ),
        )}
      </OverlayBox>
    ),
  };
}

const twoTierTail: DsState[] = [
  switcherState(
    "switcher-popover",
    "Market switcher, popover",
    "The market switcher's popover drawn open under its trigger in the bar, listing every market with its languages; the current one is marked. The footer is reduced to its logo and its bar so the popup has the room under the bar.",
    "popover",
    1040,
  ),
  switcherState(
    "switcher-sheet",
    "Market switcher, sheet",
    "The same switcher as the bottom sheet a narrow window opens: a sheet that rises from the bottom of its box with the same list, over the footer reduced to its logo and its bar.",
    "drawer",
    720,
  ),
];

export const footerStories = {
  "headers-footers/footer-multi-column": story(multiColumn),
  "headers-footers/footer-newsletter-first": story(newsletterFirst),
  "headers-footers/footer-minimal": story(minimal),
  "headers-footers/footer-wordmark": story(wordmark),
  "headers-footers/footer-two-tier": story(twoTier, twoTierTail),
} satisfies Partial<Record<EntryId, DsStory>>;
