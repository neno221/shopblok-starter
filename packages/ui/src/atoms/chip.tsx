// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"; T33, "Discovery and site-wide molecules (T33)").
// A short tag, such as an applied filter, with an optional remove control. The control's box is
// 44 × 44 px (D32): the margins pull it back so the chip itself stays 32 px tall. Its name,
// `removeLabel`, is a prop (D30); the chip's text is the children and wraps when it is long. The
// control is a button when the chip is removed by a handler (`onRemove`), and a link when it is
// removed by going somewhere (`removeHref`, T33: an applied filter is removed by loading the
// listing without it, which works without JavaScript); the link is `next/link`, so Next does the
// navigation, and takes its `prefetch`.
import NextLink from "next/link";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type ChipProps = Omit<React.ComponentProps<"span">, "children"> & {
  children: React.ReactNode;
  variant?: "secondary" | "outline";
} & (
    | {
        onRemove?: undefined;
        removeHref?: undefined;
        removeLabel?: undefined;
        prefetch?: undefined;
      }
    | {
        /** Shows the remove button. */
        onRemove: () => void;
        removeHref?: undefined;
        /** The remove button's accessible name ("Remove", in the page's language). */
        removeLabel: string;
        prefetch?: undefined;
      }
    | {
        onRemove?: undefined;
        /** Shows the remove link, to this path or URL (the page without what the chip stands for). */
        removeHref: string;
        /** The remove link's accessible name ("Remove Color: Black", in the page's language). */
        removeLabel: string;
        /** The link's `prefetch` (next/link): unset, Next decides; `false` for a link that need not be ready. */
        prefetch?: boolean | null;
      }
  );

// `next/link` takes whatever an app with typed routes narrows its `href` to; the chip's is a string
// the app built (the same cast as ProductCard's title link).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

const removeClasses =
  "-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring [&_svg]:size-4";

function Chip({
  className,
  variant = "secondary",
  onRemove,
  removeHref,
  removeLabel,
  prefetch,
  children,
  ...props
}: ChipProps) {
  const removable = onRemove !== undefined || removeHref !== undefined;
  return (
    <span
      data-slot="chip"
      className={cn(
        "inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-transparent ps-3 text-sm leading-snug",
        removable ? "pe-1" : "pe-3",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "border-border text-foreground",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 py-1 wrap-anywhere">{children}</span>
      {removeHref !== undefined ? (
        <NextLink
          href={removeHref as LinkHref}
          prefetch={prefetch}
          data-slot="chip-remove"
          aria-label={removeLabel}
          className={removeClasses}
        >
          <XIcon aria-hidden="true" />
        </NextLink>
      ) : onRemove !== undefined ? (
        <button
          type="button"
          data-slot="chip-remove"
          aria-label={removeLabel}
          onClick={onRemove}
          className={removeClasses}
        >
          <XIcon aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export { Chip };
export type { ChipProps };
