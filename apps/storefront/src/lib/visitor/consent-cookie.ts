// M6 D123 (T97): the visitor's cookie choice, kept in a cookie the browser reads and writes,
// `_shopblok_consent`, so a prerendered page stays the same for everyone (ADR 0004): the store
// reads it after hydration, and the server reads it from the request in the cart's actions (D124).
// The value is `v<version>.<analytics>.<marketing>.<date>`, such as `v1.1.0.2026-11-12`: the two
// answers as `1` or `0`, and the day the visitor chose (UTC). A cookie of another version is no
// choice, so the banner asks again when what the shop collects changes (`CONSENT_VERSION`).
// Plain functions, with no React and nothing `server-only`: the island, the store, the analytics
// loader and the server's actions share them.
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { CONSENT_COOKIE } from "../cookie-names";

/** Raise it when what the shop collects changes: every visitor is asked again. */
export const CONSENT_VERSION = 1;

/** Twelve months, in seconds (the cookie's `Max-Age`). */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

/** What the cookie holds: the choice and the day it was made (`YYYY-MM-DD`, UTC). */
export type ConsentRecord = { choice: ConsentChoice; date: string };

const VALUE = /^v(\d+)\.([01])\.([01])\.(\d{4}-\d{2}-\d{2})$/;

/** The cookie's value for a choice made at `now`. */
export function formatConsent(choice: ConsentChoice, now: Date = new Date()): string {
  const bit = (on: boolean) => (on ? "1" : "0");
  const day = now.toISOString().slice(0, 10);
  return `v${CONSENT_VERSION}.${bit(choice.analytics)}.${bit(choice.marketing)}.${day}`;
}

/** The record in a cookie's value, or `null`: no cookie, another version, or a value we did not write. */
export function parseConsent(value: string | undefined | null): ConsentRecord | null {
  const match = VALUE.exec(value ?? "");
  if (match === null || Number(match[1]) !== CONSENT_VERSION) return null;
  return {
    choice: { analytics: match[2] === "1", marketing: match[3] === "1" },
    date: match[4] as string,
  };
}

/** The choice in a `Cookie` header or `document.cookie`, or `null` before the visitor chooses. */
export function consentFromCookieHeader(header: string): ConsentChoice | null {
  for (const part of header.split(";")) {
    const at = part.indexOf("=");
    if (at === -1 || part.slice(0, at).trim() !== CONSENT_COOKIE) continue;
    return parseConsent(part.slice(at + 1).trim())?.choice ?? null;
  }
  return null;
}

/** The browser's: the choice in `document.cookie`, or `null` (and always `null` on the server). */
export function readConsentCookie(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  return consentFromCookieHeader(document.cookie);
}

/**
 * The `document.cookie` line that keeps a choice: the whole site, twelve months, `SameSite=Lax`
 * (it goes with a link from another site, as the shop's other cookies do), `Secure` on https.
 */
export function consentCookieLine(choice: ConsentChoice, secure: boolean, now?: Date): string {
  return [
    `${CONSENT_COOKIE}=${formatConsent(choice, now)}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Keeps the visitor's choice in the browser (`Secure` when the page is on https). */
export function writeConsentCookie(choice: ConsentChoice): void {
  if (typeof document === "undefined") return;
  document.cookie = consentCookieLine(choice, window.location.protocol === "https:");
}
