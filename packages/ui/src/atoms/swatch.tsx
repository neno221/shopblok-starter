// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). One colour or one image of a product's colour
// option, as a 44 × 44 px button (D32) around a 32 px disc. `selected` is a thicker edge and
// `aria-pressed` (M2's VariantSelector adds radio semantics around a group of these); `unavailable`
// strikes the disc through and adds `unavailableLabel` to its name, and the swatch stays reachable
// so a reader can still pick it and be told it is sold out; `disabled` cannot be used at all. The
// colour is data from the catalog (`colour`, any CSS colour), so it is not a token.
import Image from "next/image";
import type * as React from "react";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";

type SwatchProps = Omit<
  React.ComponentProps<"button">,
  "children" | "aria-label" | "aria-pressed"
> & {
  /** The option's name ("Forest green"): the button's accessible name. */
  label: string;
  /** A CSS colour, from the catalog's option value. Give this or `image`. */
  colour?: string;
  /** The URL of a texture or product image, when a colour is not enough. */
  image?: string;
  selected?: boolean;
  /** Sold out in this option: struck through, still reachable. */
  unavailable?: boolean;
  /** Read out after the name when `unavailable` ("Unavailable"). */
  unavailableLabel?: string;
};

function Swatch({
  label,
  colour,
  image,
  selected = false,
  unavailable = false,
  unavailableLabel,
  disabled,
  className,
  type = "button",
  ...props
}: SwatchProps) {
  return (
    <button
      type={type}
      data-slot="swatch"
      data-selected={selected ? "" : undefined}
      data-unavailable={unavailable ? "" : undefined}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-selected:border-2 data-selected:border-primary data-unavailable:opacity-60",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="relative size-8 overflow-hidden rounded-full border border-input"
        style={colour ? { backgroundColor: colour } : undefined}
      >
        {image ? <Image src={image} alt="" fill sizes="32px" className="object-cover" /> : null}
        {unavailable ? (
          <span className="absolute inset-x-0 top-1/2 h-0.5 -rotate-45 bg-foreground shadow-[0_0_0_1px_var(--background)]" />
        ) : null}
      </span>
      <VisuallyHidden>
        {label}
        {unavailable && unavailableLabel ? `, ${unavailableLabel}` : null}
      </VisuallyHidden>
    </button>
  );
}

export { Swatch };
export type { SwatchProps };
