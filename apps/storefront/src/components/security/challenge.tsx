import "server-only";
import type * as React from "react";
import { turnstileSiteKey } from "../../lib/security/turnstile";
import { TurnstileIsland } from "./turnstile-island";

/**
 * M7 D143 (T108): the Turnstile widget a form draws, in the market's language (`htmlLang`'s first
 * part), or `undefined` when its keys are not both set: the form then draws nothing of Cloudflare's.
 * The widget's code loads after hydration (`turnstile-island.tsx`); the line for a visitor without
 * scripts is drawn here, on the server.
 */
export function challengeFor(htmlLang: string, noScript: string): React.ReactNode | undefined {
  const siteKey = turnstileSiteKey();
  if (siteKey === undefined) return undefined;
  const language = (htmlLang.split("-")[0] ?? "").toLowerCase() || "auto";
  return (
    <div data-slot="turnstile" className="min-w-0">
      <TurnstileIsland siteKey={siteKey} language={language} />
      <noscript>
        <p className="text-sm leading-snug wrap-break-word text-muted-foreground">{noScript}</p>
      </noscript>
    </div>
  );
}
