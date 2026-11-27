// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D44, D45, D49, D50). The search that
// opens over the page: a 44 px button with the magnifier, and the modal dialog it opens, which holds
// one GET form to the search page. In the form a field named `q`, a list under it (recent queries
// for an empty field; products, categories and suggestions for a query; a sentence for a query that
// finds nothing) and, once there is an answer with matches, "See all N results" as the form's
// submit. A client component as a whole, as CookieConsent is: it keeps the dialog's open state and
// the field's text, and it takes `onQueryChange`. The results are props (M3 connects the search and
// answers `onQueryChange` with a new `result` and `loading`; it also decides how long to wait
// between the last key and the question, so this component asks at every change). The recent
// queries are per visitor (D44): the page passes them once the browser has them, and this component
// only draws them; "Clear recent searches" calls `onClearRecent` and is there only when it is given.
// - The field and the list are Base UI's Autocomplete with the list INLINE (`inline`, `open`): the
//   list has no popup of its own, so there is nothing for Escape to close before the dialog, and ONE
//   Escape closes the dialog and puts the focus back on the button (the design system's interaction
//   check presses it once, and a test here does too). With a popup of its own the first Escape would
//   close the list and the second the dialog. The arrow keys move through the options with the focus
//   staying in the field; Enter on a highlighted product or category follows its link; Enter on a
//   recent query or a suggestion puts it in the field; Enter with nothing highlighted submits the
//   form, so it goes to the search page, with or without JavaScript running when the form is sent.
//   `mode="none"` and `filter={null}`: the caller filters, Base UI neither filters nor rewrites the
//   field as the highlight moves.
// - The field's text starts as `search.query` and is the visitor's from then on: a later
//   `search.query` is not copied in, because a parent that answers a little late would otherwise put
//   back the text from before the last key. The dialog is closed by Escape, the close button or a
//   plain click on a product or a category (the header lives across page changes, so the dialog
//   would stay open over the new page); the field keeps its text when it opens again.
// - One status region speaks (WCAG 4.1.3): "Searching…" while `loading`, the count ("12 results", or
//   "No results") when an answer is on screen, and nothing for an empty field. Typing does not
//   change it until the caller says `loading`, so a reader hears one announcement per question and
//   not one per key. It is visually hidden: the spinner row and the list are what the eye sees.
// - There is no `search` landmark inside the dialog: the dialog is already named by its title, and a
//   landmark with the same name inside it would be read twice. The title is visually hidden for the
//   same reason a search box has no heading: the field says what it is for.
// - The popup is anchored near the top of the window and not centred, so the field stays where it
//   is as the list grows and shrinks. It is a column: the field on top, the list scrolling in the
//   middle, the submit at the foot, so a long list never pushes the field out of sight, and no
//   content is wider than the popup (the words wrap). Its entry animation stops under reduced
//   motion (D50). A popup drawn open at first render (`defaultOpen`, the design system's states)
//   takes no focus until a reader opens it again, because several open states on one page would
//   take it from each other.
// - T113 (D150): the dialog's content is `SearchOverlayPanel` (`search-overlay-panel.tsx`) and the
//   button with the dialog is `SearchOverlayFrame` (`search-overlay-frame.tsx`). This component is
//   the frame with the panel imported, for the design system, the registry and the tests; the
//   shop's header draws the frame and fetches the panel when the visitor reaches for the search
//   (`search-overlay-island.tsx`), so Base UI's Autocomplete is in no first load.
"use client";

import { SearchOverlayFrame, type SearchOverlayFrameProps } from "./search-overlay-frame";
import { SearchOverlayPanel } from "./search-overlay-panel";

type SearchOverlayProps = Omit<SearchOverlayFrameProps, "panel" | "onWantPanel">;

function SearchOverlay(props: SearchOverlayProps) {
  return <SearchOverlayFrame {...props} panel={SearchOverlayPanel} />;
}

export { SearchOverlay };
export type { SearchOverlayProps };
