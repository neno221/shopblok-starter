// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, §13, D41, D45, D50; SBP layouts/
// product-details.md). A product's pictures: one embla carousel holds the main picture at every
// width (a swipe, previous and next buttons, the position as text), thumbnails stand beside it or
// under it from `md`, and a button over the picture's corner opens the large picture in a dialog.
// A client component because embla drives the DOM, the thumbnails and the zoom share the
// carousel's position, and the dialog has state; every word is made here from the catalog with
// `@shopblok/i18n/format` (the package's index carries the four catalogs, which a browser has no
// use for).
// - One set of pictures. The carousel is the main picture on a phone and on a desktop alike, and
//   the thumbnails are buttons that move it: a second layout for desktops would load the same
//   pictures twice and a screen reader would read them twice. The thumbnails are `hidden md:block`
//   (`display: none` below `md`, so they leave the tab order and the accessibility tree there). A
//   thumbnail's picture has an empty `alt` and the button is named by the picture's own (or, with
//   none, by its place, "Image 2 of 5"), so a screen reader hears the name once.
// - The carousel is a region named by the catalog's `label` with the product's name ("Images of
//   Heritage Hoodie"), called a carousel by `aria-roledescription` as the primitive draws it, and
//   each picture is a group called a slide and named by its place ("Image 2 of 5"). This carousel
//   shows one picture at a time, so the ones out of view are `aria-hidden` (the WAI-ARIA pattern),
//   and the position line is a polite status that says the new place after each move. Nothing is
//   announced on load.
// - The picture shown first is the first one that shows a chosen value (`selectedValueIds`: the
//   colour picked), or the first. It is the track's starting position twice over: embla's
//   `startIndex`, and an inline `translate3d` on the track in the markup the server sends, so a
//   page opened on `?colour=forest` shows the forest picture before any script has run, with no
//   jump when embla starts (it writes the same position in pixels). The inline style is fixed at
//   first render, so React never writes it again and embla alone moves the track. When the prop
//   changes later, the carousel goes to the new picture, and under reduced motion it jumps
//   (embla's `duration: 0` under a `prefers-reduced-motion` breakpoint, D50), as the product
//   carousel's buttons do. Every picture stays in the carousel and the thumbnails.
// - A single picture has no carousel semantics, no buttons, no position, no thumbnails and nothing
//   that drags: a group named by the label, the picture and the zoom button.
// - Every picture keeps its own aspect ratio from `width` and `height`, so nothing shifts while it
//   loads. A slide's frame is as wide as the carousel and as tall as the picture's ratio says; the
//   track is as tall as its tallest slide, and a shorter picture is centred in it on the muted
//   fill. `priority` preloads the picture shown first and no other, and `sizes` is the page's.
// - The thumbnails scroll inside a box as tall as the main picture (side) or wrap under it
//   (below, since the design system fails a box that scrolls sideways). The box holds buttons, so
//   it passes axe's `scrollable-region-focusable`, and it follows the carousel so that the current
//   thumbnail is never out of view. The current one has `aria-current="true"`, a heavier foreground
//   border and full opacity; the others are dimmer and have no border, so the mark is a shape and
//   a weight and not a colour alone. In the column a thumbnail is as wide as the column leaves it
//   (`w-full`), so the 15 px that a classic scrollbar takes comes off the thumbnail and the column
//   never scrolls sideways (a fixed 4 rem thumbnail would overflow it); under the picture they
//   are 4 rem wide.
// - Zoom. A 44 px button over the picture's top corner opens a modal Dialog (`GalleryZoom`) on the
//   picture the carousel shows. Closing it, by Escape, the close button or the backdrop, puts the
//   focus back on the button (Base UI does that) and the carousel jumps to the picture the dialog
//   ended on. The button is outside the slides, and so are the thumbnails, so embla's `watchFocus`
//   (which scrolls a slide that a Tab press focuses) never acts on them, and a slide holds nothing
//   focusable. The dialog's key handling is not the carousel's: the dialog is a sibling of the
//   carousel in React's tree, so the carousel's arrow-key handler never sees its keys.
// - `defaultZoomOpen`, `modal` and `zoomPopupClassName` are the design system's drawn-open state
//   (D45), as SearchOverlay's are: a popup drawn open takes no focus until a reader opens it again,
//   and with `modal={false}` the page stays usable.
"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type {
  ProductGallery as ProductGalleryContent,
  ProductMedia,
} from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@shopblok/ui/primitives/carousel";
import { Dialog, DialogTrigger } from "@shopblok/ui/primitives/dialog";
import { ZoomInIcon } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import { GalleryZoom } from "./product-gallery-zoom";

type ProductGalleryProps = ProductGalleryContent & {
  /** The wording, from the catalog's `organisms.productGallery`. */
  copy: Messages["organisms"]["productGallery"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** Where the thumbnails sit from `md`: beside the main picture (its start side) or under it. */
  thumbnails?: "side" | "below";
  /** `false`: no zoom button and no dialog (the quick view, itself a dialog, passes it). */
  zoom?: boolean;
  /** The main picture's `sizes`, from the page's column ("(min-width: 768px) 50vw, 100vw"). */
  sizes?: string;
  /** The first picture is the page's largest: preload it (the product page; not a quick view). */
  priority?: boolean;
  /** The zoom dialog drawn open at first render (the design system's states). */
  defaultZoomOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states, D45). */
  modal?: boolean;
  /** Classes for the zoom dialog's popup (the design system's states cap it to their box). */
  zoomPopupClassName?: string;
  className?: string;
};

/** The main picture's width: half the window from `md` (the page's right column is the rest). */
const MAIN_SIZES = "(min-width: 768px) 50vw, 100vw";

/** A thumbnail's width. */
const THUMBNAIL_SIZES = "80px";

/** Embla's options, which the primitive takes (they are not exported by embla-carousel-react). */
type CarouselOptions = NonNullable<React.ComponentProps<typeof Carousel>["opts"]>;

/** The previous and next buttons: inside the picture, and still focusable where they are dimmed. */
const ARROW = "z-10 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/** The picture to show first: the first that shows a chosen value, or the first. */
function mainIndexOf(media: ProductMedia[], selectedValueIds: string[]): number {
  const found = media.findIndex((item) =>
    item.optionValueIds?.some((id) => selectedValueIds.includes(id)),
  );
  return found === -1 ? 0 : found;
}

/** A picture's frame: its own aspect ratio, so the page does not shift as it loads. */
const ratioOf = (item: ProductMedia): React.CSSProperties => ({
  aspectRatio: `${item.width} / ${item.height}`,
});

type PictureProps = {
  item: ProductMedia;
  sizes: string;
  priority: boolean;
};

function Picture({ item, sizes, priority }: PictureProps) {
  return (
    <div data-slot="product-gallery-picture" className="relative w-full" style={ratioOf(item)}>
      <Image
        src={item.src}
        alt={item.alt}
        sizes={sizes}
        priority={priority}
        radius="lg"
        className="absolute inset-0 aspect-auto h-full"
      />
    </div>
  );
}

type ThumbnailsProps = {
  media: ProductMedia[];
  current: number;
  onSelect: (index: number) => void;
  /** The wording for a picture with no alternative text. */
  position: (index: number) => string;
  layout: "side" | "below";
};

function Thumbnails({ media, current, onSelect, position, layout }: ThumbnailsProps) {
  const list = useRef<HTMLUListElement>(null);

  // Keeps the current thumbnail in view in a column that scrolls. The box is set by hand and not
  // with `scrollIntoView`, which would scroll the page as well when the gallery is partly out of
  // the window.
  useEffect(() => {
    const box = list.current;
    const item = box?.children.item(current);
    if (!(box && item instanceof HTMLElement) || box.scrollHeight <= box.clientHeight) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [current]);

  return (
    <div className={cn("hidden md:block", layout === "side" && "relative")}>
      <ul
        ref={list}
        role="list"
        data-slot="product-gallery-thumbnails"
        data-layout={layout}
        className={cn(
          "flex gap-2 p-1",
          layout === "side" ? "absolute inset-0 flex-col overflow-y-auto" : "flex-wrap",
        )}
      >
        {media.map((item, index) => {
          const isCurrent = index === current;
          return (
            <li key={index} className="shrink-0">
              <button
                type="button"
                data-slot="product-gallery-thumbnail"
                aria-label={item.alt === "" ? position(index) : item.alt}
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "relative block min-h-11 overflow-hidden rounded-md border-2 bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  layout === "side" ? "w-full" : "w-16",
                  isCurrent
                    ? "border-foreground"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <span
                  aria-hidden="true"
                  className="relative block min-h-11 w-full"
                  style={ratioOf(item)}
                >
                  <NextImage
                    src={item.src}
                    alt=""
                    fill
                    sizes={THUMBNAIL_SIZES}
                    className="object-cover"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductGallery({
  title,
  media,
  selectedValueIds,
  copy,
  locale,
  thumbnails = "side",
  zoom = true,
  sizes = MAIN_SIZES,
  priority = false,
  defaultZoomOpen = false,
  modal = true,
  zoomPopupClassName,
  className,
}: ProductGalleryProps) {
  const direction = useDirection();
  const several = media.length > 1;
  const wanted = mainIndexOf(media, selectedValueIds);
  // The first render's picture: the track starts there in the server's markup and in embla.
  const [start] = useState(wanted);
  const [api, setApi] = useState<CarouselApi>();
  const [position, setPosition] = useState(start);
  const [zoomOpen, setZoomOpen] = useState(defaultZoomOpen);
  const [zoomIndex, setZoomIndex] = useState(start);
  const asked = useRef(wanted);

  const options = useMemo<CarouselOptions>(
    () => ({
      align: "start",
      startIndex: start,
      breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
    }),
    [start],
  );

  // The carousel's place, from embla: a button, a key, a swipe, a thumbnail or the zoom moved it.
  useEffect(() => {
    if (api === undefined) return;
    const sync = () => setPosition(api.selectedScrollSnap());
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  // The shopper picked another colour: go to its picture. Not on first render, which started there.
  useEffect(() => {
    if (api === undefined || asked.current === wanted) return;
    asked.current = wanted;
    api.scrollTo(wanted);
  }, [api, wanted]);

  const last = media.length - 1;
  const current = Math.min(position, last);
  const label = formatMessage(copy.label, { title }, locale);
  const placeOf = (index: number) =>
    formatMessage(copy.position, { index: index + 1, count: media.length }, locale);

  function onZoomOpenChange(next: boolean) {
    setZoomOpen(next);
    if (next) setZoomIndex(current);
    // The dialog closes on the picture it ended on; the carousel is behind it, so it jumps.
    else api?.scrollTo(Math.min(zoomIndex, last), true);
  }

  const zoomButton = zoom ? (
    <DialogTrigger
      data-slot="product-gallery-zoom-trigger"
      render={
        <Button variant="outline" size="icon" className="absolute end-2 top-2 z-10 rounded-full" />
      }
    >
      <Icon icon={ZoomInIcon} />
      <span className="sr-only">{copy.zoom}</span>
    </DialogTrigger>
  ) : null;

  const first = media[0];
  // A starting position other than the first is in the markup, until embla takes over.
  const startStyle: React.CSSProperties | undefined =
    start === 0
      ? undefined
      : { transform: `translate3d(${direction === "rtl" ? "" : "-"}${start * 100}%, 0, 0)` };

  const main =
    first === undefined ? null : several ? (
      <Carousel
        opts={options}
        setApi={setApi}
        roleDescriptionLabel={copy.carousel}
        slideRoleDescriptionLabel={copy.slide}
        aria-label={label}
        data-slot="product-gallery-carousel"
        className="flex min-w-0 flex-col gap-2"
      >
        <div data-slot="product-gallery-stage" className="relative">
          <CarouselContent className="ms-0 touch-pan-y touch-pinch-zoom" style={startStyle}>
            {media.map((item, index) => (
              <CarouselItem
                key={index}
                aria-label={placeOf(index)}
                aria-hidden={index === current ? undefined : true}
                className="flex items-center ps-0"
              >
                <Picture item={item} sizes={sizes} priority={priority && index === start} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            label={copy.previous}
            focusableWhenDisabled
            className={cn(ARROW, "start-2")}
          />
          <CarouselNext label={copy.next} focusableWhenDisabled className={cn(ARROW, "end-2")} />
          {zoomButton}
        </div>
        <p
          data-slot="product-gallery-position"
          role="status"
          className="text-center text-sm text-muted-foreground tabular-nums"
        >
          {placeOf(current)}
        </p>
      </Carousel>
    ) : (
      <div role="group" aria-label={label} data-slot="product-gallery-carousel">
        <div data-slot="product-gallery-stage" className="relative">
          <Picture item={first} sizes={sizes} priority={priority} />
          {zoomButton}
        </div>
      </div>
    );

  const body = (
    <div
      data-slot="product-gallery"
      className={cn(
        "grid min-w-0 gap-3",
        several && thumbnails === "side" && "md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-4",
        className,
      )}
    >
      {several && thumbnails === "side" ? (
        <Thumbnails
          media={media}
          current={current}
          onSelect={(index) => api?.scrollTo(index)}
          position={placeOf}
          layout="side"
        />
      ) : null}
      {main}
      {several && thumbnails === "below" ? (
        <Thumbnails
          media={media}
          current={current}
          onSelect={(index) => api?.scrollTo(index)}
          position={placeOf}
          layout="below"
        />
      ) : null}
    </div>
  );

  if (!zoom) return body;
  return (
    <Dialog open={zoomOpen} onOpenChange={onZoomOpenChange} modal={modal}>
      {body}
      <GalleryZoom
        title={title}
        media={media}
        index={zoomIndex}
        onIndexChange={setZoomIndex}
        copy={copy}
        locale={locale}
        startsOpen={defaultZoomOpen}
        className={zoomPopupClassName}
      />
    </Dialog>
  );
}

export { ProductGallery };
export type { ProductGalleryProps };
