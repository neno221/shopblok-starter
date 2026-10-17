// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). How far the cart is from free
// shipping: a sentence ("Add €12.50 more for free shipping", `formatMessage` with `formatMoney`) and
// a bar under it, or, once the threshold is reached, "You get free shipping" and a full bar in the
// success colour. The sentence is in a polite status region that is always there, so when the cart
// changes and the text with it, a screen reader says it once (the first render is not announced);
// the bar is the Progress atom, named by that sentence (`aria-labelledby`) and with a value that is
// the share of the threshold reached, rounded down and never 100 until the threshold is reached,
// so a bar never says full beside "Add €0.01 more". The contract refuses a threshold of 0, so
// there is no division by it. An icon (a truck, or a check) goes with the sentence and is not the
// only sign: colour never is (WCAG 1.4.1). A server component: it only formats; the atom it draws
// is the client one.
import { formatMessage, formatMoney, type Messages } from "@shopblok/i18n";
import type { FreeShipping } from "@shopblok/registry/contracts";
import { Progress } from "@shopblok/ui/atoms/progress";
import { cn } from "@shopblok/ui/lib/utils";
import { CircleCheckIcon, TruckIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type FreeShippingProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  freeShipping: FreeShipping;
  /** The wording, from the catalog's `molecules.freeShippingProgress`. */
  copy: Messages["molecules"]["freeShippingProgress"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
};

/** The share of the threshold reached, 0 to 100: whole numbers, 100 only when nothing is left. */
function shareReached({ threshold, remaining }: FreeShipping): number {
  if (remaining.amount <= 0) return 100;
  const share = Math.floor(((threshold.amount - remaining.amount) / threshold.amount) * 100);
  return Math.min(99, Math.max(0, share));
}

function FreeShippingProgress({
  freeShipping,
  copy,
  locale,
  className,
  ...props
}: FreeShippingProgressProps) {
  const messageId = useId();
  const reached = freeShipping.remaining.amount <= 0;
  const message = reached
    ? copy.reached
    : formatMessage(
        copy.remaining,
        {
          amount: formatMoney(
            freeShipping.remaining.amount,
            freeShipping.remaining.currencyCode,
            locale,
          ),
        },
        locale,
      );
  const Icon = reached ? CircleCheckIcon : TruckIcon;
  return (
    <div
      data-slot="free-shipping-progress"
      data-reached={reached ? "" : undefined}
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    >
      <div role="status" aria-live="polite" data-slot="free-shipping-message">
        <p id={messageId} className="flex items-start gap-2 text-sm leading-snug font-medium">
          <Icon
            aria-hidden="true"
            className={cn("mt-0.5 size-4 shrink-0", reached && "text-success")}
          />
          <span className="min-w-0 wrap-break-word">{message}</span>
        </p>
      </div>
      <Progress
        value={shareReached(freeShipping)}
        aria-labelledby={messageId}
        className={cn("w-full", reached && "[&_[data-slot=progress-indicator]]:bg-success")}
      />
    </div>
  );
}

export { FreeShippingProgress, shareReached };
export type { FreeShippingProgressProps };
