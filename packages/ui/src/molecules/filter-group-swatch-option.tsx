// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"): one colour of FilterGroup's swatch
// facet, a checkbox drawn with the Swatch atom. Base UI's Checkbox renders the swatch as its root
// (`render`, the way VariantSelector renders a radio), so it is `role="checkbox"` with
// `aria-checked`, and a hidden input beside it submits `{name}={value}` when it is checked: the same
// form field as a plain checkbox's. Beside the disc are the colour's name and its count, as text,
// in a label for the swatch: a click on the words toggles it (a 44 px target), and the name the
// swatch is read by is that label ("Black, 8 products"), not the disc's own hidden text. A client
// component: Base UI's checkbox keeps the checked state and the swatch is a render prop's element.
// Without JavaScript the chosen colours still submit, but the disc cannot be toggled: a plain
// checkbox can, a button cannot.
"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Swatch } from "@shopblok/ui/atoms/swatch";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { useId } from "react";

type FilterSwatchOptionProps = {
  /** The form field: the facet's id. */
  name: string;
  /** What the field carries when this colour is chosen. */
  value: string;
  /** The colour's name ("Forest green"). */
  label: string;
  /** A CSS colour, or a picture of it. */
  colour?: string;
  image?: string;
  defaultChecked: boolean;
  /** A colour nothing is left in: it cannot be added (a chosen one can always be taken off). */
  disabled: boolean;
  /** The count as drawn beside the name ("8"). */
  count: string;
  /** The count as read after the name ("8 products"). */
  countLabel: string;
};

function FilterSwatchOption({
  name,
  value,
  label,
  colour,
  image,
  defaultChecked,
  disabled,
  count,
  countLabel,
}: FilterSwatchOptionProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  return (
    <div data-slot="filter-swatch-option" className="flex min-h-11 items-center gap-1">
      <Checkbox.Root
        id={uid}
        nativeButton
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-labelledby={labelId}
        render={
          <Swatch
            label={label}
            colour={colour}
            image={image}
            className="data-checked:border-2 data-checked:border-primary"
          />
        }
      />
      <label
        id={labelId}
        htmlFor={uid}
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm leading-snug select-none",
          disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer",
        )}
      >
        <span className="min-w-0 flex-1 wrap-anywhere">{label}</span>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground tabular-nums">
          {count}
        </span>
        <VisuallyHidden>, {countLabel}</VisuallyHidden>
      </label>
    </div>
  );
}

export { FilterSwatchOption };
export type { FilterSwatchOptionProps };
