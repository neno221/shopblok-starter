// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The disclosure of
// PromoCodeField: a native `<details>` that is open in the server's markup when `needsOpen` is
// true (a code was typed, or the last try failed), so it works before any script runs. A client
// component for one reason: the open state is the shopper's. A plain `open` prop that follows the
// props would close the form when a code is applied (the code is then empty and there is no error),
// and a focused Apply button that disappears leaves focus on the page (WCAG 2.4.3). So the open
// state is kept here, the props can only open it, and a click toggles it.
"use client";

import { cn } from "@shopblok/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

type PromoCodeDisclosureProps = {
  /** The visible name of the disclosure ("Add a promotion code"). */
  summary: string;
  /** Open from the start, and open again when it becomes true (an error after a try). */
  needsOpen: boolean;
  children: React.ReactNode;
  className?: string;
};

function PromoCodeDisclosure({
  summary,
  needsOpen,
  children,
  className,
}: PromoCodeDisclosureProps) {
  const [open, setOpen] = useState(needsOpen);
  const [seen, setSeen] = useState(needsOpen);
  // Taken in while rendering, as the React docs have it for a state that follows a prop: an error
  // or a typed code opens the form; nothing closes it but the shopper.
  if (seen !== needsOpen) {
    setSeen(needsOpen);
    if (needsOpen) setOpen(true);
  }
  return (
    <details
      data-slot="promo-code-disclosure"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn("group/promo min-w-0", className)}
    >
      <summary
        data-slot="promo-code-summary"
        className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md text-sm font-medium underline-offset-4 outline-none select-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0 wrap-anywhere">{summary}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open/promo:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pt-1 pb-1">{children}</div>
    </details>
  );
}

export { PromoCodeDisclosure };
export type { PromoCodeDisclosureProps };
