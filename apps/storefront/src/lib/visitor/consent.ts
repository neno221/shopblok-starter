// M6 D123 (T97): what the consent island does with a choice, and the "Cookie settings" control.
// - `chooseConsent` keeps a choice in the cookie (`consent-cookie.ts`), puts it in the visitor store
//   (the banner goes on every page that shows one) and tells whoever listens (`onConsentChange`:
//   the analytics gate, which starts or stops PostHog, and the cart's action).
// - The settings dialog's state: open or not, and the control that opened it, where focus goes back
//   when it closes. A small external store like the visitor's: its server snapshot is "closed".
// - The control itself is any link to `#cookie-settings` (`isCookieSettingsLink`): the footers'
//   "Cookie settings", the policy page's, or one an editor writes. Without scripts it is a link to
//   the policy page; with them the island takes the click and opens the dialog (`cookie-consent.tsx`).
import type { ConsentChoice } from "@shopblok/registry/contracts";
import { writeConsentCookie } from "./consent-cookie";
import { setConsent } from "./store";

/** The fragment of every "Cookie settings" link. */
export const COOKIE_SETTINGS_HASH = "#cookie-settings";

/** Whether `anchor` is a "Cookie settings" control: a link on this site to `#cookie-settings`. */
export function isCookieSettingsLink(anchor: HTMLAnchorElement, origin: string): boolean {
  return anchor.hash === COOKIE_SETTINGS_HASH && anchor.origin === origin;
}

const changeListeners = new Set<(choice: ConsentChoice) => void>();

/** Calls `listener` with each choice the visitor makes; returns the function that stops it. */
export function onConsentChange(listener: (choice: ConsentChoice) => void): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/** The visitor chose (the banner, the dialog, or the settings): kept, shown and told. */
export function chooseConsent(choice: ConsentChoice): void {
  writeConsentCookie(choice);
  setConsent(choice);
  for (const listener of [...changeListeners]) listener({ ...choice });
}

/** The settings dialog: closed, or open with the control that opened it (focus goes back there). */
export type ConsentSettings = { open: false } | { open: true; opener: HTMLElement | null };

const CLOSED: ConsentSettings = { open: false };
let settings: ConsentSettings = CLOSED;
const settingsListeners = new Set<() => void>();

export function subscribeSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export const getSettings = (): ConsentSettings => settings;
export const getServerSettings = (): ConsentSettings => CLOSED;

function setSettings(next: ConsentSettings): void {
  if (next.open === settings.open && (!next.open || next.opener === (settings.open ? settings.opener : null)))
    return;
  settings = next;
  for (const listener of [...settingsListeners]) listener();
}

/** Opens the dialog with the switches as chosen; `opener` gets focus back when it closes. */
export function openConsentSettings(opener: HTMLElement | null = null): void {
  setSettings({ open: true, opener });
}

export function closeConsentSettings(): void {
  setSettings(CLOSED);
}
