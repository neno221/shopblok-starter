"use client";

import { useEffect, useRef, useState } from "react";
import {
  expressAddress,
  expressConfirm,
  expressRate,
  expressTotal,
} from "../../../lib/actions/checkout";
import { paymentReturnUrl } from "./payment-return-url";
import type { ExpressPrepared, ExpressRate } from "./stripe-client";

// Ours (M6 T102, SETUP.md "Express checkout (T102)"; D120). Stripe's Express Checkout Element in the
// `express-rail` layout's rail (`slots.express`), on the contact step. The rail is hidden until the
// Element says it has a wallet to show (`data-express="shown"`; the template hides its section
// while this island's root says `hidden`), so without scripts, or on a device with no wallet, the
// page is the default layout's. The island loads Stripe after hydration (`stripe-client.ts`, by
// `import()`, in no first load), and each wallet event goes through the cart: the address the
// wallet shows and the option picked in it (`expressAddress`, `expressRate`), then the payment
// (`expressConfirm`: the address, the e-mail, the token, the session), which Stripe confirms; the
// order is placed by `/api/payment-return`, as for every Stripe payment (D117).

export type ExpressCheckoutIslandProps = {
  /** The market's key, which the actions and the return route take. */
  market: string;
  publishableKey: string;
  /** The market's `<html lang>`: Stripe speaks it, or English. */
  locale: string;
  currency: string;
  /** The cart's total, in the main unit. */
  amount: number;
  /** The region's countries (lower case), the only ones a wallet may ship to. */
  countries: string[];
  /** The cart's shipping options a wallet can offer, before it has an address. */
  rates: ExpressRate[];
  /** The rail's words for a payment that stopped: the address, a total that moved, anything else. */
  words: { address: string; changed: string; failed: string };
};

type State = "hidden" | "shown";

export function ExpressCheckoutIsland(props: ExpressCheckoutIslandProps) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("hidden");
  // The wallets the Element draws, by Stripe's names: the spec reads which show (SETUP's record).
  const [methods, setMethods] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The props are read once: the island mounts the Element once per page.
  const initial = useRef(props);

  useEffect(() => {
    const element = host.current;
    if (element === null) return;
    const props = initial.current;
    const market = props.market;
    let gone = false;
    let mounted: { destroy(): void } | null = null;

    void import("./stripe-client")
      .then(({ mountExpressCheckout }) =>
        mountExpressCheckout({
          publishableKey: props.publishableKey,
          locale: props.locale,
          currency: props.currency,
          amount: props.amount,
          host: element,
          countries: props.countries,
          rates: props.rates,
          returnUrl: paymentReturnUrl(market),
          onShown: (methods) => {
            if (gone) return;
            setMethods(methods.join(" "));
            if (methods.length > 0) setState("shown");
            else mounted?.destroy();
          },
          onAddress: async (address) => {
            setError(null);
            const answer = await expressAddress({ market, ...address });
            return answer.ok ? { rates: answer.data.rates, total: answer.data.total } : null;
          },
          onRate: async (id) => {
            const answer = await expressRate({ market, shippingOption: id });
            return answer.ok ? { total: answer.data.total } : null;
          },
          onPay: async ({ address, token, ...payment }): Promise<ExpressPrepared> => {
            setError(null);
            const answer = await expressConfirm({
              market,
              ...payment,
              ...address,
              confirmationToken: token,
            });
            if (answer.ok) return answer.data;
            if (answer.reason === "changed") return { error: "changed" };
            const fields = Object.keys(answer.errors);
            return {
              error: fields.some((field) => field !== "shippingOption") ? "address" : "failed",
            };
          },
          onTotal: async () => {
            const answer = await expressTotal(market);
            return answer.ok ? answer.data.total : null;
          },
          onConfirmed: ({ intentId, clientSecret, error }) => {
            // Paid or refused, the return route says which, from Stripe's own answer (D117).
            window.location.assign(
              paymentReturnUrl(market, { id: intentId, secret: clientSecret, reason: error }),
            );
          },
          onFailed: (kind) => {
            if (!gone) setError(props.words[kind]);
          },
        }),
      )
      .then((made) => {
        if (gone) made.destroy();
        else mounted = made;
      })
      .catch(() => {
        // Stripe.js did not load: the rail stays hidden and the form below is the way to pay.
      });

    return () => {
      gone = true;
      mounted?.destroy();
    };
  }, []);

  return (
    <div
      data-slot="express-checkout"
      data-express={state}
      data-methods={methods}
      className="flex min-w-0 flex-col gap-2"
    >
      <div ref={host} className="min-h-11 min-w-0" />
      <p role="status" className="text-sm font-medium text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}
