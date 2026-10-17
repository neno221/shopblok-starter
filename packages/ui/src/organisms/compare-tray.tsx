// Ours (T37, SETUP.md "Listing organisms (T37)"; D44, D45; SPEC §8.4; WCAG 2.4.11, 4.1.3). The
// products a visitor has chosen to compare, in a tray fixed to the bottom of the window: each with
// its picture, its title as a link and a button that removes it, a dashed empty slot for each place
// left (up to `max`), how many are chosen, "Remove all", and the link to the comparison.
// - A client component, whole, as CookieConsent is: it takes functions (`onRemove`, `onClear`),
//   keeps focus where it must go, and formats at run time with `@shopblok/i18n/format` (the
//   package's index carries the four catalogs, which the browser has no use for).
// - Per visitor (D44). The chosen products are the visitor's, so a prerendered page cannot hold
//   them: with no `items` nothing is drawn, and the page passes the visitor's products once the
//   browser has them, from an island that reads the visitor store (M5's comparison section and its
//   island will feed it; in M2 only the DS does). Without JavaScript the tray is never drawn.
// - A region, not a dialog: a `<section>` named by the catalog's `region`, which takes no focus
//   when it appears and leaves the page behind it usable. It is `fixed inset-x-0 bottom-0` on the
//   `--z-overlay` layer, as CookieConsent's banner is, with padding that keeps its controls clear
//   of a phone's home indicator (`env(safe-area-inset-bottom)`). It scrolls inside itself at 60 %
//   of the window's height at most, rather than cover a short window.
// - WCAG 2.4.11 Focus Not Obscured: while the tray is shown its height is reserved at the end of
//   the page (`reserveSpaceFor`, CookieConsent's, which several fixed bars share), so the page's
//   last links scroll above it and a control the visitor tabs to is not left behind it.
// - The count and the "choose N more" line are one polite live region (`role="status"`), so a
//   removal or an addition is said (WCAG 4.1.3). The compare link is outside it, and is drawn only
//   when two products are chosen: until then the line says how many more to choose, as text, in
//   its place, rather than a link that goes nowhere or a disabled one.
// - Focus after a removal. The removed item's button leaves the page, and an element removed while
//   it has focus drops focus on `<body>`. So focus goes to the next item's remove button, or the
//   previous one's when the last item went, and when it was the only one (the tray goes) to where the
//   next Tab would have gone (`focusAfter`, T35), before the tray is removed. "Remove all" does the
//   same. The move waits for the products to change, because the page owns them and may remove one
//   a moment later (a server action); a change that does not remove the product gives the move up.
// - Layout. Each item is one link (picture and title) and, beside it, the remove button: never a
//   control inside the link. Under `sm` an item is a column 5 rem wide, the picture over its title,
//   with the remove button over the picture's corner (a 44 px button with a smaller disc inside it,
//   so it does not cover the picture), because a phone's window is short: the cells are as many as
//   `max`, one row. From `sm` an item is a row (a 56 px picture, the title beside it, the button at
//   the end), two to a row up to `lg`, and from `lg` the cells share the row with the actions, each
//   at most 16 rem. Titles wrap at any width and in any language (`wrap-anywhere`) and are never
//   cut; the pictures and the cells shrink rather than widen the page. The empty slots are
//   decoration: `aria-hidden`, so a screen reader hears only the products that are chosen.
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { CompareTray as CompareTrayContent } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { IconButton } from "@shopblok/ui/atoms/icon-button";
import { Image } from "@shopblok/ui/atoms/image";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import { XIcon } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useRef } from "react";
import type * as React from "react";
import { reserveSpaceFor } from "./cookie-consent-reserve";
import { focusAfter } from "./focus-after";

type CompareTrayProps = CompareTrayContent & {
  /** The wording, from the catalog's `organisms.compareTray`. */
  copy: Messages["organisms"]["compareTray"];
  /** The market's `<html lang>`. */
  locale: string;
  /**
   * next/link's `prefetch` for the item links and the compare link. Unset, Next prefetches each in
   * view; the DS page sets `false`, because its pages answer 404 until M3.
   */
  prefetch?: boolean | null;
  /** Called with the product's id when the visitor removes it; the page owns the products. */
  onRemove?: (id: string) => void;
  /** Called when the visitor removes them all. */
  onClear?: () => void;
  className?: string;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The hrefs are strings the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

/** How many products a comparison needs. */
const MIN_TO_COMPARE = 2;

/** Between ids, in a string that stands for the list of them: a character no id holds. */
const SEPARATOR = "\u001f";

// One column to a place, the cells 5 rem wide under `sm`; two columns from `sm`; from `lg` the
// cells are at most 16 rem and share the row with the actions. Written whole: Tailwind finds the
// classes by reading the file.
const COLUMNS = {
  2: "grid-cols-[repeat(2,minmax(0,5rem))] sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,16rem))]",
  3: "grid-cols-[repeat(3,minmax(0,5rem))] sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,16rem))]",
  4: "grid-cols-[repeat(4,minmax(0,5rem))] sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,16rem))]",
} as const;

/** The columns for a tray of this many places (the contract allows 2 to 4). */
const columnsFor = (max: number) => COLUMNS[Math.min(Math.max(Math.round(max), 2), 4) as 2 | 3 | 4];

/** Focuses the remove button of the item with this id, if the tray holds it. */
function focusRemoveButton(tray: HTMLElement | null, id: string): void {
  const buttons = tray?.querySelectorAll<HTMLElement>('[data-slot="compare-tray-remove"]') ?? [];
  for (const button of buttons) {
    if (button.dataset.itemId === id) {
      button.focus();
      return;
    }
  }
}

function CompareTray({
  items,
  max,
  compareHref,
  copy,
  locale,
  prefetch,
  onRemove,
  onClear,
  className,
}: CompareTrayProps) {
  const trayRef = useRef<HTMLElement>(null);
  // Where focus goes once the product the visitor removed has left `items`.
  const pending = useRef<{ removed: string; focus: string } | null>(null);
  const shown = items.length > 0;
  const idsKey = items.map((item) => item.id).join(SEPARATOR);

  // WCAG 2.4.11: the tray's height is reserved at the end of the page while it is there.
  useEffect(() => {
    const tray = trayRef.current;
    if (!shown || tray === null) return;
    return reserveSpaceFor(tray);
  }, [shown]);

  // The products changed. If the one the visitor removed has gone, focus moves on; if they changed
  // some other way, the move is given up, so it never fires on a later, unrelated change.
  useEffect(() => {
    const move = pending.current;
    pending.current = null;
    if (move === null || idsKey.split(SEPARATOR).includes(move.removed)) return;
    focusRemoveButton(trayRef.current, move.focus);
  }, [idsKey]);

  if (!shown) return null;

  function remove(index: number) {
    const item = items[index];
    if (item === undefined) return;
    const target = items[index + 1] ?? items[index - 1];
    if (target === undefined) {
      // The only product: the tray goes with it, and focus goes where the next Tab would have.
      if (trayRef.current !== null) focusAfter(trayRef.current);
    } else {
      pending.current = { removed: item.id, focus: target.id };
    }
    onRemove?.(item.id);
  }

  function clear() {
    if (trayRef.current !== null) focusAfter(trayRef.current);
    onClear?.();
  }

  const slots = Math.max(max - items.length, 0);
  const needMore = Math.max(MIN_TO_COMPARE - items.length, 0);

  return (
    <section
      ref={trayRef}
      aria-label={copy.region}
      data-slot="compare-tray"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-overlay) max-h-[60dvh] overflow-y-auto overscroll-contain border-t border-border bg-background text-foreground",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-page min-w-0 gap-3 px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <ul
          data-slot="compare-tray-items"
          className={cn("grid min-w-0 content-start gap-x-2 gap-y-3 sm:gap-3", columnsFor(max))}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              data-slot="compare-tray-item"
              data-item-id={item.id}
              className="relative flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1 sm:rounded-lg sm:border sm:border-border sm:p-2"
            >
              <Link
                href={item.href as LinkHref}
                prefetch={prefetch}
                data-slot="compare-tray-link"
                className="group/item flex min-w-0 flex-1 flex-col gap-1.5 rounded-md text-foreground no-underline sm:flex-row sm:items-center sm:gap-3"
              >
                {item.image === undefined ? (
                  <span
                    aria-hidden="true"
                    data-slot="compare-tray-no-image"
                    className="block aspect-square w-full rounded-md bg-muted sm:w-14 sm:shrink-0"
                  />
                ) : (
                  <Image
                    src={item.image.src}
                    alt=""
                    sizes="(min-width: 640px) 56px, 80px"
                    ratio="square"
                    className="w-full sm:w-14 sm:shrink-0"
                  />
                )}
                <span
                  data-slot="compare-tray-title"
                  className="min-w-0 text-xs leading-snug font-medium wrap-anywhere group-hover/item:underline sm:text-sm"
                >
                  {item.title}
                </span>
              </Link>
              <IconButton
                label={formatMessage(copy.remove, { title: item.title }, locale)}
                variant="ghost"
                data-slot="compare-tray-remove"
                data-item-id={item.id}
                onClick={() => remove(index)}
                className="z-10 rounded-full hover:bg-transparent max-sm:absolute max-sm:-end-2 max-sm:-top-2 sm:shrink-0"
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-border bg-background shadow-xs group-hover/button:bg-muted">
                  <XIcon className="size-4" />
                </span>
              </IconButton>
            </li>
          ))}
          {Array.from({ length: slots }, (_, slot) => (
            <li
              key={`slot-${slot}`}
              aria-hidden="true"
              data-slot="compare-tray-slot"
              className="aspect-square w-full rounded-md border border-dashed border-border bg-muted sm:aspect-auto sm:min-h-[4.5rem] sm:rounded-lg"
            />
          ))}
        </ul>
        <div
          data-slot="compare-tray-actions"
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 lg:max-w-sm lg:flex-col lg:items-stretch"
        >
          <div
            role="status"
            data-slot="compare-tray-status"
            className="min-w-0 flex-1 basis-40 text-sm wrap-anywhere lg:flex-none lg:basis-auto"
          >
            <p data-slot="compare-tray-count" className="font-medium">
              {formatMessage(copy.count, { count: items.length, max }, locale)}
            </p>
            {needMore === 0 ? null : (
              <p data-slot="compare-tray-need-more" className="text-muted-foreground">
                {formatMessage(copy.needMore, { count: needMore }, locale)}
              </p>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              data-slot="compare-tray-clear"
              onClick={clear}
              className="max-w-full wrap-anywhere"
            >
              {copy.clear}
            </Button>
            {needMore === 0 ? (
              <NextLink
                href={compareHref as LinkHref}
                prefetch={prefetch}
                data-slot="compare-tray-compare"
                className={cn(buttonVariants(), "max-w-full wrap-anywhere")}
              >
                {copy.compare}
              </NextLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export { CompareTray };
export type { CompareTrayProps };
