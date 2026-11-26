"use client";

import { useEffect, useRef } from "react";

// M7 D143 (T108): Cloudflare's Turnstile widget inside a form, drawn only when both keys are set
// (the page passes the site key from `turnstileSiteKey()`). Nothing of Cloudflare's is in the first
// load: the script is fetched on the form's first focus or press, and the widget renders into this
// box with `appearance: "interaction-only"`, so it shows only when Cloudflare asks the visitor to
// act. Its token goes into the form as `cf-turnstile-response`, which the action checks first
// (`lib/security/turnstile.ts`).
//
// A press of the button before the token is there is held and sent again once it is, so a visitor
// with scripts is never taken as one without them (that path is limited to once an hour). If the
// script cannot load, or the widget fails, the form goes as it is: the server's limits decide then.
// A token is good for one check, so the widget starts again after each sending. Without scripts the
// `<noscript>` line says the form can be sent once an hour.

const API = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Below Turnstile's `flexible` minimum, the widget is drawn `compact`. */
const FLEXIBLE_MIN_WIDTH = 300;

type TurnstileOptions = {
  sitekey: string;
  language: string;
  appearance: "interaction-only";
  size: "flexible" | "compact";
  callback: (token: string) => void;
  "error-callback": () => boolean;
  "expired-callback": () => void;
  "unsupported-callback": () => void;
};

type TurnstileApi = {
  render(container: HTMLElement, options: TurnstileOptions): string | null | undefined;
  reset(widget: string): void;
  remove(widget: string): void;
  getResponse(widget: string): string | undefined;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | undefined;

/** Cloudflare's script, once per page (its URL may not be copied or proxied, by Cloudflare's rule). */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile !== undefined) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = API;
    script.async = true;
    script.onload = () =>
      window.turnstile === undefined
        ? reject(new Error("turnstile: the script has no API"))
        : resolve(window.turnstile);
    script.onerror = () => reject(new Error("turnstile: the script did not load"));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

type TurnstileChallengeProps = {
  siteKey: string;
  /** The market's language (`el`, `de`): the widget's own words. */
  language: string;
  /** The catalog's line for a visitor without scripts. */
  noScript: string;
};

export function TurnstileChallenge({ siteKey, language, noScript }: TurnstileChallengeProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = box.current;
    const form = element?.closest("form");
    if (element === null || form === null || form === undefined) return;
    let widget: string | undefined;
    let token = "";
    /** Whether the widget cannot give a token: the form then goes without one. */
    let broken = false;
    let held: HTMLElement | null | undefined;
    let stopped = false;

    const release = () => {
      if (held === undefined) return;
      const submitter = held;
      held = undefined;
      form.requestSubmit(
        submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter
          : undefined,
      );
    };
    const fail = () => {
      broken = true;
      release();
    };
    const start = () => {
      form.removeEventListener("focusin", start);
      form.removeEventListener("pointerdown", start);
      loadTurnstile()
        .then((api) => {
          if (stopped || widget !== undefined) return;
          widget =
            api.render(element, {
              sitekey: siteKey,
              language,
              appearance: "interaction-only",
              size: element.clientWidth < FLEXIBLE_MIN_WIDTH ? "compact" : "flexible",
              callback: (value) => {
                token = value;
                broken = false;
                release();
              },
              // `true`: handled here, so Turnstile does not log it again.
              "error-callback": () => {
                token = "";
                fail();
                return true;
              },
              "expired-callback": () => {
                token = "";
              },
              "unsupported-callback": fail,
            }) ?? undefined;
          if (widget === undefined) fail();
        })
        .catch(fail);
    };
    const submitted = (event: SubmitEvent) => {
      if (token === "" && !broken) {
        // Not yet: hold the press until the widget answers (React never sees this event).
        event.preventDefault();
        event.stopImmediatePropagation();
        held = event.submitter;
        start();
        return;
      }
      // The token is spent on this sending (React has read the form by the next task).
      token = "";
      const id = widget;
      if (id !== undefined && !broken) setTimeout(() => window.turnstile?.reset(id), 0);
    };
    form.addEventListener("focusin", start);
    form.addEventListener("pointerdown", start);
    form.addEventListener("submit", submitted);
    return () => {
      stopped = true;
      form.removeEventListener("focusin", start);
      form.removeEventListener("pointerdown", start);
      form.removeEventListener("submit", submitted);
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [siteKey, language]);
  return (
    <div data-slot="turnstile" className="min-w-0">
      <div ref={box} />
      <noscript>
        <p className="text-sm leading-snug wrap-break-word text-muted-foreground">{noScript}</p>
      </noscript>
    </div>
  );
}
