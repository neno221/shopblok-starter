// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The one client part of
// CartLineItem: the quantity stepper that sends its form by itself. A client component because a
// change has to be noticed (Base UI's number field commits on a pointer release, on a key and on
// blur) and the form submitted from there; everything else about the line is the server's. The
// stepper's hidden number input is named, so the form carries the quantity as it stands, and a
// change is sent half a second after the last one (SBP, cart.md: debounce 300 to 500 ms), or at
// once on Enter, so three presses on "+" are one request. Changing a quantity updates the cart in
// place; it is not a change of context (WCAG 3.2.2). The field shows what the shopper chose until
// the cart answers: when the cart's quantity changes, or the update ends (`pending` goes from true
// to false), it shows the cart's again, so a refused change (the stock) does not stay on screen.
// While `pending` the field is read-only: it keeps focus and its value, and changes nothing.
"use client";

import { QuantityStepper } from "@shopblok/ui/atoms/quantity-stepper";
import { useEffect, useRef, useState } from "react";

/** Milliseconds after the last change before the form is sent. */
const SEND_AFTER_MS = 500;

type CartLineQuantityProps = {
  /** The field's name in the form (`quantity`). */
  name: string;
  /** What the cart holds for the line. */
  quantity: number;
  /** The most the stock allows. */
  max?: number;
  /** A line that cannot be bought (out of stock) cannot change. */
  disabled?: boolean;
  /** The line is being updated: the field is read-only and sends nothing. */
  pending?: boolean;
  /** A BCP 47 tag such as `el-CY`: how the number is written. */
  locale: string;
  /** The three names, each with the line's in it ("Quantity, Heritage Hoodie"). */
  label: string;
  decrementLabel: string;
  incrementLabel: string;
};

function CartLineQuantity({
  name,
  quantity,
  max,
  disabled,
  pending = false,
  locale,
  label,
  decrementLabel,
  incrementLabel,
}: CartLineQuantityProps) {
  // `null` while the field is empty, which a shopper passes through on the way to a new number.
  const [value, setValue] = useState<number | null>(quantity);
  const [seen, setSeen] = useState({ quantity, pending });
  // The cart's answer, taken in while rendering rather than in an effect (the React docs' way of
  // adjusting state when a prop changes): the field follows the cart when it moves, and when an
  // update ends it goes back to what the cart holds.
  if (seen.quantity !== quantity || seen.pending !== pending) {
    setSeen({ quantity, pending });
    if (seen.quantity !== quantity || (seen.pending && !pending)) setValue(quantity);
  }

  const wrapper = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // `pending` as it is when the timer fires, not when the change was made: a line whose remove was
  // pressed in the meantime sends no quantity (PR 56 review). Becoming pending also drops a send
  // that is waiting.
  const pendingNow = useRef(pending);
  useEffect(() => {
    pendingNow.current = pending;
    if (pending) clearTimeout(timer.current);
  }, [pending]);

  function send(next: number | null, now: boolean) {
    clearTimeout(timer.current);
    if (next === null) {
      // Left empty: the cart's quantity comes back rather than a field that posts nothing.
      setValue(quantity);
      return;
    }
    if (pending || next === quantity) return;
    const submit = () => {
      if (pendingNow.current) return;
      wrapper.current?.closest("form")?.requestSubmit();
    };
    if (now) submit();
    else timer.current = setTimeout(submit, SEND_AFTER_MS);
  }

  return (
    <div
      ref={wrapper}
      data-slot="cart-line-quantity"
      className="min-w-0"
      onKeyDown={(event) => {
        // Enter in the field applies what was typed; the form has no submit button to do it. An
        // empty field has nothing to apply: leaving it brings the cart's quantity back.
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          if (value !== null) send(value, true);
        }
      }}
    >
      <QuantityStepper
        name={name}
        value={value}
        onValueChange={setValue}
        onValueCommitted={(next) => send(next, false)}
        min={1}
        max={max}
        locale={locale}
        disabled={disabled}
        readOnly={pending}
        label={label}
        decrementLabel={decrementLabel}
        incrementLabel={incrementLabel}
      />
    </div>
  );
}

export { CartLineQuantity };
export type { CartLineQuantityProps };
