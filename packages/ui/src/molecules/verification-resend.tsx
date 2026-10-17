// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"): the part of VerificationNotice
// that moves, split out so that only this reaches the browser (VerificationNotice formats every
// sentence on the server and passes them in as strings, so no message formatter ships here). A
// client component, because the wait before a new link can be asked for runs down in the browser.
// It reads the wait through `useSyncExternalStore` (D44's way for a per-visitor value, as T33's
// CountdownClock does, whose clock store it reuses): the server snapshot is `resendInSeconds`, the
// number the server rendered with, never `Date.now()` (D50), so the first render, on the server and
// in hydration, is the same; the store starts counting when the browser first subscribes, and a timer
// wakes it at each whole second until it reaches 0. A new store (so a new count from the server's
// number) is made when the number or the status changes, because a resend is a new wait even when
// the server says the same 60 again; the button is not remounted, so it keeps its place and its
// focus. The button is `aria-disabled` while the wait runs or a send is on its way (Base UI's
// `focusableWhenDisabled`, as NewsletterForm's), and `type="button"` then, so it submits nothing;
// it describes itself by the line that says how long is left. That line is not live: it would be
// read every second. A status region that is always in the page says once what happened: sending,
// sent again, failed, and, when a wait that had run ends, that a new link can be asked for now
// (WCAG 4.1.3). The seconds are written by `Intl.NumberFormat`'s unit style into the sentence the
// server cut in two around the time; their word ("sec", "δευτ.") comes from the runtime's ICU,
// which the server's Node and the reader's browser may not write identically, so that line is
// `suppressHydrationWarning` (the number is not: a different number is a real mismatch).
"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { createClock } from "@shopblok/ui/molecules/countdown-clock";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { useId, useMemo, useSyncExternalStore } from "react";
import type * as React from "react";

type VerificationStatus = "sent" | "sending" | "resent" | "error";

type Cooldown = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

/**
 * The browser's side of one wait: the whole seconds left of `seconds`, counted from the moment
 * something first listens. Until then (and on the server) it is `seconds`.
 */
function createCooldown(seconds: number): Cooldown {
  let clock: Cooldown | undefined;
  return {
    subscribe(listener) {
      clock ??= createClock(Date.now() + seconds * 1000);
      return clock.subscribe(listener);
    },
    getSnapshot() {
      return clock === undefined ? seconds : clock.getSnapshot();
    },
  };
}

// An Intl formatter costs far more to build than to use, and the line is written once a second.
const formats = new Map<string, Intl.NumberFormat>();

function secondsOf(locale: string): Intl.NumberFormat {
  let format = formats.get(locale);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "second",
      unitDisplay: "short",
    });
    formats.set(locale, format);
  }
  return format;
}

type VerificationResendProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The server's wait, in seconds: what the first render counts from. 0 means a link can be asked for now. */
  resendInSeconds: number;
  /** Where the resend is. */
  status: VerificationStatus;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The button's text. */
  resendLabel: string;
  /** What the button and the status say while a new link is on its way. */
  sendingText: string;
  /** What is said when a new link has been sent. */
  resentText: string;
  /** What is said when the email could not be sent. */
  errorText: string;
  /** What is said, once, when a wait that was running is over. */
  readyText: string;
  /** The sentence about the wait, up to where the time goes. */
  cooldownBefore: string;
  /** The sentence about the wait, from where the time went. */
  cooldownAfter: string;
};

function VerificationResend({
  resendInSeconds,
  status,
  locale,
  resendLabel,
  sendingText,
  resentText,
  errorText,
  readyText,
  cooldownBefore,
  cooldownAfter,
  className,
  ...props
}: VerificationResendProps) {
  const hintId = useId();
  // The status is a dependency on purpose: a resend starts the wait again from the same number.
  const cooldown = useMemo(() => createCooldown(resendInSeconds), [resendInSeconds, status]);
  const left = useSyncExternalStore(
    cooldown.subscribe,
    cooldown.getSnapshot,
    () => resendInSeconds,
  );
  const sending = status === "sending";
  const waiting = left > 0;
  const blocked = sending || waiting;
  const showHint = waiting && !sending;
  return (
    <div
      data-slot="verification-notice-actions"
      className={cn("flex min-w-0 flex-col items-stretch @md:items-start", className)}
      {...props}
    >
      <Button
        type={blocked ? "button" : "submit"}
        variant="outline"
        disabled={blocked}
        focusableWhenDisabled={blocked}
        aria-busy={sending ? true : undefined}
        aria-describedby={showHint ? hintId : undefined}
        data-slot="verification-notice-resend"
        className="max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {sending ? <Spinner aria-hidden="true" label={sendingText} /> : null}
        <span className="min-w-0 wrap-break-word">{sending ? sendingText : resendLabel}</span>
      </Button>
      {showHint ? (
        <p
          id={hintId}
          suppressHydrationWarning
          data-slot="verification-notice-cooldown"
          className="mt-2 text-sm leading-snug wrap-break-word text-muted-foreground"
        >
          {cooldownBefore}
          {secondsOf(locale).format(left)}
          {cooldownAfter}
        </p>
      ) : null}
      <div role="status" aria-live="polite" data-slot="verification-notice-status">
        {sending ? <VisuallyHidden>{sendingText}</VisuallyHidden> : null}
        {status === "resent" ? (
          <p className="mt-3 flex items-start gap-2 text-sm leading-snug">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0 wrap-break-word">{resentText}</span>
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{errorText}</span>
          </p>
        ) : null}
        {resendInSeconds > 0 && !waiting && !sending ? (
          <p
            data-slot="verification-notice-ready"
            className="mt-2 text-sm leading-snug wrap-break-word text-muted-foreground"
          >
            {readyText}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export { createCooldown, VerificationResend };
export type { VerificationResendProps, VerificationStatus };
