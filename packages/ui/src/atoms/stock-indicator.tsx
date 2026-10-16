// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). Whether a product can be bought: in stock,
// low, or out. The state is in words (`text`, a required prop: D30, and WCAG 1.4.1: colour is never
// the only sign) and in the icon's shape as well as in the `stock-in`, `stock-low` and `stock-out`
// token colours. The text's wording ("Only 3 left") is the caller's, from `@shopblok/i18n`.
import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const statuses = {
  "in-stock": { classes: "text-stock-in", Icon: CircleCheckIcon },
  low: { classes: "text-stock-low", Icon: TriangleAlertIcon },
  out: { classes: "text-stock-out", Icon: CircleXIcon },
} as const;

type StockStatus = keyof typeof statuses;

type StockIndicatorProps = Omit<React.ComponentProps<"span">, "children"> & {
  status: StockStatus;
  /** What it says ("In stock", "Only 3 left", "Out of stock"), in the page's language. */
  text: string;
};

function StockIndicator({ status, text, className, ...props }: StockIndicatorProps) {
  const { classes, Icon } = statuses[status];
  return (
    <span
      data-slot="stock-indicator"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm leading-snug font-medium",
        classes,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{text}</span>
    </span>
  );
}

export { StockIndicator };
export type { StockIndicatorProps, StockStatus };
