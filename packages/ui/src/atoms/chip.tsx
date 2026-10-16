// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). A short tag, such as an applied filter, with
// an optional remove button. The button's box is 44 × 44 px (D32): the margins pull it back so the
// chip itself stays 32 px tall. Its name, `removeLabel`, is a prop (D30); the chip's text is the
// children and wraps when it is long.
import { XIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type ChipProps = Omit<React.ComponentProps<"span">, "children"> & {
  children: React.ReactNode;
  variant?: "secondary" | "outline";
} & (
    | { onRemove?: undefined; removeLabel?: undefined }
    | {
        /** Shows the remove button. */
        onRemove: () => void;
        /** The remove button's accessible name ("Remove", in the page's language). */
        removeLabel: string;
      }
  );

function Chip({
  className,
  variant = "secondary",
  onRemove,
  removeLabel,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-transparent ps-3 text-sm leading-snug",
        onRemove ? "pe-1" : "pe-3",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "border-border text-foreground",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 py-1 wrap-anywhere">{children}</span>
      {onRemove ? (
        <button
          type="button"
          data-slot="chip-remove"
          aria-label={removeLabel}
          onClick={onRemove}
          className="-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring [&_svg]:size-4"
        >
          <XIcon aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export { Chip };
export type { ChipProps };
