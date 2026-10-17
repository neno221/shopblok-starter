// Ours (T37, SETUP.md "Listing organisms (T37)"; WCAG 4.1.3 Status Messages). ProductCarousel's one
// client part that is its own: the polite live region that says which products are in view after
// the visitor has moved the carousel ("Showing 5 to 8 of 8"). A client component because it listens
// to embla's events, through the carousel primitive's context, and keeps the sentence in state.
// - Not on load. The region is in the markup from the first render and empty, and stays empty until
//   embla reports a `select`: an arrow, an arrow key, a swipe, or Tab into a card that was out of
//   view (embla's `watchFocus` scrolls it in, and selects). A page that announced "Showing 1 to 4 of
//   8" as it loaded would talk over the page for every carousel on it.
// - After the move has settled. A scroll takes several frames and the slides' visibility is
//   reported as they cross the edge, so the sentence is made once the carousel has been quiet for
//   `SETTLE_MS`, from the slides that are in view then (`slidesInView`, which counts a slide once
//   90 % of it is: see the options in `product-carousel.tsx`), not from the first `select`. The
//   last words win, so a reader who presses Next three times hears the last position.
// - The words are the catalog's ICU message, formatted here with `@shopblok/i18n/format` (the
//   package's index carries the four catalogs, which a browser has no use for). The server hands
//   down the message and the count; the numbers are formatted by the message (`{from, number}`).
"use client";

import { formatMessage } from "@shopblok/i18n/format";
import { cn } from "@shopblok/ui/lib/utils";
import { useCarousel } from "@shopblok/ui/primitives/carousel";
import { useEffect, useState } from "react";

/** How long the carousel must be still before the position is said, in milliseconds. */
const SETTLE_MS = 200;

type CarouselStatusProps = {
  /** `organisms.productCarousel.showing`, an ICU message with `from`, `to` and `count`. */
  message: string;
  /** How many products the carousel holds. */
  count: number;
  /** The market's `<html lang>`. */
  locale: string;
  className?: string;
};

function CarouselStatus({ message, count, locale, className }: CarouselStatusProps) {
  const { api } = useCarousel();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!api) return;
    let moved = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const say = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const inView = api.slidesInView();
        if (inView.length === 0) return;
        setText(
          formatMessage(
            message,
            { from: Math.min(...inView) + 1, to: Math.max(...inView) + 1, count },
            locale,
          ),
        );
      }, SETTLE_MS);
    };
    // A move starts with `select`; the slides in view are reported as the scroll goes on and ends.
    const onSelect = () => {
      moved = true;
      say();
    };
    const onChange = () => {
      if (moved) say();
    };
    api.on("select", onSelect);
    api.on("settle", onChange);
    api.on("slidesInView", onChange);
    return () => {
      clearTimeout(timer);
      api.off("select", onSelect);
      api.off("settle", onChange);
      api.off("slidesInView", onChange);
    };
  }, [api, message, count, locale]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="product-carousel-status"
      className={cn("sr-only", className)}
    >
      {text}
    </div>
  );
}

export { CarouselStatus };
export type { CarouselStatusProps };
