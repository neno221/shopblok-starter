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
    if (element === null) return;
    let undo: (() => void) | undefined;
    let stopped = false;
    void import("./turnstile-widget").then(({ attachTurnstile }) => {
      if (!stopped) undo = attachTurnstile(element, { siteKey, language });
    });
    return () => {
      stopped = true;
      undo?.();
    };
  }, [siteKey, language]);
  return <div ref={box} data-slot="turnstile-box" />;
}
