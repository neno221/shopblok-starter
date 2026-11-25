"use client";

import { useEffect, useRef, useState } from "react";
import type { MountedElement } from "./stripe-client";

// Ours (M6 T100, SETUP.md "Stripe in the checkout (T100)"; D117). Stripe's Payment Element in
// PaymentStep's box on the delivery step, in deferred mode: no PaymentIntent exists yet. The server
// draws the box's notice (paying online needs scripts); once mounted, the island loads Stripe
// (`stripe-client.ts`, by `import()`, so it is in no first load) and the Element replaces it. The
// Element's amount follows the shipping option the shopper picks. The form's submit is caught
// first: the Element checks its details and makes a ConfirmationToken, which goes in the form's
// hidden `confirmationToken`, and the form is sent again, so the delivery action keeps the token and
// initiates the session for the total last (D117). Nothing about the card reaches the shop.
// M6 D119 (T101): a saved method's radio sends the form without a token, and "Save this card for
// next time" tells the Element, so the token carries Stripe's `setup_future_usage` (the backend
// reads saving from the token, and takes it only from the cart's own signed-in customer).

export type PaymentElementIslandProps = {
  publishableKey: string;
  /** The market's `<html lang>`: Stripe speaks it, or English. */
  locale: string;
  currency: string;
  /** The cart's total without its shipping, and each option's price: the amount is their sum. */
  base: number;
  shipping: Record<string, number>;
  /** The option chosen when the page was drawn. */
  selected?: string;
  /** M6 D119: "Save this card for next time" as the page drew it. */
  saving?: boolean;
  /** PaymentStep's words: the notice without scripts and the sentence for a failed token. */
  words: { noScript: string; failed: string };
};

/** Stripe's way to pay, the radio whose box holds the Element (a saved method's radio has its `pm_…` id). */
const STRIPE_PROVIDER = "pp_stripe_stripe";

/** Whether the form pays through the Element (not a saved method, D119). */
function paysWithElement(form: HTMLFormElement): boolean {
  const checked = form.querySelector<HTMLInputElement>('input[name="paymentMethod"]:checked');
  return checked === null || checked.value === STRIPE_PROVIDER;
}

/** Whether "Save this card for next time" is ticked. */
function savingIn(form: HTMLFormElement | null, fallback: boolean): boolean {
  const box = form?.querySelector<HTMLInputElement>('input[name="saveForLater"]');
  return box === null || box === undefined ? fallback : box.checked;
}

/** The total for the form's chosen shipping option (none chosen: the base). */
function amountFor(form: HTMLFormElement | null, props: PaymentElementIslandProps): number {
  const checked = form?.querySelector<HTMLInputElement>('input[name="shippingOption"]:checked');
  const id = checked?.value ?? props.selected;
  return props.base + (id === undefined ? 0 : (props.shipping[id] ?? 0));
}

export function PaymentElementIsland(props: PaymentElementIslandProps) {
  const host = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLInputElement>(null);
  // `server`: what the HTML says (the notice); `loading` once a script runs; `ready` with the Element.
  const [phase, setPhase] = useState<"server" | "loading" | "ready">("server");
  const [error, setError] = useState<string | null>(null);
  // The props are read once: the island mounts the Element once per page.
  const initial = useRef(props);

  useEffect(() => {
    const element = host.current;
    const form = element?.closest("form") ?? null;
    if (element === null || form === null) return;
    const props = initial.current;
    let mounted: MountedElement | null = null;
    let gone = false;
    let busy = false;
    setPhase("loading");

    const onChange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.name === "shippingOption") mounted?.setAmount(amountFor(form, props));
      if (target?.name === "saveForLater") mounted?.setSaving(target.checked);
    };
    const onSubmit = (event: SubmitEvent) => {
      const field = token.current;
      if (field === null || field.value !== "") return; // The token is in: the form goes.
      if (!paysWithElement(form)) return; // A saved method (D119): no token, the form goes.
      // Caught before React's form action, which then does nothing (`defaultPrevented`).
      event.preventDefault();
      event.stopPropagation();
      if (busy || mounted === null) return;
      busy = true;
      setError(null);
      const submitter = event.submitter;
      void mounted
        .confirmationToken()
        .then((made) => {
          if ("token" in made) {
            field.value = made.token;
            form.requestSubmit(submitter instanceof HTMLElement ? submitter : undefined);
          } else if (made.error !== null) setError(made.error);
        })
        .catch(() => setError(props.words.failed))
        .finally(() => {
          busy = false;
        });
    };
    form.addEventListener("change", onChange);
    form.addEventListener("submit", onSubmit, { capture: true });

    void import("./stripe-client")
      .then(({ mountPaymentElement }) =>
        mountPaymentElement({
          publishableKey: props.publishableKey,
          locale: props.locale,
          amount: amountFor(form, props),
          currency: props.currency,
          host: element,
          saving: savingIn(form, props.saving ?? false),
          onReady: () => setPhase("ready"),
        }),
      )
      .then((made) => {
        if (gone) made.destroy();
        else mounted = made;
      })
      .catch(() => setError(props.words.failed));

    return () => {
      gone = true;
      form.removeEventListener("change", onChange);
      form.removeEventListener("submit", onSubmit, { capture: true });
      mounted?.destroy();
    };
  }, []);

  return (
    <div data-slot="payment-element" className="flex min-w-0 flex-col gap-3">
      <input ref={token} type="hidden" name="confirmationToken" defaultValue="" />
      {phase !== "server" ? null : (
        <p data-slot="payment-step-no-script" className="text-sm text-muted-foreground">
          {props.words.noScript}
        </p>
      )}
      <div ref={host} aria-busy={phase === "loading"} className="min-h-11 min-w-0" />
      <p role="status" className="text-sm font-medium text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}
