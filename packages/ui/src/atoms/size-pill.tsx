// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). One size option ("M", "42", "One size") as a
// pill at least 44 × 44 px (D32). `selected` is a solid fill and `aria-pressed` (M2's
// VariantSelector adds radio semantics around a group); `unavailable` strikes the text through and
// adds `unavailableLabel` to the name, and stays reachable; `disabled` cannot be used. Long
// labels wrap. Selected and sold out keeps the fill's own foreground (muted grey on black is
// 4.24:1).
import type * as React from "react";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";

type SizePillProps = Omit<React.ComponentProps<"button">, "aria-pressed"> & {
  selected?: boolean;
} & (
    | { unavailable?: false; unavailableLabel?: string }
    | {
        /** Sold out in this option: struck through, still reachable. */
        unavailable: true;
        /** Read out after the name ("Unavailable"): without it the state would be a line alone. */
        unavailableLabel: string;
      }
  );

function SizePill({
  selected = false,
  unavailable = false,
  unavailableLabel,
  className,
  children,
  type = "button",
  ...props
}: SizePillProps) {
  return (
    <button
      type={type}
      data-slot="size-pill"
      data-selected={selected ? "" : undefined}
      data-unavailable={unavailable ? "" : undefined}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-center text-sm leading-snug font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-selected:border-primary data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary data-unavailable:not-data-selected:text-muted-foreground data-unavailable:line-through",
        className,
      )}
      {...props}
    >
      {children}
      {unavailable && unavailableLabel ? (
        <VisuallyHidden>, {unavailableLabel}</VisuallyHidden>
      ) : null}
    </button>
  );
}

export { SizePill };
export type { SizePillProps };
