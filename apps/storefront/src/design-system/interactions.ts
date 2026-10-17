import type { EntryId } from "@shopblok/registry";

// D45 (T33): the interaction checks. An entry listed here has an overlay that its live render opens;
// the `design-system` job opens it on the entry's preview page (the live render alone) at 375 and
// 1440 px in `en`, runs axe on the open state, checks where focus goes, and closes it
// (`e2e/design-system.spec.ts`, "interaction · …"). The list is data with no React, next to the
// stories rather than in them, because Playwright's loader cannot import the stories (D40's reason);
// `stories.test.tsx` checks that each entry's live render draws the trigger (or, for a trigger the
// browser draws, that the server's render does not).

export type DsInteraction = {
  /**
   * The control that opens it: one attribute selector (`[data-slot="…"]`) inside the live render.
   * The visible one is pressed, so a component may draw one trigger per breakpoint (a popover from
   * `md` up, a drawer below).
   */
  trigger: string;
  /** What opens: a selector of the popup, visible once the trigger is pressed. */
  opens: string;
  /**
   * `inside`: focus moves into the popup and Escape closes it, with focus back on the trigger (a
   * dialog, a drawer, a popover). `stays`: focus stays on the trigger and the popup is announced by
   * a live region (a toast). `menu` (T35): a navigation menu's panel, which is not a dialog: focus
   * stays on the trigger, Tab goes into the panel, Escape closes it with focus back on the trigger,
   * and Tab past the panel's last link closes it.
   */
  focus: "inside" | "stays" | "menu";
  /** With `inside`: the popup traps focus, so Tab and Shift+Tab never leave it. */
  trap?: boolean;
  /**
   * T36: the trigger is the browser's (D44), drawn only once the page has hydrated and the visitor
   * store knows the visitor (cookie consent's banner), so the server's HTML has none of it.
   */
  afterHydration?: true;
};

export const interactions = {
  "molecules/market-switcher": {
    trigger: '[data-slot="market-switcher-trigger"]',
    opens: '[data-slot="market-switcher-popup"]',
    focus: "inside",
    trap: true,
  },
  "molecules/toast": {
    trigger: '[data-slot="toast-trigger"]',
    opens: '[data-slot="toast"]',
    focus: "stays",
  },
  // T34: the confirmation before a saved card is removed, an alert dialog.
  "molecules/saved-payment-method-card": {
    trigger: '[data-slot="saved-payment-method-remove"]',
    opens: '[data-slot="saved-payment-method-confirm"]',
    focus: "inside",
    trap: true,
  },
  // T35: a mega menu's panel, the mobile drawer, and the market switcher inside a header.
  "organisms/mega-menu": {
    trigger: '[data-slot="navigation-menu-trigger"]',
    opens: '[data-slot="mega-menu-panel"]',
    focus: "menu",
  },
  "organisms/mobile-nav-drawer": {
    trigger: '[data-slot="mobile-nav-trigger"]',
    opens: '[data-slot="mobile-nav-drawer"]',
    focus: "inside",
    trap: true,
  },
  "headers-footers/header-two-tier": {
    trigger: '[data-slot="market-switcher-trigger"]',
    opens: '[data-slot="market-switcher-popup"]',
    focus: "inside",
    trap: true,
  },
  // T36: cookie consent's dialog, opened from the banner's "choose" once the page has hydrated (the
  // banner is the browser's, D44), and the market switcher in the two-tier footer's bar.
  "organisms/cookie-consent": {
    trigger: '[data-slot="cookie-consent-choose"]',
    opens: '[data-slot="cookie-consent-dialog"]',
    focus: "inside",
    trap: true,
    afterHydration: true,
  },
  "headers-footers/footer-two-tier": {
    trigger: '[data-slot="market-switcher-trigger"]',
    opens: '[data-slot="market-switcher-popup"]',
    focus: "inside",
    trap: true,
  },
} as const satisfies Partial<Record<EntryId, DsInteraction>>;
