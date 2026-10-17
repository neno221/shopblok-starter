// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"), on the ReUI stepper primitive
// (`primitives/stepper.tsx`). The steps of a flow and where the reader is: checkout's, or any
// other's (the label of the list is a prop). It is navigation, not a set of tabs, so it is a `nav`
// named by the copy ("Checkout steps") around an ordered list, one `li` per step, with
// `aria-current="step"` on the current one. A step before the current one is done: a link back to
// it where the step has an `href` (the `prefetch` prop goes to `next/link`), marked done in words a
// screen reader reads after its name (", completed") and by a check in its circle; the current
// step is text, in bold, in a filled circle with a ring and its number, and reads "Step 2 of 4:"
// before its name; a step to come is text in a hollow circle. Done, current and to come therefore
// differ by shape, weight and words, never by colour alone. The primitive needed three small changes
// for this (its root's `role`, a `nav` that can be named, an item that can be an `li`; the
// primitive's header says which). From a container's width up the labels are all drawn beside their
// circles and the connecting lines grow between them; below it (the container's, so a stepper in a
// narrow column is compact too, not only on a phone) only the current step keeps its label and the
// others are circles in a row, their names kept for assistive technology, which is what lets five
// steps with long German labels fit 343 px. A circle that is a link has a 44 px box, so in a
// container narrower than the circles side by side (five steps in 14 rem) the row wraps onto a second
// line instead of overflowing; from the container's width up it never wraps. Four or more steps need
// more room for their labels than three. A server component: the primitive's parts are
// client components (they share the step in a context), which this renders, and the page sends
// their code and no more; the molecule itself holds no state.
import { formatMessage, formatNumber, type Messages } from "@shopblok/i18n";
import type { StepperState } from "@shopblok/registry/contracts";
import { Link } from "@shopblok/ui/atoms/link";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Stepper as StepperRoot,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
} from "@shopblok/ui/primitives/stepper";
import { CheckIcon } from "lucide-react";
import type * as React from "react";

type StepperProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "role" | "defaultValue"
> &
  StepperState & {
    /** The wording, from the catalog's `molecules.stepper`. */
    copy: Messages["molecules"]["stepper"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The list's name where the flow is not checkout ("Return steps"); `copy.label` otherwise. */
    label?: string;
    /**
     * The done steps' `prefetch` (next/link). Unset, Next prefetches each link's page in a
     * production build; the design system passes `false` because its pages do not exist before M3.
     */
    prefetch?: boolean | null;
  };

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. A step's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

// Where the labels come back and the lines grow, by how many steps there are. Each is a literal so
// Tailwind sees it: three steps fit in 32 rem of the stepper's own width, four or more need 48 rem.
const layouts = {
  few: {
    item: "@lg:not-last:flex-auto",
    label: "@lg:not-sr-only",
    separator: "@lg:block",
    list: "@lg:flex-nowrap @lg:gap-0",
  },
  many: {
    item: "@3xl:not-last:flex-auto",
    label: "@3xl:not-sr-only",
    separator: "@3xl:block",
    list: "@3xl:flex-nowrap @3xl:gap-0",
  },
} as const;

function Stepper({
  steps,
  current,
  copy,
  locale,
  label,
  prefetch,
  className,
  ...props
}: StepperProps) {
  // The primitive counts steps from 1, and none is current when `current` names none of them.
  const currentIndex = steps.findIndex((step) => step.id === current);
  const layout = steps.length > 3 ? layouts.many : layouts.few;
  return (
    <StepperRoot
      value={currentIndex + 1}
      role="none"
      indicators={{ completed: <CheckIcon aria-hidden="true" className="size-4" /> }}
      className={cn("@container", className)}
      {...props}
    >
      <StepperNav aria-label={label ?? copy.label} className="block">
        <ol className={cn("flex w-full flex-wrap items-center gap-2", layout.list)}>
          {steps.map((step, index) => {
            const done = index < currentIndex;
            const isCurrent = index === currentIndex;
            const number = formatNumber(index + 1, locale);
            const body = (
              <>
                <StepperIndicator className="size-8 border border-input text-sm font-medium tabular-nums data-[state=active]:border-primary data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-background data-[state=completed]:border-primary">
                  <span aria-hidden="true">{number}</span>
                </StepperIndicator>
                <span
                  data-slot="stepper-label"
                  className={cn(
                    "min-w-0 text-sm leading-snug wrap-anywhere",
                    isCurrent && "font-semibold text-foreground",
                    done && "font-medium text-foreground",
                    !done && !isCurrent && "text-muted-foreground",
                    // Below the container's width only the current step keeps its label drawn.
                    !isCurrent && cn("sr-only", layout.label),
                    done && step.href !== undefined && "underline underline-offset-4",
                  )}
                >
                  {isCurrent ? (
                    <VisuallyHidden>
                      {formatMessage(
                        copy.position,
                        { step: index + 1, count: steps.length },
                        locale,
                      )}{" "}
                    </VisuallyHidden>
                  ) : null}
                  {step.label}
                  {done ? <VisuallyHidden>{copy.completed}</VisuallyHidden> : null}
                </span>
              </>
            );
            const box =
              "inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2";
            return (
              <StepperItem
                key={step.id}
                step={index + 1}
                render={<li />}
                aria-current={isCurrent ? "step" : undefined}
                data-step={step.id}
                className={cn("min-w-0 justify-start not-last:flex-initial", layout.item)}
              >
                {done && step.href !== undefined ? (
                  <Link
                    href={step.href as LinkHref}
                    prefetch={prefetch}
                    variant="standalone"
                    className={cn(box, "rounded-lg no-underline")}
                  >
                    {body}
                  </Link>
                ) : (
                  <div data-slot="stepper-step" className={box}>
                    {body}
                  </div>
                )}
                {index < steps.length - 1 ? (
                  <StepperSeparator
                    className={cn(
                      "mx-1 hidden min-w-3 bg-border data-[state=completed]:bg-primary",
                      layout.separator,
                    )}
                  />
                ) : null}
              </StepperItem>
            );
          })}
        </ol>
      </StepperNav>
    </StepperRoot>
  );
}

export { Stepper };
export type { StepperProps };
