// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, Principle 7). The
// checkout's frame: the page's heading ("Checkout"), the Stepper with SPEC §8.4's three steps (contact
// and address; delivery and payment; review: the contract refuses any other set or order), the
// current step as a section named by its own heading (the step's label), whose content is the
// caller's slot (the address form; the delivery options and PaymentStep; the review), and the
// OrderSummary beside it. Below `lg` the summary comes between the stepper and the step, its lines
// collapsed, so a phone reaches the form at once; from `lg` it is the second column, sticky at the
// top while the step scrolls (`lg:sticky`), as SBP checkout.md has it. The order in the markup is the
// order on screen and the order of Tab at every width: the stepper's links back to the steps done,
// then the summary's toggle (gone from `lg`), then the step's own controls; nothing is reached by a
// pointer only, so the checkout works by keyboard alone (SPEC §2). The current step is marked by
// Stepper (`aria-current="step"`, "Step 2 of 3:" before its name). A server component: it holds no
// state; each step is its own page (M3), so the browser's back and forward walk the steps.
// T86's checkout layouts (M5 plan §1a) place the summary elsewhere (`summaryAt`): `start` puts it
// first, the first column from `lg` and above the heading on a phone; `top` puts it in a bar at the
// top of one column, a native disclosure (`<details>`, so it opens without scripts) with the total
// on it. `one-page` draws its three steps itself (`stepper` and `section` off).
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { CheckoutSteps as CheckoutStepsContent } from "@shopblok/registry/contracts";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { Stepper } from "@shopblok/ui/molecules/stepper";
import { ChevronDownIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";
import { OrderSummary } from "./order-summary";

type CheckoutStepsProps = Omit<React.ComponentProps<"div">, "children"> &
  CheckoutStepsContent & {
    /** The wording: the frame's own, Stepper's, OrderSummary's and its rows'. */
    copy: {
      steps: Messages["organisms"]["checkoutSteps"];
      stepper: Messages["molecules"]["stepper"];
      summary: Messages["organisms"]["orderSummary"];
      rows: Messages["molecules"]["orderSummaryRow"];
    };
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The page heading's level: 1 on the checkout's pages; the sections' headings are one below. */
    headingLevel?: 1 | 2 | 3 | 4 | 5;
    /** The links back to the steps done: next/link's `prefetch`; the design system passes `false`. */
    prefetch?: boolean | null;
    /** The summary's lines open at first below `lg`. */
    summaryOpen?: boolean;
    /** Where the summary goes (T86): beside the step at the end (M3's), at the start, or a bar on top. */
    summaryAt?: "end" | "start" | "top";
    /** Draw the Stepper under the heading (T86's `one-page` draws its steps as sections instead). */
    stepper?: boolean;
    /** Put the children in the current step's section under its heading; off: they are the steps. */
    section?: boolean;
    /** The current step's content: its form. */
    children: React.ReactNode;
  };

function CheckoutSteps({
  steps,
  summary,
  copy,
  locale,
  headingLevel = 1,
  prefetch,
  summaryOpen,
  summaryAt = "end",
  stepper = true,
  section = true,
  children,
  className,
  ...props
}: CheckoutStepsProps) {
  const stepTitleId = useId();
  const Heading = `h${headingLevel}` as const;
  const StepHeading = `h${headingLevel + 1}` as "h2" | "h3" | "h4" | "h5" | "h6";
  const current = steps.steps.find((step) => step.id === steps.current);
  const summaryLevel = (headingLevel + 1) as 2 | 3 | 4 | 5 | 6;
  const header = (
    <div
      data-slot="checkout-steps-header"
      className={cn("flex min-w-0 flex-col gap-4", summaryAt === "start" && "lg:col-start-2")}
    >
      <Heading className="text-2xl leading-tight font-semibold wrap-anywhere">
        {copy.steps.title}
      </Heading>
      {stepper ? (
        <Stepper {...steps} copy={copy.stepper} locale={locale} prefetch={prefetch} />
      ) : null}
    </div>
  );
  const aside =
    summaryAt === "top" ? (
      <SummaryBar summary={summary} copy={copy} locale={locale} headingLevel={summaryLevel} />
    ) : (
      <div
        data-slot="checkout-steps-summary"
        className={cn(
          "min-w-0 lg:sticky lg:top-4 lg:row-span-2 lg:row-start-1",
          summaryAt === "start" ? "lg:col-start-1" : "lg:col-start-2",
        )}
      >
        <OrderSummary
          {...summary}
          copy={copy.summary}
          rowCopy={copy.rows}
          locale={locale}
          headingLevel={summaryLevel}
          defaultOpen={summaryOpen}
        />
      </div>
    );
  const body = section ? (
    <section
      data-slot="checkout-steps-step"
      aria-labelledby={stepTitleId}
      className={cn(
        "flex min-w-0 flex-col gap-4",
        summaryAt === "start" ? "lg:col-start-2" : "lg:col-start-1",
      )}
    >
      <StepHeading id={stepTitleId} className="text-lg leading-snug font-semibold wrap-anywhere">
        {current?.label}
      </StepHeading>
      {children}
    </section>
  ) : (
    <div
      data-slot="checkout-steps-steps"
      className={cn(
        "flex min-w-0 flex-col gap-4",
        summaryAt === "start" ? "lg:col-start-2" : "lg:col-start-1",
      )}
    >
      {children}
    </div>
  );
  return (
    <div
      data-slot="checkout-steps"
      data-step={steps.current}
      data-summary={summaryAt === "end" ? undefined : summaryAt}
      className={cn(
        "grid min-w-0 grid-cols-1 gap-6",
        summaryAt === "end" &&
          "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-x-10",
        summaryAt === "start" &&
          "lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start lg:gap-x-10",
        className,
      )}
      {...props}
    >
      {summaryAt === "end" ? (
        <>
          {header}
          {aside}
        </>
      ) : (
        <>
          {aside}
          {header}
        </>
      )}
      {body}
    </div>
  );
}

/**
 * The summary as a bar on top (T86's `focused` checkout): a native disclosure whose closed row says
 * "Show order summary", the items' count and the total, and whose open panel is the summary with
 * its lines (no toggle of its own). It works without scripts; the bar is 44 px high.
 */
function SummaryBar({
  summary,
  copy,
  locale,
  headingLevel,
}: {
  summary: CheckoutStepsContent["summary"];
  copy: CheckoutStepsProps["copy"];
  locale: string;
  headingLevel: 2 | 3 | 4 | 5 | 6;
}) {
  const total = summary.rows.find((row) => row.kind === "total");
  return (
    <details
      data-slot="checkout-steps-summary-bar"
      className="group min-w-0 rounded-xl border bg-card text-card-foreground"
    >
      <summary className="flex min-h-11 min-w-0 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
          <span className="min-w-0 wrap-anywhere">
            <span className="group-open:hidden">{copy.summary.show}</span>
            <span className="hidden group-open:inline">{copy.summary.hide}</span>
            <span className="text-muted-foreground">
              , {formatMessage(copy.summary.count, { count: summary.itemCount }, locale)}
            </span>
          </span>
        </span>
        {total?.amount === undefined ? null : (
          <Price
            amount={total.amount.amount}
            currency={total.amount.currencyCode}
            locale={locale}
          />
        )}
      </summary>
      <OrderSummary
        {...summary}
        copy={copy.summary}
        rowCopy={copy.rows}
        locale={locale}
        headingLevel={headingLevel}
        lines="open"
        className="rounded-t-none border-x-0 border-b-0"
      />
    </details>
  );
}

export { CheckoutSteps };
export type { CheckoutStepsProps };
