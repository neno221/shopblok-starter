// M7 D143 (T108): the Turnstile widget's box in a form. All its code is `turnstile-widget.ts`,
// imported once the island has mounted, so no route's first load holds it (D102; `first-load.ts`
// keeps it out); `challenge.tsx` draws the `<noscript>` line on the server.
"use client";

import { useEffect, useRef } from "react";

type TurnstileIslandProps = {
  siteKey: string;
  /** The market's language (`el`, `de`): the widget's own words. */
  language: string;
};

export function TurnstileIsland({ siteKey, language }: TurnstileIslandProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = box.current;
    const form = element?.closest("form");
    if (!element || !form) return;
    let undo: (() => void) | undefined;
    let stopped = false;
    // Until the widget's module is here, a press is held (never taken as one without scripts) and
    // handed over to it (the review of PR 153); if the module cannot load, it goes as it is.
    let press: { submitter: HTMLElement | null } | undefined;
    const hold = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      press = { submitter: event.submitter };
    };
    form.addEventListener("submit", hold);
    void import("./turnstile-widget").then(
      ({ attachTurnstile }) => {
        form.removeEventListener("submit", hold);
        if (!stopped) undo = attachTurnstile(element, { siteKey, language, press });
      },
      () => {
        form.removeEventListener("submit", hold);
        if (!stopped && press) form.requestSubmit(press.submitter);
      },
    );
    return () => {
      stopped = true;
      form.removeEventListener("submit", hold);
      undo?.();
    };
  }, [siteKey, language]);
  return <div ref={box} data-slot="turnstile-box" />;
}
