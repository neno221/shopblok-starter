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
  /** PaymentStep's words: the notice without scripts and the sentence for a failed token. */
  words: { noScript: string; failed: string };
};

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
    };
    const onSubmit = (event: SubmitEvent) => {
      const field = token.current;
      if (field === null || field.value !== "") return; // The token is in: the form goes.
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
