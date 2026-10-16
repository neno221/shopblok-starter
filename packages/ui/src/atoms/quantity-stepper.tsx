// Vendored from ReUI (`@reui/number-field`, shadcn CLI 4.21.4, style base-vega), 2026-10-16. MIT,
// see packages/ui/NOTICE.md. Edited (SETUP.md, "Atoms (T23)"): one component, `QuantityStepper`,
// instead of the six parts (the scrub area, its cursor and the `Label` dependency are gone); one
// size, 44 px: both buttons are `size-11` and the input is `h-11` (D32); the labels of the two
// buttons and of the input are required props (D30), and the icons are Lucide's instead of
// the registry's `IconPlaceholder`; the ring is drawn at full strength when a part has keyboard
// focus (D35) and not tinted when invalid; light only (no `dark:`); no `pointer-coarse:` hit area
// (the buttons are already 44 px).
"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@shopblok/ui/lib/utils";

type QuantityStepperProps = Omit<NumberFieldPrimitive.Root.Props, "children" | "render"> & {
  /** The input's accessible name ("Quantity"). */
  label: string;
  /** The minus button's accessible name ("Decrease quantity"). */
  decrementLabel: string;
  /** The plus button's accessible name ("Increase quantity"). */
  incrementLabel: string;
};

const stepButton =
  "relative flex size-11 shrink-0 cursor-pointer items-center justify-center outline-none transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4";

function QuantityStepper({
  className,
  label,
  decrementLabel,
  incrementLabel,
  min = 1,
  step = 1,
  ...props
}: QuantityStepperProps) {
  return (
    <NumberFieldPrimitive.Root
      data-slot="quantity-stepper"
      min={min}
      step={step}
      className={cn("flex w-fit max-w-full flex-col items-start gap-2", className)}
      {...props}
    >
      <NumberFieldPrimitive.Group
        data-slot="quantity-stepper-group"
        className="relative flex h-11 w-fit max-w-full justify-between rounded-md border border-input bg-transparent transition-colors has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring has-aria-invalid:border-destructive data-disabled:pointer-events-none data-disabled:opacity-50"
      >
        <NumberFieldPrimitive.Decrement
          data-slot="quantity-stepper-decrement"
          aria-label={decrementLabel}
          className={cn(stepButton, "rounded-s-md")}
        >
          <MinusIcon aria-hidden="true" />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          data-slot="quantity-stepper-input"
          aria-label={label}
          className="h-11 w-14 min-w-0 flex-1 bg-transparent px-2 text-center text-base tabular-nums outline-none md:text-sm"
        />
        <NumberFieldPrimitive.Increment
          data-slot="quantity-stepper-increment"
          aria-label={incrementLabel}
          className={cn(stepButton, "rounded-e-md")}
        >
          <PlusIcon aria-hidden="true" />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}

export { QuantityStepper };
export type { QuantityStepperProps };
