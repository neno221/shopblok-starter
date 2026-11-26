import "server-only";
import type * as React from "react";
import { turnstileSiteKey } from "../../lib/security/turnstile";
import { TurnstileChallenge } from "./turnstile";

/**
 * M7 D143 (T108): the Turnstile widget a form draws, in the market's language (`htmlLang`'s first
 * part), or `undefined` when its keys are not both set: the form then draws nothing of Cloudflare's.
 */
export function challengeFor(htmlLang: string, noScript: string): React.ReactNode | undefined {
  const siteKey = turnstileSiteKey();
  if (siteKey === undefined) return undefined;
  const language = (htmlLang.split("-")[0] ?? "").toLowerCase() || "auto";
  return <TurnstileChallenge siteKey={siteKey} language={language} noScript={noScript} />;
}
