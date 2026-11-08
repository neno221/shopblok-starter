import type { Page } from "@playwright/test";

// T80 (D103): how the transparent header looks on the page a browser has open, for `shell.spec.ts`
// and `variants.spec.ts` (T91). Over a page that opens with the `overlay` hero (or a full-bleed band)
// the header's row is see-through on its scrim and the page starts under it; everywhere else it is
// solid and the page starts below it.

/** What the header looks like on the page now: its height, its row's fill and the scrim. */
export const headerLook = (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('header[data-variant="transparent"]');
    const surface = header?.querySelector<HTMLElement>('[data-slot="header-surface"]');
    const scrim = header?.querySelector<HTMLElement>('[data-slot="header-scrim"]');
    const main = document.querySelector("main");
    if (!header || !surface || !scrim || !main) return null;
    const fill = getComputedStyle(surface).backgroundColor;
    return {
      solid: header.dataset["solid"],
      height: header.getBoundingClientRect().height,
      filled: fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent",
      scrim: getComputedStyle(scrim).display !== "none",
      // The page's top edge against the row's bottom: under the row, or below it.
      underRow: main.getBoundingClientRect().top < surface.getBoundingClientRect().bottom - 1,
    };
  });

/** `headerLook` over the page's opening picture. */
export const TRANSPARENT = { height: 0, filled: false, scrim: true, underRow: true };
/** `headerLook` where nothing lies under the header. */
export const SOLID = { filled: true, scrim: false, underRow: false };
