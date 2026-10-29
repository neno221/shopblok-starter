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

/** The `rel` of a link: its own tokens, and `noopener noreferrer` when it opens a new tab. */
function linkRel(target: string | undefined, rel: string | undefined): string | undefined {
  const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  if (target === "_blank") {
    tokens.add("noopener");
    tokens.add("noreferrer");
  }
  return tokens.size > 0 ? [...tokens].join(" ") : undefined;
}

/** What a screen reader hears after a link that opens a new tab ("(Opens in a new tab)"). */
function NewTabNote({ target, label }: { target: string | undefined; label: string | undefined }) {
  return target === "_blank" && label ? <VisuallyHidden> ({label})</VisuallyHidden> : null;
}

function Link({
  className,
  variant = "inline",
  newTabLabel,
  target,
  rel,
  children,
  ...props
}: LinkProps) {
  return (
    <NextLink
      data-slot="link"
      target={target}
      rel={linkRel(target, rel)}
      className={cn(
        "rounded-xs text-primary underline underline-offset-4 outline-none hover:decoration-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-[current=page]:font-semibold",
        variant === "standalone" && "inline-flex min-h-11 items-center",
        className,
      )}
      {...props}
    >
      {children}
      <NewTabNote target={target} label={newTabLabel} />
    </NextLink>
  );
}

export { Link, linkRel, NewTabNote };
export type { LinkProps };
