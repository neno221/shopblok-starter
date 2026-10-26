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
"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { SearchOverlay as SearchOverlayContent } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@shopblok/ui/primitives/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@shopblok/ui/primitives/input-group";
import { SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { answers, modeOf, SearchOverlayResults } from "./search-overlay-results";

type SearchOverlayProps = SearchOverlayContent & {
  /** The wording, from the catalog's `organisms.searchOverlay`. */
  copy: Messages["organisms"]["searchOverlay"];
  /** The words around a price ("From {price}", "Sale price"), from `molecules.priceBlock`. */
  priceCopy: Messages["molecules"]["priceBlock"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false` (the pages 404 until M3). */
  prefetch?: boolean | null;
  /** Asked at every change of the field's text (and when a recent query or a suggestion fills it). */
  onQueryChange?: (query: string) => void;
  /** Forgets the recent queries; without it the list has no "Clear recent searches" button. */
  onClearRecent?: () => void;
  /** Drawn open at first render (the design system's states); takes no focus until a reader opens it again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states, D45). */
  modal?: boolean;
  /** Classes for the button (a header decides where it is shown). */
  triggerClassName?: string;
  /** Classes for the popup (the design system's states cap it to their box and stop its animation). */
  popupClassName?: string;
};

function SearchOverlay({
  search,
  recent,
  result,
  loading,
  copy,
  priceCopy,
  locale,
  prefetch,
  onQueryChange,
  onClearRecent,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: SearchOverlayProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  const [query, setQuery] = useState(search.query);
  const field = useRef<HTMLInputElement>(null);
  const mode = modeOf(query, result);
  // A question on its way matters to a reader only when there is a question: an empty field asks none.
  const waiting = loading && mode !== "recent";
  // The count is said, and sent with "See all", only for an answer to the text in the field now.
  const answered =
    (mode === "results" || mode === "empty") && !waiting && answers(query, result) ? result : undefined;
  const status = waiting
    ? copy.loading
    : answered
      ? formatMessage(copy.status, { count: answered.total }, locale)
      : "";
  // Matches for an earlier text keep the foot (Enter still submits through it), named without a count.
  const seeAll =
    answered !== undefined
      ? answered.total > 0
        ? formatMessage(copy.seeAll, { count: answered.total }, locale)
        : undefined
      : mode === "results"
        ? copy.open
        : undefined;

  /** Puts the text of a recent query or a suggestion in the field, and asks for its results. */
  function pickQuery(text: string) {
    setQuery(text);
    onQueryChange?.(text);
    field.current?.focus();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={modal ?? true}>
      <DialogTrigger
        data-slot="search-overlay-trigger"
        render={<Button variant="ghost" size="icon" className={triggerClassName} />}
      >
        <Icon icon={SearchIcon} size="md" />
        <span className="sr-only">{copy.open}</span>
      </DialogTrigger>
      <DialogContent
        data-slot="search-overlay"
        showCloseButton={false}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn(
          "top-4 flex max-h-[calc(100dvh-2rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 motion-reduce:duration-0 sm:top-12 sm:max-h-[calc(100dvh-4rem)] sm:max-w-xl",
          popupClassName,
        )}
      >
        <DialogTitle className="sr-only">{copy.title}</DialogTitle>
        <form action={search.action} method="get" className="flex min-h-0 flex-1 flex-col">
          <Autocomplete.Root
            inline
            open
            mode="none"
            filter={null}
            name="q"
            value={query}
            onValueChange={(next) => {
              if (next === query) return;
              setQuery(next);
              onQueryChange?.(next);
            }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b p-3">
              <InputGroup className="flex-1">
                <InputGroupAddon align="inline-start">
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
                <Autocomplete.Input
                  ref={field}
                  render={
                    <InputGroupInput
                      type="search"
                      aria-label={copy.label}
                      placeholder={copy.placeholder}
                      enterKeyHint="search"
                      autoCapitalize="off"
                      spellCheck={false}
                      // A query longer than the box scrolls inside it, which the field says (the DS clip check, D34).
                      data-truncate=""
                      // The browser's own clear mark and magnifier would sit beside ours.
                      className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                    />
                  }
                />
              </InputGroup>
              <DialogClose
                data-slot="search-overlay-close"
                render={<Button variant="ghost" size="icon" className="shrink-0" />}
              >
                <Icon icon={XIcon} />
                <span className="sr-only">{copy.close}</span>
              </DialogClose>
            </div>
            <Autocomplete.Status data-slot="search-overlay-status" className="sr-only">
              {status}
            </Autocomplete.Status>
            <SearchOverlayResults
              query={query}
              recent={recent}
              result={result}
              loading={waiting}
              copy={copy}
              priceCopy={priceCopy}
              locale={locale}
              prefetch={prefetch}
              onNavigate={() => setOpen(false)}
              onPickQuery={pickQuery}
              onClearRecent={onClearRecent}
              focusField={() => field.current?.focus()}
            />
            {seeAll === undefined ? null : (
              <div data-slot="search-overlay-foot" className="shrink-0 border-t p-3">
                <Button type="submit" data-slot="search-overlay-submit" className="w-full">
                  {seeAll}
                </Button>
              </div>
            )}
          </Autocomplete.Root>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SearchOverlay };
export type { SearchOverlayProps };
