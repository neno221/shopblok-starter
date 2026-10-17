import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { MarketOption, ToastMessage } from "@shopblok/registry/contracts";
import { AccordionItem } from "@shopblok/ui/molecules/accordion-item";
import { MarketSwitcher } from "@shopblok/ui/molecules/market-switcher";
import { Toast } from "@shopblok/ui/molecules/toast";
import { Accordion } from "@shopblok/ui/primitives/accordion";
import { OverlayBox } from "../components/overlay-box";
import { ToastDemo } from "../components/toast-demo";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of MarketSwitcher, AccordionItem and Toast (T33, SETUP.md "Discovery and site-wide
// molecules (T33)"). Sample data is `commerceFixtures[ctx.locale]` (the six markets, a FAQ and a
// toast of each kind), the copy is `catalogs[ctx.locale].molecules`, and the locale every `Intl`
// call uses is the market's `<html lang>`.
//
// The two overlays are drawn open inside an `OverlayBox` (D45) with `defaultOpen` and
// `modal={false}`, and the box is taller than the popup so nothing is cut. MarketSwitcher's `form`
// draws the popover or the sheet alone: the live render shows both triggers and CSS hides one, but
// a state must show its form at any width. The sheet's states switch its slide-in off
// (`duration-0`) and its overscroll bleed, a band of the popup's colour under its bottom edge that
// would stick out of the box (`[--bleed:0px]`): no state is a picture of an animation.
//
// A story renders on the server (RSC), so the one client component here (the toast demo) gets props
// that serialize, and the toast cards are the `Toast` component drawn static: a live toast is
// `showToast`'s, announced by the viewport's live region, which the live render shows.

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The fixtures have no ${what}`);
  return value;
}

// --- MarketSwitcher ---

/** What a state of the sheet changes in it, to stand still in a box (see above). */
const stillSheet = "[--bleed:0px] duration-0";

/**
 * South Georgia and the South Sandwich Islands: `Intl`'s longest country name in English, German
 * and Greek, with no space to break it into short lines. Its one language is English, in the way
 * every market's links are the locale's own.
 */
function longMarket(ctx: DsContext, current: boolean): MarketOption {
  return {
    country: "gs",
    flagCode: "GS",
    currencyCode: "GBP",
    languages: [{ language: "en", htmlLang: "en-GB", href: `${fixtures(ctx).prefix}/gs`, current }],
  };
}

/** The markets with the long one added, and the market the page is in, or the long one, current. */
function marketsWithLong(ctx: DsContext, longIsCurrent: boolean): MarketOption[] {
  const markets = fixtures(ctx).markets.map((market) => ({
    ...market,
    languages: market.languages.map((language) => ({
      ...language,
      current: longIsCurrent ? false : language.current,
    })),
  }));
  return [...markets, longMarket(ctx, longIsCurrent)];
}

function marketTrigger(ctx: DsContext, markets: MarketOption[] = fixtures(ctx).markets) {
  return (
    <MarketSwitcher
      markets={markets}
      copy={copy(ctx).marketSwitcher}
      locale={lang(ctx)}
      form="popover"
    />
  );
}

/** One form drawn open in a box, its trigger above it. */
function marketOpen(
  ctx: DsContext,
  form: "popover" | "drawer",
  markets: MarketOption[],
  name: string,
  height: number,
) {
  return (
    <OverlayBox name={name} height={height}>
      <div className="p-4">
        <MarketSwitcher
          markets={markets}
          copy={copy(ctx).marketSwitcher}
          locale={lang(ctx)}
          form={form}
          defaultOpen
          modal={false}
          popupClassName={form === "drawer" ? stillSheet : undefined}
        />
      </div>
    </OverlayBox>
  );
}

const marketSwitcherStates: readonly DsState[] = [
  {
    id: "closed",
    label: "Closed",
    description: "The trigger alone: the market's flag, country, language and currency code.",
    render: (ctx) => marketTrigger(ctx),
  },
  {
    id: "closed-long",
    label: "Closed, long country name",
    description: "A very long country name wraps inside the trigger instead of being cut.",
    render: (ctx) => marketTrigger(ctx, marketsWithLong(ctx, true)),
  },
  {
    id: "popover",
    label: "Popover",
    description:
      "From 768 px up: every country with its flag and languages; the current language has a check, inverted colours and aria-current.",
    render: (ctx) =>
      marketOpen(ctx, "popover", fixtures(ctx).markets, "Market switcher, popover", 880),
  },
  {
    id: "sheet",
    label: "Sheet",
    description:
      "Below 768 px: the same list in a bottom sheet, with a visible close button and a swipe handle.",
    render: (ctx) =>
      marketOpen(ctx, "drawer", fixtures(ctx).markets, "Market switcher, sheet", 640),
  },
  {
    id: "long-names",
    label: "Long country name, open",
    description:
      "A country with a very long name in the list, in a popover as narrow as this cell: the name wraps and its row keeps its flag and currency.",
    render: (ctx) =>
      marketOpen(ctx, "popover", marketsWithLong(ctx, false), "Market switcher, long names", 760),
  },
];

// --- AccordionItem ---

/** The FAQ's sections in the accordion primitive, `open` of them open at first. */
function faq(
  ctx: DsContext,
  options: {
    open: string[];
    multiple?: boolean;
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    long?: boolean;
  },
) {
  const { items, long } = fixtures(ctx).site.faq;
  const shown = options.long === true ? [long] : items;
  return (
    <Accordion defaultValue={options.open} multiple={options.multiple} className="max-w-2xl">
      {shown.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          title={item.title}
          headingLevel={options.headingLevel}
        >
          {item.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const firstQuestion = (ctx: DsContext) =>
  required(fixtures(ctx).site.faq.items[0], "question").value;

const accordionItemStates: readonly DsState[] = [
  {
    id: "closed",
    label: "All closed",
    description: "Only the questions, each a 44 px button with a chevron that points down.",
    render: (ctx) => faq(ctx, { open: [] }),
  },
  {
    id: "open",
    label: "One open",
    description: "The first question open: its chevron is turned and its answer shows.",
    render: (ctx) => faq(ctx, { open: [firstQuestion(ctx)] }),
  },
  {
    id: "multiple",
    label: "Several open",
    description: "With `multiple`, opening a section leaves the others as they are.",
    render: (ctx) =>
      faq(ctx, {
        open: [firstQuestion(ctx), required(fixtures(ctx).site.faq.items[2], "question").value],
        multiple: true,
      }),
  },
  {
    id: "heading-level",
    label: "Heading level 2",
    description: "The triggers sit in h2 headings (the default is h3); the look does not change.",
    render: (ctx) => faq(ctx, { open: [firstQuestion(ctx)], headingLevel: 2 }),
  },
  {
    id: "long",
    label: "Long question and answer",
    description: "A long question wraps beside its chevron, and the answer keeps its paragraphs.",
    render: (ctx) => faq(ctx, { open: [fixtures(ctx).site.faq.long.value], long: true }),
  },
];

// --- Toast ---

const toastSamples = (ctx: DsContext) => {
  const { success, error, info } = fixtures(ctx).site.toasts;
  return [success, error, info];
};

function toastCard(ctx: DsContext, message: ToastMessage) {
  return <Toast {...message} copy={copy(ctx).toast} />;
}

const toastStates: readonly DsState[] = [
  {
    id: "success",
    label: "Success",
    description:
      "A check in the success colour and the word “Success”; a title, a description and an action.",
    render: (ctx) => toastCard(ctx, fixtures(ctx).site.toasts.success.message),
  },
  {
    id: "error",
    label: "Error",
    description:
      "An octagon in the destructive colour and the word “Error”. An error stays until it is closed.",
    render: (ctx) => toastCard(ctx, fixtures(ctx).site.toasts.error.message),
  },
  {
    id: "info",
    label: "Information",
    description: "An “i” in the information colour and the word “Information”; a title alone.",
    render: (ctx) => toastCard(ctx, fixtures(ctx).site.toasts.info.message),
  },
  {
    id: "no-description",
    label: "Title and action",
    description: "No description: the action sits under the title.",
    render: (ctx) => {
      const { description: _description, ...message } = fixtures(ctx).site.toasts.success.message;
      return toastCard(ctx, message);
    },
  },
  {
    id: "long",
    label: "Long",
    description:
      "A long title, description and action label: they wrap, the close button keeps its corner and the action keeps its row.",
    render: (ctx) => toastCard(ctx, fixtures(ctx).site.toasts.long.message),
  },
];

export const siteMoleculeStories = {
  "molecules/market-switcher": {
    summary:
      "Country and language in one control: a button that shows the market the page is in and opens a popover (from 768 px) or a bottom sheet with every country and its languages as links.",
    a11y: [
      "The trigger is a button named “Country and language: Cyprus, Ελληνικά, EUR”: what it is and what it holds, so each visible word is in the name (WCAG 2.5.3). It opens a dialog (aria-haspopup).",
      "Both triggers are in the markup and CSS hides one per breakpoint, so the server and the browser agree on first render (there is no matchMedia). The popover is for 768 px up and the sheet below.",
      "Both trap focus: Tab and Shift+Tab go round the close button and the language links and never leave, Escape closes it and focus goes back to the trigger. The sheet makes the page behind inert; the popover leaves it scrollable.",
      "Each language is a plain link. The current one has aria-current, a check and inverted colours (not colour alone). A language is written in its own language and marked with lang (WCAG 3.1.2); a link is named by its language and its country (“Français, Switzerland”), because a reader who tabs from link to link does not hear the country's heading.",
      "The flags are drawn on the server and named by the country; none is in the client JavaScript. The close button is 44 px and is the way out of the sheet that is not a swipe.",
    ],
    live: (ctx) => (
      <MarketSwitcher
        markets={fixtures(ctx).markets}
        copy={copy(ctx).marketSwitcher}
        locale={lang(ctx)}
      />
    ),
    states: marketSwitcherStates,
  },
  "molecules/accordion-item": {
    summary:
      "One section of an accordion: its title is a button inside a heading, its body opens and closes under it.",
    a11y: [
      "The title is a button inside a heading (h3 by default; `headingLevel` keeps the page's outline right). It has aria-expanded, and the open panel is a region named by the title.",
      "Enter and Space open and close it, Tab moves from one trigger to the next. Base UI's accordion has no arrow-key navigation.",
      "The trigger is at least 44 px tall and fills the row; a long question wraps beside its chevron. The ring is at full strength.",
      "The panel's height follows Base UI's --accordion-panel-height for 150 ms, and nothing moves under prefers-reduced-motion. Before the browser measures it the panel is as tall as its content, so a section that starts open is open without JavaScript.",
    ],
    live: (ctx) => faq(ctx, { open: [firstQuestion(ctx)] }),
    states: accordionItemStates,
  },
  "molecules/toast": {
    summary:
      "A short message after the reader's own action, in three kinds (success, error, information), each with an icon and its kind in words, a title, a description, an action and a close button.",
    a11y: [
      "A toast is shown with showToast and announced politely by the viewport's live region (region, aria-live polite): focus stays on the button that showed it. An error is polite too: Base UI's high priority is an assertive alert that reads only the title and description and hides the toast, which is focusable, from assistive technology.",
      "The kind is a word beside the icon, never colour or a drawing alone (WCAG 1.4.1); the icon is hidden from assistive technology so the word is read once.",
      "A success or an information leaves after 5 s (10 s with an action); an error stays until it is closed. Base UI pauses the timer while the stack is hovered or focused. F6 moves focus to the toasts, where the close button joins the Tab order.",
      "The action and the close button are 44 px, the close button is named “Close notification”, and a long title, description or action label wraps.",
    ],
    live: (ctx) => <ToastDemo samples={toastSamples(ctx)} copy={copy(ctx).toast} />,
    states: toastStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
