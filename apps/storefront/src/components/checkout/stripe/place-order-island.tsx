"use client";

import { useEffect, useRef, useState } from "react";
import { preparePayment } from "../../../lib/actions/checkout";

// Ours (M6 T100, SETUP.md "Stripe in the checkout (T100)"; D117). Inside the review's "Place order"
// form when Stripe takes the payment: the submit is caught, the action makes sure of a session for
// the cart's current total (Medusa deleted the old one if the total moved: a promotion here, the
// cart changed in another tab) and answers its client secret, and Stripe confirms the PaymentIntent
// with the delivery step's ConfirmationToken. A wallet or a 3-D Secure check may leave for its own
// page and comes back to `/api/payment-return`; otherwise the island goes there itself, paid or
// refused, and the route completes the cart or brings the shopper back to the payment with Stripe's
// reason. Without scripts the form posts to the place-order action, which Medusa refuses (nothing is
// authorised) and the review says so.

export type PlaceOrderIslandProps = {
  /** The market's key, which the actions and the return route take. */
  market: string;
  publishableKey: string;
  locale: string;
  words: { failed: string };
};

/** `/api/payment-return` for this market, absolute, as Stripe's `return_url` must be. */
function returnUrl(
  market: string,
  intent?: { id: string; secret: string; reason?: string | undefined },
): string {
  const url = new URL("/api/payment-return", window.location.origin);
  url.searchParams.set("market", market);
  if (intent !== undefined) {
    url.searchParams.set("payment_intent", intent.id);
    url.searchParams.set("payment_intent_client_secret", intent.secret);
    if (intent.reason) url.searchParams.set("reason", intent.reason.slice(0, 200));
  }
  return url.toString();
}

export function PlaceOrderIsland(props: PlaceOrderIslandProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef(props);

  useEffect(() => {
    const form = anchor.current?.closest("form") ?? null;
    if (form === null) return;
    const props = initial.current;
    let busy = false;
    const onSubmit = (event: SubmitEvent) => {
      // Caught before React's form action, which then does nothing (`defaultPrevented`).
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;
      busy = true;
      form.setAttribute("aria-busy", "true");
      setError(null);
      void (async () => {
        const prepared = await preparePayment(props.market);
        if (!prepared.ok) throw new Error(prepared.form ?? "refused");
        const { clientSecret, intentId, confirmationToken } = prepared.data;
        const { confirmIntent } = await import("./stripe-client");
        // Paid or refused, the return route says which, from Stripe's own answer.
        const confirmed = await confirmIntent({
          publishableKey: props.publishableKey,
          locale: props.locale,
          clientSecret,
          confirmationToken,
          returnUrl: returnUrl(props.market),
        });
        // Stripe.js says why in the market's language; the route shows it only when Stripe says the
        // cart's own intent was refused.
        window.location.assign(
          returnUrl(props.market, { id: intentId, secret: clientSecret, reason: confirmed.error }),
        );
      })().catch(() => {
        busy = false;
        form.removeAttribute("aria-busy");
        setError(props.words.failed);
      });
    };
    form.addEventListener("submit", onSubmit, { capture: true });
    return () => form.removeEventListener("submit", onSubmit, { capture: true });
  }, []);

  return (
    <span ref={anchor} data-slot="place-order-payment" className="contents">
      <span role="status" className="text-sm font-medium text-destructive empty:hidden">
        {error}
      </span>
    </span>
  );
}
