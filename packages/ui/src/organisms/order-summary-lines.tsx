// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). OrderSummary's lines below `lg`:
// a 44 px disclosure button ("Show order summary", and "3 items" after it) that shows or hides them,
// with `aria-expanded` and `aria-controls`. From `lg` the button is gone and the lines are always
// shown (`lg:block`), and without JavaScript (`noscript:`) the button is gone and the lines are shown,
// because a button that cannot work must not hide anything. A client component because the open
// state is state. It takes every word made (the server formats "3 items"), so it imports no catalog
// and no formatter.
"use client";

import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type OrderSummaryLinesProps = {
  copy: {
    show: string;
    hide: string;
    /** How many items, as the server formatted it: "3 items". */
    count: string;
  };
  /** Open at first below `lg`. */
  defaultOpen?: boolean;
  /** The lines, rendered by the server. */
  children: ReactNode;
};

function OrderSummaryLines({ copy, defaultOpen, children }: OrderSummaryLinesProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  const id = useId();
  return (
    <div data-slot="order-summary-lines" className="flex min-w-0 flex-col gap-3">
      <button
        type="button"
        data-slot="order-summary-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((was) => !was)}
        className="-mx-2 flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md px-2 text-start text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring lg:hidden noscript:hidden"
      >
        <span className="min-w-0 wrap-anywhere">
          {open ? copy.hide : copy.show}
          <span className="text-muted-foreground">, {copy.count}</span>
        </span>
        <Icon
          icon={ChevronDownIcon}
          className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </button>
      <div
        id={id}
        data-slot="order-summary-panel"
        data-open={open ? "" : undefined}
        className={cn(open ? "block" : "hidden lg:block noscript:block")}
      >
        {children}
      </div>
    </div>
  );
}

export { OrderSummaryLines };
export type { OrderSummaryLinesProps };
