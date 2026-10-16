// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). `next/link` with the link styles. A link that
// opens a new tab gets `rel="noopener noreferrer"` and, when `newTabLabel` is given, says so to
// screen readers. `aria-current` and every other attribute pass through. An inline link in a
// sentence is exempt from D32's 44 px (WCAG 2.5.8); `variant="standalone"` is the 44 px one for
// navigation and lists.
import NextLink from "next/link";
import type * as React from "react";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";

type LinkProps = React.ComponentProps<typeof NextLink> & {
  /** `inline` sits in running text; `standalone` is its own 44 px target. */
  variant?: "inline" | "standalone";
  /** Read out after the text when the link opens a new tab ("Opens in a new tab"). */
  newTabLabel?: string;
};

function Link({
  className,
  variant = "inline",
  newTabLabel,
  target,
  rel,
  children,
  ...props
}: LinkProps) {
  const newTab = target === "_blank";
  const relTokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  if (newTab) {
    relTokens.add("noopener");
    relTokens.add("noreferrer");
  }
  return (
    <NextLink
      data-slot="link"
      target={target}
      rel={relTokens.size > 0 ? [...relTokens].join(" ") : undefined}
      className={cn(
        "rounded-xs text-primary underline underline-offset-4 outline-none hover:decoration-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-[current=page]:font-semibold",
        variant === "standalone" && "inline-flex min-h-11 items-center",
        className,
      )}
      {...props}
    >
      {children}
      {newTab && newTabLabel ? <VisuallyHidden> ({newTabLabel})</VisuallyHidden> : null}
    </NextLink>
  );
}

export { Link };
export type { LinkProps };
