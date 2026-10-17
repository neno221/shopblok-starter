import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  AnnouncementBar as AnnouncementBarContent,
  MarketSuggestion,
} from "@shopblok/registry/contracts";
import { AnnouncementBar } from "@shopblok/ui/organisms/announcement-bar";
import { MarketSuggestionBanner } from "@shopblok/ui/organisms/market-suggestion-banner";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of AnnouncementBar and MarketSuggestionBanner (T35, SETUP.md "Navigation and headers
// (T35)"). Sample data is `commerceFixtures[ctx.locale].header` (the bar's messages: one, three in
// turn and one at the length that breaks a layout; the banner's suggestion with the copy's message
// and with the shop's own), the copy is `catalogs[ctx.locale].organisms`, and the locale every
// `Intl` call uses is the market's `<html lang>`.
//
// A state is a picture, so nothing in one may move: every state of a bar with several messages is
// drawn paused (`defaultPaused`) at the message it names (`defaultIndex`). That is also how the bar
// looks to a reader who prefers reduced motion, which starts it paused and never moves it on its
// own, so there is no state of its own for that. The live render is the only one that rotates; the
// DS checks run with reduced motion, which pauses it there too (D50). Every link is told not to
// prefetch: the pages a message points to do not exist before M3, and a prefetch in a production
// build would answer 404 and fail the cell's console check.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].organisms;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

// --- AnnouncementBar ---

function bar(ctx: DsContext, content: AnnouncementBarContent, still?: { defaultIndex: number }) {
  return (
    <AnnouncementBar
      {...content}
      copy={copy(ctx).announcementBar}
      locale={lang(ctx)}
      prefetch={false}
      // A state with several messages stands still at the one it names.
      defaultPaused={still === undefined ? undefined : true}
      defaultIndex={still?.defaultIndex}
    />
  );
}

/** A short message, a long one and another short one: the bar is as tall as the long one throughout. */
function shortAndLong(ctx: DsContext): AnnouncementBarContent {
  const { rotating, long } = fixtures(ctx).header.announcements;
  return {
    messages: [
      required(rotating.messages[0], "first message"),
      required(long.messages[0], "long message"),
      required(rotating.messages[2], "third message"),
    ],
    rotateSeconds: 6,
    dismissible: true,
  };
}

const announcementBarStates: readonly DsState[] = [
  {
    id: "single",
    label: "One message",
    description:
      "One message with a link and no close button: no pause, previous or next, no position and no timer, because nothing moves.",
    render: (ctx) => bar(ctx, fixtures(ctx).header.announcements.single),
  },
  {
    id: "rotating-first",
    label: "Three in turn, at the first",
    description:
      "Drawn paused at the first of three: the pause control reads Play, with previous, next, the position and the close button. A reader who prefers reduced motion sees this and no more.",
    render: (ctx) => bar(ctx, fixtures(ctx).header.announcements.rotating, { defaultIndex: 0 }),
  },
  {
    id: "rotating-second",
    label: "Three in turn, at the second",
    description: "The same bar paused at the second message: the position reads “2 of 3”.",
    render: (ctx) => bar(ctx, fixtures(ctx).header.announcements.rotating, { defaultIndex: 1 }),
  },
  {
    id: "long",
    label: "Long message",
    description:
      "One long message with a long link: the text wraps, the link takes its own line when the text has the row, and the bar grows to fit. Nothing is cut.",
    render: (ctx) => bar(ctx, fixtures(ctx).header.announcements.long),
  },
  {
    id: "rotating-long",
    label: "Short and long in turn",
    description:
      "Paused at a short message, with a long one next: the bar is already as tall as the long one, because every message shares one cell, so it does not jump when the message changes.",
    render: (ctx) => bar(ctx, shortAndLong(ctx), { defaultIndex: 0 }),
  },
];

// --- MarketSuggestionBanner ---

function banner(ctx: DsContext, suggestion: MarketSuggestion) {
  return (
    <MarketSuggestionBanner
      suggestion={suggestion}
      copy={copy(ctx).marketSuggestionBanner}
      locale={lang(ctx)}
    />
  );
}

/**
 * South Georgia and the South Sandwich Islands: `Intl`'s longest country name in English, German
 * and Greek (the same country as MarketSwitcher's long market). It is the store suggested, or the
 * country the visitor is in.
 */
function longSuggested(ctx: DsContext): MarketSuggestion["suggested"] {
  return {
    country: "gs",
    language: "en",
    htmlLang: "en-GB",
    currencyCode: "GBP",
    href: `${fixtures(ctx).prefix}/gs`,
  };
}

const marketSuggestionBannerStates: readonly DsState[] = [
  {
    id: "copy-message",
    label: "The copy's message",
    description:
      "The sentence from the catalog with the suggested country in the page's language and its currency, the flag, “Go to the store” as a link and “Stay” as a button.",
    render: (ctx) => banner(ctx, fixtures(ctx).header.suggestions.copy),
  },
  {
    id: "shop-message",
    label: "The shop's own message",
    description:
      "The markets global's own sentence in place of the copy's; the link and the button are the copy's.",
    render: (ctx) => banner(ctx, fixtures(ctx).header.suggestions.message),
  },
  {
    id: "long-country",
    label: "Long country name suggested",
    description:
      "South Georgia and the South Sandwich Islands as the store suggested: the sentence and the link wrap inside the strip and the strip grows.",
    render: (ctx) =>
      banner(ctx, { ...fixtures(ctx).header.suggestions.copy, suggested: longSuggested(ctx) }),
  },
  {
    id: "long-current",
    label: "Long country name current",
    description:
      "The visitor is in South Georgia and the South Sandwich Islands: the stay button's long name wraps in its 44 px box.",
    render: (ctx) =>
      banner(ctx, { ...fixtures(ctx).header.suggestions.copy, current: { country: "gs" } }),
  },
];

export const bannerOrganismStories = {
  "organisms/announcement-bar": {
    summary:
      "The strip above the header: one message, or up to five shown in turn, each with a link, with a pause control when it rotates and a close button when the shop allows it.",
    a11y: [
      "The bar is a region named “Announcements”. Each message is its text and, when it has one, a link that is a 44 px target of its own. A long message wraps and the bar grows; nothing is truncated.",
      "With several messages the bar has a visible pause control, a 44 px button that reads “Pause announcements” and then “Play announcements” (WCAG 2.2.2). Rotation also stops while the pointer is over the bar or focus is inside it, and starts again a full interval after both have left. Pressing Play while the pointer or focus is still on the bar starts it anyway.",
      "Previous and next are buttons, and pressing either pauses the rotation, so the message the reader chose stays. The position (“2 of 3”) is drawn beside them and read ahead of each message for a reader who cannot see it change.",
      "The messages are a live region that is off while the bar moves by itself, so a change every six seconds is never spoken over the page, and polite whenever it does not, so a change the reader asked for with previous or next is announced (the WAI-ARIA carousel pattern).",
      "A reader who prefers reduced motion gets a bar that starts paused and never moves on its own, and Play is still theirs to press. Nothing is animated: a message is swapped, not faded. The states below are drawn paused, which is how that reader sees them.",
      "Every message sits in one grid cell and only the shown one is visible, so the bar is as tall as its longest message at this width and does not jump as the messages change. The others are hidden and inert: they are not read and cannot take focus. Without JavaScript the first message is shown and the controls, which would do nothing, are hidden.",
      "The close button removes the bar and moves focus to the control that follows it in the page, where the next Tab would have gone, so a keyboard reader does not start again from the top. A page that remembers the choice passes onDismiss.",
    ],
    live: (ctx) => bar(ctx, fixtures(ctx).header.announcements.rotating),
    states: announcementBarStates,
  },
  "organisms/market-suggestion-banner": {
    summary:
      "A strip that tells a visitor whose country has a store of its own and offers to go there or to stay; it is per visitor, so the page passes it in a slot and without one nothing is drawn.",
    a11y: [
      "The banner is a region named “Store suggestion”. The sentence names the suggested country in the page's language (from Intl) and its currency, or is the shop's own message.",
      "“Go to the Cyprus store” is a plain link (an anchor, because the whole page changes market) to the same page in the suggested market, with hreflang for its language. It is named by its visible words (WCAG 2.5.3).",
      "“Stay in the United States store” is a button that hides the banner. Focus then goes to the control that follows the banner in the page, where the next Tab would have gone, not to the top of the page. Without JavaScript the button would do nothing, so it is hidden and the link stays.",
      "The flag is a decoration beside the sentence: it is drawn on the server, named by its country, and hidden from assistive technology because the sentence already says the country. No flag's drawing is in the client JavaScript.",
      "Both controls are at least 44 px. The words wrap, a long country name and long German or Greek text included, so the strip grows and nothing is cut.",
      "Without a suggestion nothing is drawn, and nothing for the country the page is already in, so the prerendered page is the same for every visitor (D44).",
    ],
    live: (ctx) => banner(ctx, fixtures(ctx).header.suggestions.copy),
    states: marketSuggestionBannerStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
