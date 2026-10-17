import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import type {
  ShippingEstimate,
  StepperState,
  SummaryLine,
  VerificationRequest,
} from "@shopblok/registry/contracts";
import { OrderSummaryRow } from "@shopblok/ui/molecules/order-summary-row";
import {
  ShippingEstimator,
  type ShippingEstimatorError,
} from "@shopblok/ui/molecules/shipping-estimator";
import { Stepper } from "@shopblok/ui/molecules/stepper";
import {
  VerificationNotice,
  type VerificationStatus,
} from "@shopblok/ui/molecules/verification-notice";
import type { DsContext, DsState, DsStory } from "../types";

// The stories of OrderSummaryRow, Stepper, ShippingEstimator and VerificationNotice (T34, SETUP.md
// "Cart, checkout and account molecules (T34)"). Sample data is `commerceFixtures[ctx.locale]
// .checkoutFlow` (the cart's own totals as summary rows, the steps of a flow at each place the
// reader can be, the estimator before and after it answers, the address a link was sent to), copy is
// `catalogs[ctx.locale].molecules`, and the locale every `Intl` call uses is the market's
// `<html lang>`.
//
// A story renders on the server (RSC), so the one client part (VerificationNotice's resend button
// and its countdown) gets props that serialize and no function: the form takes `action="#"`, which a
// browser posts to the page itself, and the DS never submits one. The wait is counted from the
// server's number (D50): in the server's markup it is 42 seconds, and in the browser the clock takes
// over after hydration (the DS checks fix it at the fixtures' now). `prefetch={false}` on every
// stepper: the checkout's pages do not exist before M3, and each prefetch in a production build
// would answer 404 and fail the cell's console check (T32's lesson). Every id on a page comes from
// `useId`, so the states side by side never share one.

const flow = (ctx: DsContext) => commerceFixtures[ctx.locale].checkoutFlow;
const copy = (ctx: DsContext) => catalogs[ctx.locale].molecules;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

// --- OrderSummaryRow ---

// A row is a `<div>` of a description list, which the organism that draws a summary (OrderSummary,
// T39) provides; the story wraps its rows in one.
function summaryRows(ctx: DsContext, lines: readonly SummaryLine[], className = "max-w-sm") {
  return (
    <dl className={className}>
      {lines.map((line, index) => (
        <OrderSummaryRow
          key={`${line.kind}-${index}`}
          {...line}
          copy={copy(ctx).orderSummaryRow}
          locale={lang(ctx)}
        />
      ))}
    </dl>
  );
}

const orderSummaryRowStates: readonly DsState[] = [
  {
    id: "subtotal",
    label: "Subtotal",
    description: "The label from the copy by kind, the amount through the Price atom.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.subtotal]),
  },
  {
    id: "discount",
    label: "Discount with its code",
    description:
      "The code beside the label in the medium weight; the amount is taken off, drawn with the real minus sign (U+2212) and in the success colour, so the colour is never the only sign.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.discount]),
  },
  {
    id: "shipping-pending",
    label: "Shipping not known yet",
    description: "No amount: “Calculated at the next step”, in the muted colour.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.shippingPending]),
  },
  {
    id: "shipping-paid",
    label: "Shipping with a price",
    description: "The standard delivery's price.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.shippingPaid]),
  },
  {
    id: "shipping-free",
    label: "Free shipping",
    description: "An amount of 0 reads “Free” in the success colour.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.shippingFree]),
  },
  {
    id: "tax",
    label: "Tax",
    description:
      "The VAT the price includes where the market has one; where the sales tax is worked out at checkout (US) there is no amount yet.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.tax]),
  },
  {
    id: "total",
    label: "Total",
    description: "Emphasised by size, weight and a rule above it, never by colour alone.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.total]),
  },
  {
    id: "long-detail",
    label: "Long code",
    description:
      "40 characters with nowhere to break: the code breaks anywhere, and the amount drops under the label if it must.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.longDetail]),
  },
  {
    id: "large",
    label: "Seven-digit total",
    description: "The grouping and the currency follow the market.",
    render: (ctx) => summaryRows(ctx, [flow(ctx).summary.large]),
  },
  {
    id: "narrow",
    label: "Narrow column",
    description: "11 rem wide: the longest code and the largest amount wrap and nothing is cut.",
    render: (ctx) =>
      summaryRows(ctx, [flow(ctx).summary.longDetail, flow(ctx).summary.large], "w-44 max-w-full"),
  },
];

// --- Stepper ---

function stepper(ctx: DsContext, state: StepperState, className?: string) {
  return (
    <Stepper
      {...state}
      copy={copy(ctx).stepper}
      locale={lang(ctx)}
      prefetch={false}
      className={className}
    />
  );
}

const stepperStates: readonly DsState[] = [
  {
    id: "first-step",
    label: "First step",
    description:
      "The reader is on the first of three steps: nothing is done, so nothing is a link.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.contact),
  },
  {
    id: "second-step",
    label: "Second step",
    description:
      "The first is done: a link back to it, with a check in its circle and “completed” after its name for a screen reader. The current step is bold, in a filled circle with a ring, and reads “Step 2 of 3:” first.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.delivery),
  },
  {
    id: "last-step",
    label: "Last step",
    description: "Two links back; the line between done steps is the primary colour.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.review),
  },
  {
    id: "five-steps",
    label: "Five steps",
    description:
      "A flow that begins at the cart. Four or more steps need more room for their labels (48 rem of the stepper's own width); below it only the current step's name is drawn and the others are circles with their names kept for assistive technology.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.five),
  },
  {
    id: "long-labels",
    label: "Long labels",
    description:
      "Four steps named at the length that breaks a layout (German's are the longest): the names wrap, and are never cut.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.long),
  },
  {
    id: "narrow",
    label: "Narrow column",
    description:
      "The layout follows the stepper's own width (a container query), so a stepper in a narrow column is compact too, not only on a phone.",
    render: (ctx) => stepper(ctx, flow(ctx).steps.delivery, "w-48 max-w-full"),
  },
];

// --- ShippingEstimator ---

function estimator(ctx: DsContext, estimate: ShippingEstimate, error?: ShippingEstimatorError) {
  return (
    <ShippingEstimator
      estimate={estimate}
      copy={copy(ctx).shippingEstimator}
      locale={lang(ctx)}
      error={error}
      className="max-w-lg"
    />
  );
}

const shippingEstimatorStates: readonly DsState[] = [
  {
    id: "empty",
    label: "Not sent yet",
    description:
      "No country chosen: the select starts on a disabled “Select a country”, so the first is not sent by accident. The results region is there, empty.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.empty),
  },
  {
    id: "one-country",
    label: "One country",
    description: "A region of one country: nothing to choose, so no placeholder.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.single),
  },
  {
    id: "answered",
    label: "Answered",
    description:
      "The form was sent: the options that are available (one in the data is not, and is left out), each with its time in business days, where it is collected and its price, “Free” for 0.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.answered),
  },
  {
    id: "none",
    label: "Nothing ships there",
    description: "An answer with no option is a sentence, never an empty list.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.none),
  },
  {
    id: "postal-code-error",
    label: "Postal code refused",
    description:
      "Text under the field, tied to it (`aria-invalid`, `aria-describedby`) and announced; the code is kept.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.mistaken, "postalCode"),
  },
  {
    id: "lookup-failed",
    label: "Lookup failed",
    description:
      "A line with an icon in the results region; the values stay so the shopper can try again.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.answered, "failed"),
  },
  {
    id: "long",
    label: "Long delivery name",
    description: "An option named at the length that breaks a layout, beside a pickup.",
    render: (ctx) => estimator(ctx, flow(ctx).estimator.long),
  },
];

// --- VerificationNotice ---

function notice(ctx: DsContext, request: VerificationRequest, status?: VerificationStatus) {
  return (
    <VerificationNotice
      {...request}
      copy={copy(ctx).verificationNotice}
      locale={lang(ctx)}
      action="#"
      status={status}
      className="max-w-lg"
    />
  );
}

const verificationNoticeStates: readonly DsState[] = [
  {
    id: "waiting",
    label: "Sent, wait running",
    description:
      "The first send. The button is there but unavailable, described by the line that counts the wait down in the browser from the server's 42 seconds; the seconds are not announced.",
    render: (ctx) => notice(ctx, flow(ctx).verification.waiting),
  },
  {
    id: "ready",
    label: "Sent, no wait",
    description: "The wait is over (or there was none): the button submits.",
    render: (ctx) => notice(ctx, flow(ctx).verification.ready),
  },
  {
    id: "sending",
    label: "Sending",
    description:
      "The button keeps its place and says “Sending…”, is `aria-disabled` and focusable, and cannot submit twice.",
    render: (ctx) => notice(ctx, flow(ctx).verification.ready, "sending"),
  },
  {
    id: "resent",
    label: "Sent again",
    description:
      "“We sent a new link” in the status region, with a check; the wait starts again from the server's number.",
    render: (ctx) => notice(ctx, flow(ctx).verification.waiting, "resent"),
  },
  {
    id: "error",
    label: "Could not send",
    description: "A line with an icon in the status region; the resend is still offered.",
    render: (ctx) => notice(ctx, flow(ctx).verification.ready, "error"),
  },
  {
    id: "long",
    label: "Long address",
    description:
      "A 94-character address breaks anywhere instead of overflowing, under the longest copy and the error.",
    render: (ctx) => notice(ctx, flow(ctx).verification.long, "error"),
  },
];

export const checkoutMoleculeStories = {
  "molecules/order-summary-row": {
    summary:
      "One row of an order summary, a label and an amount: subtotal, discount with its code, shipping (free, priced or not yet known), tax and the emphasised total.",
    a11y: [
      "A `<div>` holding a `<dt>` and a `<dd>`, which HTML allows inside a `<dl>`: the organism wraps its rows in one list of terms and values, so a screen reader reads “Subtotal, $149.97” as a pair.",
      "A discount is the amount taken off (the contract says so, as Medusa's `discount_total` does) and is drawn with the real minus sign U+2212, which a screen reader says as “minus” (a hyphen is read “dash”, or not at all), and in the success colour with the minus beside it, so colour is never the only sign.",
      "Shipping of 0 is “Free” and a missing amount is “Calculated at the next step”, both as words. The total is emphasised by size, weight and a rule above it, never by colour alone.",
      "The code beside a label is cut out of the sentence at a slot character, so a language puts it where its grammar needs it; a 40-character code breaks anywhere and the amount drops under the label if it must (the row wraps), at 375 px and in a narrow column.",
    ],
    live: (ctx) =>
      summaryRows(ctx, [
        flow(ctx).summary.subtotal,
        flow(ctx).summary.discount,
        flow(ctx).summary.shippingPending,
        flow(ctx).summary.tax,
        flow(ctx).summary.total,
      ]),
    states: orderSummaryRowStates,
  },
  "molecules/stepper": {
    summary:
      "The steps of a flow and where the reader is: a navigation around an ordered list, the steps done as links back, the current one marked, in words and by shape.",
    a11y: [
      'A `<nav>` named “Checkout steps” (or by a `label` prop) around an `<ol>`, one `<li>` per step, with `aria-current="step"` on the current one. It is navigation and not a set of tabs: no `tablist`, no `tab`, no arrow-key roving.',
      "A step done is a link back to it (a 44 px target, with a visible focus ring), marked in words after its name (“, completed”) and by a check in its circle; the current step reads “Step 2 of 3:” before its name, and is text; a step to come is text. Done, current and to come differ by shape, weight and words, never by colour alone. Tab visits only the links.",
      "From the stepper's own width up (a container query: 32 rem for three steps, 48 rem for four or more) every label is drawn beside its circle and the lines grow between them; below it only the current step's label is drawn and the others are circles in a row, their names kept for assistive technology, so five steps with long German labels fit 343 px. Where even the circles do not fit side by side, the row wraps.",
      "The ReUI stepper primitive is tabs-oriented; it got three small changes (a `role` on its root, a nav that can be named, an item that can be an `li`) and the molecule uses none of its triggers.",
    ],
    live: (ctx) => stepper(ctx, flow(ctx).steps.delivery),
    states: stepperStates,
  },
  "molecules/shipping-estimator": {
    summary:
      "A GET form with a country and a postal code, and the delivery options it finds listed under it: name, time in business days, where it is collected, price or “Free”.",
    a11y: [
      'A plain `<form method="get">` named by its heading: it works before any JavaScript, and the answer is a URL a shopper can reload, share or go back to. The country is a native select (`autocomplete="country"`, the names from `Intl`), the postal code a text field (`autocomplete="postal-code"`; text because a British or Dutch code has letters), both required and labelled with a real `<label>`.',
      "With no country chosen the select starts on a disabled “Select a country”. A postal code the server refused is text under its field, tied to it (`aria-invalid`, `aria-describedby`) and announced, and the code is kept (WCAG 3.3.1 to 3.3.3); there is no `pattern`, because the country can change without the page knowing.",
      "The results sit in a `role=status` region that is in the page from the start, so a client that swaps the answer in has it announced politely; after a full reload the reader finds the results after the form. The options are a list named by the line above it; an empty answer is a sentence, never an empty list; a failed lookup is a line with an icon.",
      "The two fields sit on one row from 32 rem of form width, stacked below it. The button wraps a long label instead of overflowing.",
    ],
    live: (ctx) => estimator(ctx, flow(ctx).estimator.answered),
    states: shippingEstimatorStates,
  },
  "molecules/verification-notice": {
    summary:
      "The notice that a link was sent to an address to verify it, with a resend button that waits out the server's cooldown, and the states of a resend: sending, sent again, failed.",
    a11y: [
      "A plain `<form>` named by its heading; the address travels in a hidden field and the form is always a POST. The address is in the semibold weight and breaks anywhere, so a very long one does not overflow.",
      'While the wait runs the button is `aria-disabled` and still focusable, `type="button"`, and described by the line that says how long is left. That line ticks down in the browser from the server\'s number (a clock read with `useSyncExternalStore`, never `Date.now()` on the server) and is not live: it would be read every second. When the wait is over the button works and the status region says so, once.',
      "The status region (`role=status`, polite) is in the page from the start, so “Sending…”, “We sent a new link.” and “We could not send the email.” are announced as they happen (WCAG 4.1.3); the last two have an icon as well as words. A send in progress keeps the button in place and in focus, and cannot be submitted twice.",
      "Without JavaScript the wait is the number at the time of the render and does not run down; a reload asks the server again.",
    ],
    live: (ctx) => notice(ctx, flow(ctx).verification.waiting),
    states: verificationNoticeStates,
  },
} satisfies Partial<Record<EntryId, DsStory>>;
