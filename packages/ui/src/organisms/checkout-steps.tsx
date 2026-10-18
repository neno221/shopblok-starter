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
import type { Messages } from "@shopblok/i18n";
import type { CheckoutSteps as CheckoutStepsContent } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { Stepper } from "@shopblok/ui/molecules/stepper";
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
  children,
  className,
  ...props
}: CheckoutStepsProps) {
  const stepTitleId = useId();
  const Heading = `h${headingLevel}` as const;
  const StepHeading = `h${headingLevel + 1}` as "h2" | "h3" | "h4" | "h5" | "h6";
  const current = steps.steps.find((step) => step.id === steps.current);
  return (
    <div
      data-slot="checkout-steps"
      data-step={steps.current}
      className={cn(
        "grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-x-10",
        className,
      )}
      {...props}
    >
      <div data-slot="checkout-steps-header" className="flex min-w-0 flex-col gap-4">
        <Heading className="text-2xl leading-tight font-semibold wrap-anywhere">
          {copy.steps.title}
        </Heading>
        <Stepper {...steps} copy={copy.stepper} locale={locale} prefetch={prefetch} />
      </div>
      <div
        data-slot="checkout-steps-summary"
        className="min-w-0 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <OrderSummary
          {...summary}
          copy={copy.summary}
          rowCopy={copy.rows}
          locale={locale}
          headingLevel={(headingLevel + 1) as 2 | 3 | 4 | 5 | 6}
          defaultOpen={summaryOpen}
        />
      </div>
      <section
        data-slot="checkout-steps-step"
        aria-labelledby={stepTitleId}
        className="flex min-w-0 flex-col gap-4 lg:col-start-1"
      >
        <StepHeading id={stepTitleId} className="text-lg leading-snug font-semibold wrap-anywhere">
          {current?.label}
        </StepHeading>
        {children}
      </section>
    </div>
  );
}

export { CheckoutSteps };
export type { CheckoutStepsProps };
