// Ours (T36, SETUP.md "Footers and site organisms (T36)"; D44, ADR 0004). The cookie banner as a
// browser island: CookieConsent draws a banner for a visitor who has not chosen, and only the
// browser knows whether this one has. The server and the first render in the browser draw nothing
// (the store's server snapshot is "unknown", so `choice` is `undefined`), and a prerendered page is
// the same for everyone; once the store has the visitor, a `consent` of `null` draws the banner and a
// choice draws nothing. The visitor's choice goes back into the store (`setConsent`), so the banner
// goes at once, on every page that shows one, and whatever reads the store sees what was chosen.
// The same shape as `VisitorCartButton`: the ui organism takes the value, this reads the store.
"use client";

import { CookieConsent, type CookieConsentProps } from "@shopblok/ui/organisms/cookie-consent";
import { setConsent } from "./store";
import { useVisitor } from "./use-visitor";

export type VisitorCookieConsentProps = Omit<CookieConsentProps, "choice" | "onChoose">;

export function VisitorCookieConsent(props: VisitorCookieConsentProps) {
  const visitor = useVisitor();
  return (
    <CookieConsent
      {...props}
      choice={visitor === "unknown" ? undefined : visitor.consent}
      onChoose={setConsent}
    />
  );
}
