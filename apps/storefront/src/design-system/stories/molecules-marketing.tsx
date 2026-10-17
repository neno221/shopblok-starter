import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type { Countdown, DiscountCode, NewsletterSignup } from "@shopblok/registry/contracts";
import { CopyCodeChip } from "@shopblok/ui/molecules/copy-code-chip";
import type { CopyStatus } from "@shopblok/ui/molecules/copy-code-control";
import { CountdownTimer } from "@shopblok/ui/molecules/countdown-timer";
import { NewsletterForm, type NewsletterStatus } from "@shopblok/ui/molecules/newsletter-form";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of NewsletterForm, CopyCodeChip and CountdownTimer (T33, SETUP.md "Discovery and
// site-wide molecules (T33)"). Sample data is `commerceFixtures[ctx.locale].marketing`, copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// A story renders on the server (RSC), so the two client parts get props that serialize: CopyCodeChip
// starts in a state by name (`initialStatus`), never by a function, and CountdownTimer is given
// the fixtures' `now` (D50). The countdown's digits are the time left to `endsAt` from `now` in the
// server's markup; in the browser the clock takes over after hydration, so the DS checks set the
// browser's clock to `fixtureNow`. NewsletterForm takes no `action` here: the DS posts nothing.
// Every id on a page comes from `useId`, so the states side by side never share one.

const marketing = (ctx: DsContext) => commerceFixtures[ctx.locale].marketing;
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

// --- NewsletterForm ---

// `prefetch={false}`: the privacy page does not exist before M3, and each prefetch in a production
// build would answer 404 and fail the cell's console check (T32's lesson).
function newsletter(ctx: DsContext, signup: NewsletterSignup, status: NewsletterStatus = "idle") {
  return (
    <NewsletterForm
      newsletter={signup}
      copy={copy(ctx).newsletterForm}
      locale={lang(ctx)}
      status={status}
      prefetch={false}
      className="max-w-lg"
    />
  );
}

const newsletterFormStates: readonly DsState[] = [
  {
    id: "idle",
    label: "Idle",
    description: "Nothing typed: the field is empty and the status line is there, empty.",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.empty),
  },
  {
    id: "filled",
    label: "Address typed",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.typed),
  },
  {
    id: "sending",
    label: "Sending",
    description:
      "The button keeps its place and says what is happening, and cannot submit again: not by a click, not by Enter. The field is read-only and keeps the address.",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.typed, "sending"),
  },
  {
    id: "done",
    label: "Done",
    description:
      "A line in the status region, with a check: the form is ready for another address.",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.empty, "done"),
  },
  {
    id: "error",
    label: "Error",
    description:
      "The address is kept; the field is marked invalid and described by the error, which is also the status line.",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.typed, "error"),
  },
  {
    id: "long",
    label: "Long address",
    description:
      "A 94-character address stays in the field (it scrolls inside it) and breaks nothing.",
    render: (ctx) => newsletter(ctx, marketing(ctx).newsletter.long, "error"),
  },
];

// --- CopyCodeChip ---

function chip(ctx: DsContext, discount: DiscountCode, initialStatus?: CopyStatus) {
  return (
    <CopyCodeChip
      discount={discount}
      copy={copy(ctx).copyCodeChip}
      locale={lang(ctx)}
      initialStatus={initialStatus}
    />
  );
}

const copyCodeChipStates: readonly DsState[] = [
  {
    id: "default",
    label: "Default",
    description: "The cart's own code. The status line has its height already, so nothing moves.",
    render: (ctx) => chip(ctx, marketing(ctx).discountCode),
  },
  {
    id: "copied",
    label: "Copied",
    description:
      "What a press leads to: “Copied” in the status line for two seconds, and a check on the button.",
    render: (ctx) => chip(ctx, marketing(ctx).discountCode, "copied"),
  },
  {
    id: "clipboard-refused",
    label: "Clipboard refused or missing",
    description:
      "The code's text is selected and the line says to copy it; it stays until the next press.",
    render: (ctx) => chip(ctx, marketing(ctx).discountCode, "failed"),
  },
  {
    id: "long",
    label: "Long code",
    description:
      "40 characters with nowhere to break: the code wraps inside the chip and is never cut.",
    render: (ctx) => chip(ctx, marketing(ctx).longDiscountCode),
  },
  {
    id: "long-refused",
    label: "Long code, clipboard refused",
    description: "The longest instruction (German, Greek) under the longest code.",
    render: (ctx) => chip(ctx, marketing(ctx).longDiscountCode, "failed"),
  },
];

// --- CountdownTimer ---

// The time zone the end time is written in: the market's own, so the DS shows the prop at work.
const marketZone = {
  en: "America/New_York",
  el: "Asia/Nicosia",
  de: "Europe/Berlin",
  fr: "Europe/Zurich",
};

function countdown(ctx: DsContext, value: Countdown, timeZone?: string) {
  return (
    <CountdownTimer
      countdown={value}
      copy={copy(ctx).countdownTimer}
      locale={lang(ctx)}
      timeZone={timeZone}
    />
  );
}

const countdownTimerStates: readonly DsState[] = [
  {
    id: "days",
    label: "Days left",
    description: "3 days 4 hours 30 minutes 45 seconds from the fixtures' fixed now.",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.days),
  },
  {
    id: "hours",
    label: "Hours left",
    description: "The days stay at 00: the four boxes never change, so nothing moves as it counts.",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.hours),
  },
  {
    id: "last-minute",
    label: "Last minute",
    description: "45 seconds left. At zero it stops, and says that it ended.",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.seconds),
  },
  {
    id: "ended",
    label: "Ended",
    description:
      "`now` is `endsAt`: the timer is gone and a status line says so (announced when it happens on the page).",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.ended),
  },
  {
    id: "many-days",
    label: "Three digits of days",
    description: "128 days: the box grows with the digits, the other three do not.",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.long),
  },
  {
    id: "market-time-zone",
    label: "Market's time zone",
    description:
      "The end time is written in the time zone it is given, with its abbreviation, not in the reader's.",
    render: (ctx) => countdown(ctx, marketing(ctx).countdown.days, marketZone[ctx.locale]),
  },
];

export const marketingMoleculeStories = {
  "molecules/newsletter-form": {
    summary:
      "The newsletter signup: a heading, one email field, the consent sentence with a link to the privacy page, and a submit button, with idle, sending, done and error states.",
    a11y: [
      "A plain <form> named by its heading (`headingLevel` puts it in the page's outline): it posts without JavaScript, the browser validates the address (`type=email`, `required`) and fills it in (`autocomplete=email`). The field has a real <label>, not a placeholder.",
      "Done and error are text in a `role=status` region that is in the page from the start, so a change is announced politely (WCAG 4.1.3). The error is also tied to the field (`aria-invalid`, `aria-describedby`), shown with an icon and words, and the address is kept.",
      "While sending, the button keeps its place and its name (“Subscribing…”), is `aria-disabled` and focusable, and cannot submit again: it is `type=button`, and a hidden disabled submit button stands first in the form so Enter in the field does nothing either.",
      "The consent sentence is one message with the privacy link inside it, wherever the language puts it; the link is a link in running text. The field and the button are 44 px tall and sit on one row from 28 rem of form width, stacked below it.",
    ],
    live: (ctx) => newsletter(ctx, marketing(ctx).newsletter.empty),
    states: newsletterFormStates,
  },
  "molecules/copy-code-chip": {
    summary:
      "A discount code in monospace beside a copy button: “Copied” is announced, and when the clipboard is refused the code is selected for the reader to copy.",
    a11y: [
      "The button says “Copy” and is named “Copy code WELCOME10”, with its visible word in its name (WCAG 2.5.3). Its name does not change when it works, so a focused button is not read out again; the icon turns into a check.",
      "“Copied” is a polite `role=status` line that is in the page from the start and keeps its height; it shows for two seconds. Focus stays on the button.",
      "With no clipboard (a page that is not secure) or a refused one, the code's text is selected and the line says “Select the code and copy it”, and stays. The code is `select-all`: one tap selects it, and a long code wraps instead of being cut.",
      "Before JavaScript runs, the code is plain text a reader can select; the button needs the client part.",
    ],
    live: (ctx) => chip(ctx, marketing(ctx).discountCode),
    states: copyCodeChipStates,
  },
  "molecules/countdown-timer": {
    summary:
      "The time left to an offer in days, hours, minutes and seconds, counted from the server's `now` and ticking in the browser, with its end time as text and a line when it is over.",
    a11y: [
      "A `role=timer` named by the line above it, which says what ends and when as text (“Offer ends Oct 4, 2026, 1:30 PM UTC”), in the time zone it is given and not the reader's. It has `aria-live=off`: it is not announced every second.",
      "The digits are hidden from assistive technology and one sentence says the time (“3 days, 4 hours, 30 minutes, 45 seconds”, from `Intl.ListFormat`, leaving out zeros); the unit names come from `Intl.NumberFormat`'s unit style.",
      "When it reaches zero the timer is replaced by “This offer has ended” in a `role=status` line that was there all along, so it is announced once; the timer stops asking the clock. The end time stays readable as static text for anyone who does not want to watch the seconds (WCAG 2.2.2).",
      "The server renders from the contract's `now`, never the clock (D50); after hydration the browser's clock takes over, so the DS checks set it to the fixtures' now. The boxes are 4 equal columns that keep their size as the digits change.",
    ],
    live: (ctx) => countdown(ctx, marketing(ctx).countdown.days),
    states: countdownTimerStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
