"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { useEffect, useRef, useState } from "react";
import { startPaymentSetup } from "../../lib/actions/account";
import type { MountedSetup } from "../checkout/stripe/stripe-client";

// Ours (M6 T101, SETUP.md "Saved payment methods (T101)"; D119). "Add a payment method" on the
// account: the server draws the notice that adding needs scripts; once mounted, the island asks the
// backend for a SetupIntent (`startPaymentSetup`: only the signed-in customer's, only where the
// market takes Stripe), loads Stripe (`stripe-client.ts`, by `import()`, so it is in no first load)
// and mounts the Payment Element for it. "Save" confirms the SetupIntent: Stripe keeps the method on
// the customer's Stripe customer, and the shop keeps nothing. A method that needs its own page
// (Revolut Pay's approval, a 3-D Secure check) leaves for it and comes back to the list, which says
// whether it was saved.

export type SetupElementIslandProps = {
  /** The market's key, which the action takes. */
  market: string;
  publishableKey: string;
  /** The market's `<html lang>`: Stripe speaks it, or English. */
  locale: string;
  /** The payment methods page, absolute or a path: where Stripe comes back to, `?added=1` added. */
  returnTo: string;
  words: { noScript: string; submit: string; saving: string; failed: string };
};

export function SetupElementIsland(props: SetupElementIslandProps) {
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef<MountedSetup | null>(null);
  const [phase, setPhase] = useState<"server" | "loading" | "ready" | "saving">("server");
  const [error, setError] = useState<string | null>(null);
  const initial = useRef(props);

  useEffect(() => {
    const element = host.current;
    if (element === null) return;
    const props = initial.current;
    let gone = false;
    setPhase("loading");
    void (async () => {
      const started = await startPaymentSetup(props.market);
      if (!started.ok) throw new Error(started.form ?? "refused");
      const { mountSetupElement } = await import("../checkout/stripe/stripe-client");
      const made = await mountSetupElement({
        publishableKey: props.publishableKey,
        locale: props.locale,
        clientSecret: started.data.clientSecret,
        host: element,
        onReady: () => setPhase("ready"),
      });
      if (gone) made.destroy();
      else mounted.current = made;
    })().catch(() => {
      if (!gone) setError(props.words.failed);
    });
    return () => {
      gone = true;
      mounted.current?.destroy();
      mounted.current = null;
    };
  }, []);

  const save = () => {
    const setup = mounted.current;
    if (setup === null || phase !== "ready") return;
    setPhase("saving");
    setError(null);
    const back = new URL(props.returnTo, window.location.origin);
    back.searchParams.set("added", "1");
    void setup
      .confirm(back.toString())
      .then((answer) => {
        if (answer.error === undefined) window.location.assign(back.toString());
        else {
          if (answer.error !== null) setError(answer.error || props.words.failed);
          setPhase("ready");
        }
      })
      .catch(() => {
        setError(props.words.failed);
        setPhase("ready");
      });
  };

  const saving = phase === "saving";
  return (
    <div data-slot="setup-element" className="flex min-w-0 flex-col gap-4">
      {phase !== "server" ? null : (
        <p
          data-slot="account-payment-method-no-script"
          className="text-sm text-muted-foreground wrap-break-word"
        >
          {props.words.noScript}
        </p>
      )}
      <div ref={host} aria-busy={phase === "loading"} className="min-h-11 min-w-0" />
      <p role="status" className="text-sm font-medium text-destructive empty:hidden">
        {error}
      </p>
      {phase === "server" ? null : (
        <Button
          type="button"
          data-slot="setup-element-submit"
          className="self-start"
          aria-disabled={phase !== "ready" || undefined}
          onClick={save}
        >
          {saving ? props.words.saving : props.words.submit}
        </Button>
      )}
    </div>
  );
}
