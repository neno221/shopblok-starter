// M6 D123 (T97): what the consent island does with a choice, and the "Cookie settings" control.
// - `chooseConsent` keeps a choice in the cookie (`consent-cookie.ts`), puts it in the visitor store
//   (the banner goes on every page that shows one) and tells whoever listens (`onConsentChange`:
//   the analytics gate, which starts or stops PostHog, and the cart's action).
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
