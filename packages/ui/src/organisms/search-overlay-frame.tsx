// Ours (T113, D150; split out of SearchOverlay, T37). SearchOverlay's button and dialog, with the
// dialog's content (`SearchOverlayPanel`) passed in as `panel`. `SearchOverlay` passes the panel it
// imports; the shop's header passes it once it has fetched its module, so the panel's code (Base
// UI's Autocomplete and the results) is in no first load (`first-load.ts`' `keptOut`).
// - **The dialog opens with its content, never empty:** a press of the button before the panel is
//   there asks for it (`onWantPanel`) and the dialog opens once it arrives, so the field gets the
//   focus as it always did and nothing is typed into a box that is not there yet. The visitor's
//   pointer over the button, a press starting on it, or the focus reaching it ask too, so in
//   practice the module is in before the click ends. A press while a fetch failed asks again, and a
//   press whose fetch fails is forgotten, so a later fetch (the pointer passing over the button)
//   never opens the dialog by itself (PR 157 review, item 5).
// - The field's text lives here, not in the panel, so it survives the dialog closing (the panel is
//   unmounted with the popup) as SearchOverlay's comment says.
// - Without scripts nothing changes: the server draws the button only (a closed dialog has no
//   popup), as before the split.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { SearchOverlay as SearchOverlayContent } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@shopblok/ui/primitives/dialog";
import { SearchIcon } from "lucide-react";
import { useState, type ComponentType } from "react";
import type { SearchOverlayPanelProps } from "./search-overlay-panel";

type SearchOverlayFrameProps = SearchOverlayContent & {
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
  /** The dialog's content; until it is given, a press of the button waits for it. */
  panel: ComponentType<SearchOverlayPanelProps> | undefined;
  /**
   * Asked when the visitor reaches for the search and `panel` is not there yet. When it returns the
   * fetch, a press waiting for it is dropped if it fails.
   */
  onWantPanel?: () => Promise<unknown> | void;
};

function SearchOverlayFrame({
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
  panel: Panel,
  onWantPanel,
}: SearchOverlayFrameProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  const [query, setQuery] = useState(search.query);
  const want =
    Panel === undefined && onWantPanel !== undefined
      ? () => {
          // A rejection closes what a press asked for, whichever reach started the fetch.
          onWantPanel()?.catch(() => setOpen(false));
        }
      : undefined;

  return (
    <Dialog
      // Asked for before the panel came: the dialog opens when it does.
      open={open && Panel !== undefined}
      onOpenChange={(next) => {
        if (next) want?.();
        setOpen(next);
      }}
      modal={modal ?? true}
    >
      <DialogTrigger
        data-slot="search-overlay-trigger"
        render={<Button variant="ghost" size="icon" className={triggerClassName} />}
        onPointerEnter={want}
        onPointerDown={want}
        onFocus={want}
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
        {Panel === undefined ? null : (
          <Panel
            action={search.action}
            query={query}
            onQuery={(next) => {
              setQuery(next);
              onQueryChange?.(next);
            }}
            onNavigate={() => setOpen(false)}
            recent={recent}
            result={result}
            loading={loading}
            copy={copy}
            priceCopy={priceCopy}
            locale={locale}
            prefetch={prefetch}
            onClearRecent={onClearRecent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { SearchOverlayFrame };
export type { SearchOverlayFrameProps };
