// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The shell that ShippingOptionCard
// and PaymentMethodCard share: one choice of a radio group, drawn as a card. It is a native
// `<input type="radio">` inside a `<label>` that is the whole card, so it works before any
// JavaScript and the form sends the group's `name` with the chosen `value`; the caller draws the
// group (a `<fieldset>` and its `<legend>`) and the cards inside it. The input is visually hidden
// (`sr-only`, still the focusable, announced control) and a round mark beside it is drawn from its
// state (`peer-checked`): a thick ring, not a dot or a fill, so the chosen card still shows its mark in
// forced-colors mode, where backgrounds are dropped and borders are kept. The card's own chosen style
// and focus ring come from the input's state too (`has-[:checked]`, `has-[:focus-visible]`), as
// QuantityStepper's ring does, and the card is at least 44 px tall, the whole label being the
// target (D32; the DS size check counts a radio's label). The input is named by the element the
// caller points `labelledBy` at (the card's main line) and described by `describedBy` (the rest), so a
// screen reader says "Standard shipping, radio button, 1 of 3, $5.50, 3–5 business days" and not the
// card's text run together. A label holds phrasing content only, so everything inside is a `span`.
// A server component: it holds no state, and the checked state is the browser's.
import { cn } from "@shopblok/ui/lib/utils";
import { useId } from "react";
import type * as React from "react";

type RadioCardProps = Omit<
  React.ComponentProps<"label">,
  "children" | "onChange" | "defaultChecked" | "htmlFor"
> & {
  /**
   * Chosen, as the caller says. With `onChange` it is a controlled radio; without, it is drawn
   * chosen and read-only (the design system's states, or a page that has decided for the shopper).
   */
  checked?: boolean;
  /** Chosen when the page loads, and then the browser's. */
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** The group's name: every card of a group has the same one. */
  name: string;
  /** What the form sends when this card is chosen. */
  value: string;
  required?: boolean;
  disabled?: boolean;
  /** The id of the element inside that is the card's main line: the input's accessible name. */
  labelledBy: string;
  /** The ids inside that describe it, in reading order: the input's accessible description. */
  describedBy?: string;
  /** The card's content: spans only. */
  children: React.ReactNode;
};

function RadioCard({
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  required,
  disabled,
  labelledBy,
  describedBy,
  className,
  children,
  ...props
}: RadioCardProps) {
  const inputId = useId();
  return (
    <label
      data-slot="radio-card"
      htmlFor={inputId}
      className={cn(
        "relative flex min-h-11 w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-start text-base text-foreground transition-colors has-[:checked]:border-primary has-[:checked]:outline-1 has-[:checked]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-muted has-[:disabled]:text-muted-foreground has-[:enabled]:hover:bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
        className,
      )}
      {...props}
    >
      <input
        id={inputId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        readOnly={checked !== undefined && onChange === undefined ? true : undefined}
        required={required}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        data-slot="radio-card-mark"
        className="mt-0.5 size-4 shrink-0 rounded-full border border-input bg-background transition-[border-width] peer-checked:border-[5px] peer-checked:border-primary peer-disabled:opacity-50"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </label>
  );
}

export { RadioCard };
export type { RadioCardProps };
