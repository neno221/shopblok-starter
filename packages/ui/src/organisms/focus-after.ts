// Ours (T35, SETUP.md "Navigation and headers (T35)"). Where focus goes when the control that has
// it is about to leave the page: AnnouncementBar's close button and MarketSuggestionBanner's "stay"
// button remove their whole bar, and an element that is removed while it has focus drops focus on
// `<body>`, so a keyboard reader starts again from the top and a screen reader loses its place.
// `focusAfter` gives focus to the first control that follows the removed element in the page's
// order, which is where the next Tab would have gone anyway, so the reader carries on from the same
// spot. It is not a page's heading or its `<main>`: a component that does not know the page cannot
// name one, and the control that comes next always exists in the document order the reader was
// already following. It returns whether it found one; without one (the bar was the last control on
// the page) focus is left to the browser, which keeps its sequential starting point where the
// removed element was.

/** What can take focus with a key, before the checks below drop the ones that cannot. */
const CANDIDATES = "a[href], button, input, select, textarea, summary, [tabindex]";

/** Whether Tab would stop on this element: not disabled, not inert or hidden, and drawn. */
function isTabbable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if ((element as HTMLButtonElement).disabled === true) return false;
  if ((element as HTMLInputElement).type === "hidden") return false;
  if (element.closest("[inert], [hidden]") !== null) return false;
  // `checkVisibility` is in every current browser; where it is missing, a box means it is drawn.
  return (
    element.checkVisibility?.({ checkVisibilityCSS: true, visibilityProperty: true }) ??
    element.getClientRects().length > 0
  );
}

/**
 * Focuses the first tabbable element that comes after `from` in the document and is not inside it.
 * Call it before `from` leaves the page, while it is still there to be compared with.
 */
function focusAfter(from: Element): boolean {
  for (const candidate of document.querySelectorAll<HTMLElement>(CANDIDATES)) {
    if (from.contains(candidate)) continue;
    if ((from.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING) === 0)
      continue;
    if (!isTabbable(candidate)) continue;
    candidate.focus();
    return true;
  }
  return false;
}

export { focusAfter };
