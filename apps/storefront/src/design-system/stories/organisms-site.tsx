// Ours (T36, SETUP.md "Footers and site organisms (T36)"; D44, D45). The stories of CookieConsent and
// the loading skeletons. Sample data is `commerceFixtures[ctx.locale].site.cookieConsent` (the
// policy link alone, the shop's own sentence, and the three choices a visitor can have made), the
// copy is `catalogs[ctx.locale].organisms`, and the locale every `Intl` call uses is the market's
// `<html lang>`. Every link is drawn with `prefetch={false}`: the cookie policy's page answers 404
// until M3.
//
// CookieConsent is `position: fixed`, so each banner is drawn inside an `OverlayBox` (D45), which is
// a containing block for fixed boxes and clips what spills out, and the dialog is drawn open in the
// same box (`defaultDialogOpen`, `modal={false}`, its portal in the box). The live render runs the
// real island, the way a shop's page does: the banner is not in the server's markup, and the
// `VisitorFixture` beside it hands the store a visitor who has not chosen once the page has
// hydrated, so the banner appears after hydration. The states are pictures: they give the
// organism `choice={null}` directly, so they do not wait for the store and do not share it, and a
// choice made in one of them changes nothing on the page.
//
// Each box is taller than what it holds at 375 px in the longest language, so nothing is cut (the
// heights are measured, see the constants below), and the dialog's popup is capped to the box
// (`max-h-[calc(100%-2rem)]`: the window's `100dvh` means nothing inside it) with its entry
// animation switched off (`duration-0`) in the states, as no state is a picture of an animation. The
// live render's dialog is a real one, modal and animated, in a box that holds it from 768 px up and a
// cap that makes it scroll inside itself at 375 px. The reservation of the banner's height at the
// end of the page (WCAG 2.4.11) is the organism's own and runs here as it does in a shop, so this
// page ends with the height of its tallest banner in blank space.
//
// Every banner is a landmark of the same page as the others, so its region is named apart with the
// state's label, in brackets (`wordsFor`), as the headers' are: two regions named alike on one page
// confuse a screen-reader user. The loading skeletons do the same, each layout's region.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { LoadingSkeleton as LoadingSkeletonContent } from "@shopblok/registry/contracts";
import { CookieConsent, type CookieConsentProps } from "@shopblok/ui/organisms/cookie-consent";
import {
  LoadingSkeleton,
  type LoadingSkeletonProps,
} from "@shopblok/ui/organisms/loading-skeletons";
import { VisitorCookieConsent } from "../../lib/visitor/cookie-consent";
import { OverlayBox } from "../components/overlay-box";
import { VisitorFixture } from "../components/visitor-fixture";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].organisms;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

// --- CookieConsent ---

// The heights were measured in Chromium (Inter, the storefront's stylesheet) in en, el, de and fr at
// 375, 768 and 1440 px: the banner is at most 377 px tall (Greek and French at 375 px) and the dialog
// at most 846 px (Greek at 375 px), and 657 px at 768 px and wider.
/** The box a banner is drawn in: the tallest banner and a strip of the "page" above it. */
const BANNER_BOX = 520;
/** The box a dialog is drawn in: the tallest popup with room above and below it. */
const DIALOG_BOX = 960;
/**
 * The live render's box: a modal dialog opened by hand is as tall as its words, so the box holds it
 * from 768 px up, and the cap below makes it scroll inside itself at 375 px, as it does in a short window.
 */
const LIVE_BOX = 700;

/** The popup, capped to its box (the window's height means nothing inside it). */
const cappedPopup = "max-h-[calc(100%-2rem)]";
/** The same, and still: no state is a picture of an animation. */
const stillPopup = `${cappedPopup} duration-0`;

/** The catalog's words with the banner's region named for one state. */
function wordsFor(ctx: DsContext, state: string): CookieConsentProps["copy"] {
  const words = copy(ctx).cookieConsent;
  return { ...words, region: `${words.region} (${state})` };
}

/** One state of the banner: drawn for a visitor who has not chosen, in a box of its own. */
function consentState(spec: {
  id: string;
  label: string;
  description: string;
  height: number;
  /** What the state changes: the shop's own sentence, the dialog open, a switch on. */
  props?: (ctx: DsContext) => Partial<CookieConsentProps>;
}): DsState {
  const { id, label, description, height, props = () => ({}) } = spec;
  return {
    id,
    label,
    description,
    render: (ctx) => (
      <OverlayBox name={label} height={height}>
        <CookieConsent
          {...fixtures(ctx).site.cookieConsent.copy}
          copy={wordsFor(ctx, label)}
          locale={lang(ctx)}
          choice={null}
          prefetch={false}
          {...props(ctx)}
        />
      </OverlayBox>
    ),
  };
}

const cookieConsentStates: readonly DsState[] = [
  consentState({
    id: "banner",
    label: "Banner, the copy's sentence",
    description:
      "A visitor who has not chosen: the heading, the catalog's sentence with the link to the cookie policy in it, and three buttons. Accept all and reject all are the same button, side by side; choose cookies is the quieter outline button.",
    height: BANNER_BOX,
  }),
  consentState({
    id: "banner-shop-message",
    label: "Banner, the shop's own sentence",
    description:
      "The shop's own sentence in place of the catalog's, with the link to the cookie policy after it. The buttons are the catalog's.",
    height: BANNER_BOX,
    props: (ctx) => ({ ...fixtures(ctx).site.cookieConsent.message }),
  }),
  consentState({
    id: "dialog",
    label: "Dialog, nothing chosen",
    description:
      "Choose cookies, opened: necessary is on and fixed, analytics and marketing are switches that are off. Reject all and accept all are the same button, and save records the switches. Drawn open and not modal, with the banner behind it.",
    height: DIALOG_BOX,
    props: () => ({ defaultDialogOpen: true, modal: false, popupClassName: stillPopup }),
  }),
  consentState({
    id: "dialog-analytics",
    label: "Dialog, analytics on",
    description:
      "The dialog as a visitor who chose analytics before would see it when they open it again: the analytics switch is on, marketing is off.",
    height: DIALOG_BOX,
    props: (ctx) => ({
      defaultDialogOpen: true,
      modal: false,
      defaultSwitches: fixtures(ctx).site.cookieConsent.choices.analytics,
      popupClassName: stillPopup,
    }),
  }),
];

// --- LoadingSkeleton ---

type SkeletonWords = LoadingSkeletonProps["copy"];

/** The catalog's four names with the state's label after each, so no two regions of the page are named alike. */
function skeletonWordsFor(ctx: DsContext, state: string): SkeletonWords {
  const words = copy(ctx).loadingSkeleton;
  const named = (name: string) => `${name} (${state})`;
  return {
    productGrid: named(words.productGrid),
    productPage: named(words.productPage),
    cart: named(words.cart),
    accountList: named(words.accountList),
  };
}

function skeletonState(
  id: string,
  label: string,
  description: string,
  content: LoadingSkeletonContent,
): DsState {
  return {
    id,
    label,
    description,
    render: (ctx) => <LoadingSkeleton {...content} copy={skeletonWordsFor(ctx, label)} />,
  };
}

const loadingSkeletonStates: readonly DsState[] = [
  skeletonState(
    "product-grid",
    "Product grid",
    "Eight cards in a listing's columns: two under 768 px, three from 768 px and four from 1024 px. Each card has the product card's 3:4 picture, the 44 px of its title and a price line.",
    { layout: "product-grid" },
  ),
  skeletonState(
    "product-page",
    "Product page",
    "The gallery beside the buy box, stacked under 768 px: a picture and four thumbnails, then the title, the price, the options, the add to cart button and two lines of delivery notes.",
    { layout: "product-page" },
  ),
  skeletonState(
    "cart",
    "Cart",
    "Three lines like a cart line's (a thumbnail, the title and an option, the quantity stepper and the price), then the summary: under the lines below 1024 px, beside them from 1024 px.",
    { layout: "cart" },
  ),
  skeletonState(
    "account-list",
    "Account list",
    "Four rows like an order or an address: a title, two lines and a status on the end.",
    { layout: "account-list" },
  ),
  skeletonState(
    "few-items",
    "Fewer items",
    "The product grid asked for three cards: the last row is not filled, and each card is the same size as in the full grid.",
    { layout: "product-grid", items: 3 },
  ),
];

export const siteOrganismStories = {
  "organisms/cookie-consent": {
    summary:
      "The banner fixed to the bottom of the window that asks a visitor who has not chosen to accept all cookies, reject all or choose; it is per visitor, so the server draws nothing and the browser draws it after hydration.",
    a11y: [
      "The banner is a region named “Cookie consent” that holds a heading, the sentence with a link to the cookie policy and three buttons. It is drawn after hydration and only for a visitor who has not chosen, so a prerendered page is the same for everyone (D44); without JavaScript it is never drawn and no optional cookie is ever set.",
      "It is a region and not a dialog on purpose. It appears after the page has loaded, under the reader's hands, so it takes no focus; it does not hide the page behind it from assistive technology and it traps nothing, because the page stays usable while it is shown: a cookie wall is not consent. A reader finds it by its landmark and in the page's order.",
      "“Accept all” and “Reject all” are the same button: the same variant and the same size, next to each other and in the same order at every width (stacked, both full width, under 640 px; from 640 px each is as wide as its words). Refusing is as easy as agreeing. “Choose cookies” is the quieter outline button, the third way and not a way out.",
      "“Choose cookies” opens a dialog with three categories. Necessary is on and cannot change: its switch is checked and unavailable, “Always on” is written beside it as text that is not dimmed, and a screen reader reads “Necessary, switch, on, unavailable” and then that it is always on. Analytics and marketing are switches named by their label and described by their sentence, and both are off until the visitor turns them on: nothing is pre-ticked.",
      "Opening the dialog moves focus to its first switch and Tab stays inside it. While it is open the page behind it is hidden from assistive technology, and Escape or the close button closes it and puts focus back on “Choose cookies”. The dialog's “Accept all” and “Reject all” are the banner's two buttons again, and “Save my choices” records the switches as they stand.",
      "After a choice the banner goes and keyboard focus moves to the control that follows it in the page, where the next Tab would have gone, and not to the top of the page. A choice made in the dialog waits until the dialog has left the page, so focus never lands on the dialog's own buttons as they go.",
      "WCAG 2.4.11 (Focus Not Obscured): the banner is fixed to the bottom of the window, so while it is shown its height is reserved at the end of the page, as padding and as scroll padding on the root element, measured again whenever the banner changes size. A control the reader tabs to is scrolled clear of the banner and the page's last links can scroll above it; the reservation is given back when the banner goes. Here the banners sit in boxes, but the reservation is the real one, so this page ends with some blank space.",
      "Every button, switch and link is at least 44 px. The words wrap in every language and are never cut. A banner taller than 60 % of the window scrolls inside itself rather than cover a short window or a page zoomed to 400 %, and the dialog does the same.",
    ],
    live: (ctx) => (
      <OverlayBox name={copy(ctx).cookieConsent.region} height={LIVE_BOX}>
        <VisitorCookieConsent
          {...fixtures(ctx).site.cookieConsent.copy}
          copy={copy(ctx).cookieConsent}
          locale={lang(ctx)}
          prefetch={false}
          popupClassName={cappedPopup}
        />
        <VisitorFixture consent={null} />
      </OverlayBox>
    ),
    states: cookieConsentStates,
    statesLayout: "stack",
  },
  "organisms/loading-skeletons": {
    summary:
      "What a page draws while its content is on the way: four layouts shaped like the product grid, the product page, the cart and an account list, each one busy region that is read as a single name.",
    a11y: [
      "Each layout is one region named for what is loading (“Loading products”, “Loading the product”, “Loading your cart” or “Loading your account”) with aria-busy set to true, so a screen reader reaches it as one named, busy region and hears that name once.",
      "Every shape inside it is hidden from assistive technology, and so is the box that holds them, so no empty list or group is exposed. The region holds no text and there is no live region, per item or at all: a grid of eight cards announces one string, not eight, and the page is not interrupted when the skeletons appear or when the content replaces them.",
      "Nothing in a skeleton is a link or a button or can take focus, so a reader's place in the page is not lost when the content arrives.",
      "Each layout is shaped like what it stands in for, down to the sizes: the card has the product card's 3:4 picture, a title box as tall as its 44 px link and a price line; the cart's lines and summary follow the cart's, and the account list its rows. Nothing moves when the content arrives, so the layout shift is zero.",
      "Under reduced motion the shapes do not pulse; they are plain boxes in the muted colour.",
      "Every box can shrink, so nothing is wider than a 375 px window. The grid is two columns under 768 px, three from 768 px and four from 1024 px, as a listing is.",
    ],
    live: (ctx) => <LoadingSkeleton layout="product-grid" copy={copy(ctx).loadingSkeleton} />,
    states: loadingSkeletonStates,
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
