// Ours (T113, D150; split out of SearchOverlay, T37). What SearchOverlay's dialog holds: the GET
// form with the field, the status region, the list and "See all N results". It is a module of its
// own so that the shop can leave it out of every first load: the shop's header draws
// `SearchOverlayFrame` (the button and the dialog) and fetches this module when the visitor shows
// they want the search (`search-overlay-island.tsx`), while `SearchOverlay` (the design system, the
// registry, the tests) draws the frame with this panel imported, so it behaves as before. Base UI's
// Autocomplete is about 10 KB of the 12 KB gzipped this keeps out of the shell (SETUP.md "First load,
// axe and Lighthouse (T113)"). Every rule of the dialog's content is SearchOverlay's (its comment):
// the inline list, one Escape, the one status region, the field's text kept by the frame.
"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { SearchOverlay as SearchOverlayContent } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { DialogClose } from "@shopblok/ui/primitives/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@shopblok/ui/primitives/input-group";
import { SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { answers, modeOf, SearchOverlayResults } from "./search-overlay-results";

/**
 * `first-load.ts`'s marker for this module (D102's `keptOut`): a literal no other source has. The
 * form's `data-panel` holds it, so the bundler keeps it.
 */
const SEARCH_OVERLAY_PANEL_MARKER = "shopblok:search-overlay-panel";

type SearchOverlayPanelProps = Omit<SearchOverlayContent, "search"> & {
  /** The search page the form GETs, `{m}/search`. */
  action: string;
  /** The field's text, which the frame keeps while the dialog is closed. */
  query: string;
  /** A new text for the field: the frame keeps it and asks the caller's `onQueryChange`. */
  onQuery: (query: string) => void;
  /** Closes the dialog (a plain click on a product or a category). */
  onNavigate: () => void;
  copy: Messages["organisms"]["searchOverlay"];
  priceCopy: Messages["molecules"]["priceBlock"];
  locale: string;
  prefetch?: boolean | null;
  onClearRecent?: () => void;
};

function SearchOverlayPanel({
  action,
  query,
  onQuery,
  onNavigate,
  recent,
  result,
  loading,
  copy,
  priceCopy,
  locale,
  prefetch,
  onClearRecent,
}: SearchOverlayPanelProps) {
  const field = useRef<HTMLInputElement>(null);
  const mode = modeOf(query, result);
  // A question on its way matters to a reader only when there is a question: an empty field asks none.
  const waiting = loading && mode !== "recent";
  // The count is said, and sent with "See all", only for an answer to the text in the field now.
  const answered =
    (mode === "results" || mode === "empty") && !waiting && answers(query, result)
      ? result
      : undefined;
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
    onQuery(text);
    field.current?.focus();
  }

  return (
    <form
      action={action}
      method="get"
      data-panel={SEARCH_OVERLAY_PANEL_MARKER}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Autocomplete.Root
        inline
        open
        mode="none"
        filter={null}
        name="q"
        value={query}
        onValueChange={(next) => {
          if (next === query) return;
          onQuery(next);
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
          onNavigate={onNavigate}
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
  );
}

export { SEARCH_OVERLAY_PANEL_MARKER, SearchOverlayPanel };
export type { SearchOverlayPanelProps };
