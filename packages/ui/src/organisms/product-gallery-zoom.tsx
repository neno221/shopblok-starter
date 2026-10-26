// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D45, D50). The popup of
// ProductGallery's zoom: the current picture as large as the window allows, with the product's
// name above it and, for several pictures, previous and next buttons and the position under it. A
// client component because it takes the gallery's callbacks and reads the reading direction; the
// dialog's open state, its trigger and the picture it ended on are the gallery's.
// - The picture is `object-contain` in a box that takes whatever height the popup has left after
//   the header and the footer (`min-h-0 flex-1`), so a tall picture is never cut and a wide one
//   does not leave a tall strip of empty space. The popup is as tall as the window less 2 rem; the
//   design system's states cap it to their box through the gallery's `zoomPopupClassName`.
// - The close button is drawn in the header, before the picture and the arrows, and not by the
//   Dialog primitive (which puts its button last): the first control a keyboard reader reaches is
//   the way out, and "Previous", dimmed at the first picture, is never the first stop.
// - Arrow keys change the picture, as the carousel's do (the start side's key goes back, which is
//   the right arrow in right-to-left). They work from any control in the popup. At either end the
//   button that cannot move is `aria-disabled` and still focusable (Base UI's
//   `focusableWhenDisabled`), so a reader who pressed Next to the end does not lose their place.
// - The position is a polite status, so a screen reader says "Image 3 of 5" after each press. A
//   popup drawn open at first render (`startsOpen`, the design system's states) takes no focus until
//   a reader opens it again, because several open states on one page would take it from each other
//   (D45). Its entry animation stops under reduced motion (D50).
"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { ProductMedia } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Image } from "@shopblok/ui/atoms/image";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { DialogClose, DialogContent, DialogTitle } from "@shopblok/ui/primitives/dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import type * as React from "react";

type GalleryZoomProps = {
  /** The product's name: the popup's title is `copy.zoomTitle` with it. */
  title: string;
  media: ProductMedia[];
  /** The picture shown, an index into `media`. */
  index: number;
  onIndexChange: (index: number) => void;
  /** The wording, from the catalog's `organisms.productGallery`. */
  copy: Messages["organisms"]["productGallery"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** Drawn open at first render: it takes no focus until a reader opens it again. */
  startsOpen: boolean;
  /** Classes for the popup (the design system's states cap it to their box). */
  className?: string;
};

/** The picture's width: most of the window, whatever the window. */
const ZOOM_SIZES = "(min-width: 640px) 80vw, 100vw";

/** The previous and next buttons: still focusable at the ends, where they are dimmed. */
const ARROW = "shrink-0 aria-disabled:pointer-events-none aria-disabled:opacity-50";

function GalleryZoom({
  title,
  media,
  index,
  onIndexChange,
  copy,
  locale,
  startsOpen,
  className,
}: GalleryZoomProps) {
  const direction = useDirection();
  const last = media.length - 1;
  const shown = Math.min(Math.max(index, 0), last);
  const picture = media[shown];
  const several = media.length > 1;
  const position = formatMessage(copy.position, { index: shown + 1, count: media.length }, locale);

  const go = (step: number) => onIndexChange(Math.min(Math.max(shown + step, 0), last));

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!several) return;
    const back = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    go(event.key === forward ? 1 : -1);
  }

  return (
    <DialogContent
      data-slot="product-gallery-zoom"
      showCloseButton={false}
      initialFocus={startsOpen ? takesFocusWhenOpenedByAReader : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "flex h-[calc(100dvh-2rem)] flex-col gap-3 p-3 motion-reduce:duration-0 sm:max-w-5xl",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <DialogTitle className="flex min-h-11 min-w-0 items-center text-sm wrap-anywhere">
          {formatMessage(copy.zoomTitle, { title }, locale)}
        </DialogTitle>
        <DialogClose
          data-slot="product-gallery-zoom-close"
          render={<Button variant="ghost" size="icon" className="shrink-0" />}
        >
          <Icon icon={XIcon} />
          <span className="sr-only">{copy.close}</span>
        </DialogClose>
      </div>
      <div data-slot="product-gallery-zoom-stage" className="relative min-h-0 flex-1">
        {picture === undefined ? null : (
          <Image
            src={picture.src}
            alt={picture.alt}
            sizes={ZOOM_SIZES}
            fit="contain"
            radius="none"
            className="absolute inset-0 aspect-auto h-full bg-transparent"
          />
        )}
      </div>
      {several ? (
        <div
          data-slot="product-gallery-zoom-controls"
          className="flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            size="icon"
            data-slot="product-gallery-zoom-previous"
            focusableWhenDisabled
            disabled={shown === 0}
            onClick={() => go(-1)}
            className={ARROW}
          >
            <Icon icon={ChevronLeftIcon} className="rtl:rotate-180" />
            <span className="sr-only">{copy.previous}</span>
          </Button>
          <p
            data-slot="product-gallery-zoom-position"
            role="status"
            className="min-w-0 text-center text-sm text-muted-foreground tabular-nums"
          >
            {position}
          </p>
          <Button
            variant="outline"
            size="icon"
            data-slot="product-gallery-zoom-next"
            focusableWhenDisabled
            disabled={shown === last}
            onClick={() => go(1)}
            className={ARROW}
          >
            <Icon icon={ChevronRightIcon} className="rtl:rotate-180" />
            <span className="sr-only">{copy.next}</span>
          </Button>
        </div>
      ) : null}
    </DialogContent>
  );
}

export { GalleryZoom };
export type { GalleryZoomProps };
