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
// - A choice goes to the cart (`syncCartConsent`, a server action): a withdrawal takes the consent
//   and PostHog's id out of the cart's metadata, so Medusa sends nothing about its order. With a
//   PostHog key a "yes" is the gate's to send, once PostHog has made the distinct id.
// - PostHog (D124): with a key in the build (the literal below, so a keyless build has none of it),
//   the island imports the gate (`analytics/gate.ts`, its own chunk, D129) only after analytics
//   consent, or to clear PostHog's cookies left after a withdrawal; the gate then starts and stops
//   PostHog itself, and `posthog-js` is a further chunk the gate imports.
// - The dialog's state is this island's (`useState`): only it opens and closes the dialog. Each
//   opening is a new `settingsKey`, so the dialog starts from the switches as chosen now.
"use client";

import { CookieConsent, type CookieConsentProps } from "@shopblok/ui/organisms/cookie-consent";
import { useEffect, useState } from "react";
import { syncCartConsent } from "../actions/consent";
import { POSTHOG_EU } from "../site";
import {
  chooseConsent,
  COOKIE_SETTINGS_HASH,
  isCookieSettingsLink,
  onConsentChange,
} from "./consent";
import { readConsentCookie } from "./consent-cookie";
import { useVisitor } from "./use-visitor";

export type VisitorCookieConsentProps = Omit<
  CookieConsentProps,
  | "choice"
  | "onChoose"
  | "settingsOpen"
  | "onSettingsOpenChange"
  | "settingsFinalFocus"
  | "settingsKey"
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

/** PostHog's cookie (`ph_<key>_posthog`) or its opt-in flag left in this browser. */
const POSTHOG_COOKIE = /(^|;\s*)(ph_|__ph)/;

/** The settings dialog: open with the control that opened it, and which opening this is. */
type Settings = { open: boolean; opener: HTMLElement | null; key: number };

export function VisitorCookieConsent({
  market = "",
  analyticsLocale = "",
  ...props
}: VisitorCookieConsentProps) {
  const visitor = useVisitor();
  const [settings, setSettings] = useState<Settings>({ open: false, opener: null, key: 0 });

  // "Cookie settings": a click on any link to `#cookie-settings` opens the dialog. In the capture
  // phase, before next/link's own handler, which leaves an event it finds prevented alone.
  useEffect(() => {
    const open = (opener: HTMLElement | null) =>
      setSettings((now) => (now.open ? now : { open: true, opener, key: now.key + 1 }));
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || !isPlainClick(event)) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor === null || !isCookieSettingsLink(anchor, window.location.origin)) return;
      event.preventDefault();
      open(anchor);
    }
    document.addEventListener("click", onClick, { capture: true });
    if (window.location.hash === COOKIE_SETTINGS_HASH) open(null);
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // A choice goes to the cart's metadata (D124); the server reads the cookie just written. With a
  // PostHog key, a "yes" waits for the gate, which sends it with PostHog's distinct id.
  useEffect(
    () =>
      onConsentChange((choice) => {
        if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !choice.analytics)
          void syncCartConsent().catch(() => undefined);
      }),
    [],
  );

  // PostHog, only in a build with its key (D124, D129): the gate's chunk after analytics consent,
  // given on this page or before, or to clear PostHog's cookies left after a withdrawal elsewhere.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const context = {
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_EU,
      market,
      locale: analyticsLocale,
    };
    let stop: (() => void) | undefined;
    let gone = false;
    const watch = (chosen: boolean) => {
      if (stop !== undefined) return;
      stop = () => undefined;
      void import("../analytics/gate").then((gate) => {
        if (!gone) stop = gate.watchAnalytics(context, syncCartConsent, chosen);
      });
    };
    if (readConsentCookie()?.analytics === true || POSTHOG_COOKIE.test(document.cookie))
      watch(false);
    const off = onConsentChange((choice) => {
      if (choice.analytics) watch(true);
    });
    return () => {
      gone = true;
      off();
      stop?.();
    };
  }, [market, analyticsLocale]);

  const known = visitor === "unknown" ? undefined : visitor.consent;
  return (
    <CookieConsent
      {...props}
      choice={known}
      onChoose={chooseConsent}
      settingsOpen={settings.open}
      settingsKey={settings.key}
      onSettingsOpenChange={(open) => {
        if (!open) setSettings((now) => ({ ...now, open: false }));
      }}
      settingsFinalFocus={settings.open ? settings.opener : null}
      {...(settings.open && known !== null
        ? { defaultSwitches: known ?? readConsentCookie() ?? undefined }
        : {})}
    />
  );
}
