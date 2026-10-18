// Ours (T36, SETUP.md "Footers and site organisms (T36)"; WCAG 2.4.11 Focus Not Obscured). CookieConsent's
// banner is fixed to the bottom of the window and the page behind it stays usable, so a control the
// visitor tabs to near the bottom could end up under it. It is shared by every bar of this kind:
// CompareTray (T37) reserves its height with the same function, and a page that shows both gets the
// taller of the two. That keeps the page clear of both, not the two bars clear of each other: they
// share the edge and the layer, so M5 must stack the tray above the banner (or hold it back until
// consent is answered) before the island shows both (SETUP.md "Listing organisms (T37)"). The banner's height is therefore reserved
// at the end of the page's scrollport, on the root element, in two ways that work together:
// - `scroll-padding-block-end` makes the browser's own scrolling (a Tab to a link, `focus()`, a
//   jump to an anchor) leave the scrollport's last `height` px alone, so a control it scrolls into
//   view comes to rest above the banner and not behind it;
// - `padding-block-end` adds that height after the page's last line. Scroll padding alone cannot
//   do that: it moves where a scroll comes to rest, but nothing can scroll past the end of the
//   document, so the footer's last links would stay under the banner when the page is at its end.
// Both are styles written on `<html>` from an effect, not React state, and both are given back
// when the banner goes (the inline values the root had before are restored, not cleared). The
// height is measured, not guessed: the banner's words wrap at every width and in every language, so
// it is read again whenever it changes size (`ResizeObserver`). Several banners at once is a
// design-system page (a story per state) and never a shop's page; the root then takes the tallest.
const SCROLL_PADDING = "scroll-padding-block-end";
const PADDING = "padding-block-end";

const banners = new Set<HTMLElement>();
let before: { scrollPadding: string; padding: string } | undefined;

/** Writes the tallest banner's height on the root, or gives the root back what it had. */
function apply(): void {
  const root = document.documentElement;
  // A banner whose page was torn down without React's cleanup (a container removed, not unmounted)
  // is no longer there to be kept clear of.
  for (const banner of banners) if (!banner.isConnected) banners.delete(banner);
  if (banners.size === 0) {
    if (before !== undefined) {
      for (const [property, value] of [
        [SCROLL_PADDING, before.scrollPadding],
        [PADDING, before.padding],
      ] as const) {
        if (value === "") root.style.removeProperty(property);
        else root.style.setProperty(property, value);
      }
    }
    before = undefined;
    return;
  }
  const height = Math.max(
    ...[...banners].map((banner) => Math.ceil(banner.getBoundingClientRect().height)),
  );
  root.style.setProperty(SCROLL_PADDING, `${height}px`);
  root.style.setProperty(PADDING, `${height}px`);
}

/**
 * Reserves the banner's height at the end of the page until the returned function is called. Call
 * it from an effect, with the banner's element, and return the result as the effect's cleanup.
 */
export function reserveSpaceFor(banner: HTMLElement): () => void {
  const root = document.documentElement;
  if (banners.size === 0) {
    before = {
      scrollPadding: root.style.getPropertyValue(SCROLL_PADDING),
      padding: root.style.getPropertyValue(PADDING),
    };
  }
  banners.add(banner);
  apply();
  // Where there is no ResizeObserver, the height is the one at the first measurement.
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(apply) : undefined;
  observer?.observe(banner);
  return () => {
    observer?.disconnect();
    banners.delete(banner);
    apply();
  };
}
