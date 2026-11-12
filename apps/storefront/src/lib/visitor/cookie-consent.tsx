// Ours (T36, SETUP.md "Footers and site organisms (T36)"; D44, ADR 0004). The cookie banner as a
// browser island: CookieConsent draws a banner for a visitor who has not chosen, and only the
// browser knows whether this one has. The server and the first render in the browser draw nothing
// (the store's server snapshot is "unknown", so `choice` is `undefined`), and a prerendered page is
// the same for everyone; once the store has the visitor, a `consent` of `null` draws the banner and a
// choice draws nothing. The same shape as `VisitorCartButton`: the ui organism takes the value, this
// reads the store.
//
// M6 (T97, D123, D124, D129):
// - The choice is kept in the `_shopblok_consent` cookie (`chooseConsent`), which the store's source
//   reads after hydration, so a visitor who chose is not asked again on the next page or visit.
// - "Cookie settings": every link to `#cookie-settings` on the page (the footer's, the policy
//   page's) is this island's control. Without scripts it is a link to the policy page; with them a
//   click here opens the dialog with the switches as chosen, and focus goes back to the link. A page
//   opened at `#cookie-settings` (a click before the page hydrated) opens it too. No new island.
// - Each choice goes to the cart (`syncCartConsent`, a server action): a withdrawal takes the
//   consent and PostHog's id out of the cart's metadata, so Medusa sends nothing about its order.
// - PostHog (D124): with a key in the build (the literal below, so a keyless build has none of it),
//   the gate (`analytics/gate.ts`) starts PostHog after analytics consent and stops it at once when
//   it is withdrawn; `posthog-js` itself is a chunk the gate imports only then.
"use client";

import { CookieConsent, type CookieConsentProps } from "@shopblok/ui/organisms/cookie-consent";
import { useEffect, useSyncExternalStore } from "react";
import { syncCartConsent } from "../actions/consent";
import { trackSignedUp } from "../analytics/events";
import { watchAnalytics } from "../analytics/gate";
import {
  chooseConsent,
  closeConsentSettings,
  COOKIE_SETTINGS_HASH,
  getServerSettings,
  getSettings,
  isCookieSettingsLink,
  onConsentChange,
  openConsentSettings,
  subscribeSettings,
} from "./consent";
import { readConsentCookie } from "./consent-cookie";
import { useVisitor } from "./use-visitor";

export type VisitorCookieConsentProps = Omit<
  CookieConsentProps,
  "choice" | "onChoose" | "settingsOpen" | "onSettingsOpenChange" | "settingsFinalFocus"
> & {
  /** The page's market key, sent with every analytics event (D124). */
  market?: string;
  /**
   * The market's Medusa locale (`el-GR`), the `locale` of every analytics event (D124): the one
   * Medusa's events read from the cart and the order, so the browser's and the server's agree.
   */
  analyticsLocale?: string;
};

/** A plain left click, which the link would follow in this tab. */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function VisitorCookieConsent({
  market = "",
  analyticsLocale = "",
  ...props
}: VisitorCookieConsentProps) {
  const visitor = useVisitor();
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);

  // "Cookie settings": a click on any link to `#cookie-settings` opens the dialog. In the capture
  // phase, before next/link's own handler, which leaves an event it finds prevented alone.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || !isPlainClick(event)) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor === null || !isCookieSettingsLink(anchor, window.location.origin)) return;
      event.preventDefault();
      openConsentSettings(anchor);
    }
    document.addEventListener("click", onClick, { capture: true });
    if (window.location.hash === COOKIE_SETTINGS_HASH) openConsentSettings(null);
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Each choice goes to the cart's metadata (D124); the server reads the cookie just written.
  useEffect(
    () =>
      onConsentChange(() => {
        void syncCartConsent().catch(() => undefined);
      }),
    [],
  );

  // PostHog, only in a build with its key (D124, D129); and `signed_up` after a registration.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    trackSignedUp();
    return watchAnalytics({
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
      market,
      locale: analyticsLocale,
    });
  }, [market, analyticsLocale]);

  const known = visitor === "unknown" ? undefined : visitor.consent;
  return (
    <CookieConsent
      {...props}
      choice={known}
      onChoose={chooseConsent}
      settingsOpen={settings.open}
      onSettingsOpenChange={(open) => {
        if (!open) closeConsentSettings();
      }}
      settingsFinalFocus={settings.open ? settings.opener : null}
      {...(settings.open && known !== null
        ? { defaultSwitches: known ?? readConsentCookie() ?? undefined }
        : {})}
    />
  );
}
