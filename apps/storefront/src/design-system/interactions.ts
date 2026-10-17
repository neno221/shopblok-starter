import type { EntryId } from "@shopblok/registry";

// D45 (T33): the interaction checks. An entry listed here has an overlay that its live render opens;
// the `design-system` job opens it on the entry's preview page (the live render alone) at 375 and
// 1440 px in `en`, runs axe on the open state, checks where focus goes, and closes it
// (`e2e/design-system.spec.ts`, "interaction · …"). The list is data with no React, next to the
// stories rather than in them, because Playwright's loader cannot import the stories (D40's reason);
// `stories.test.tsx` checks that each entry's live render draws the trigger.

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
   * a live region (a toast).
   */
  focus: "inside" | "stays";
  /** With `inside`: the popup traps focus, so Tab and Shift+Tab never leave it. */
  trap?: boolean;
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
} as const satisfies Partial<Record<EntryId, DsInteraction>>;
