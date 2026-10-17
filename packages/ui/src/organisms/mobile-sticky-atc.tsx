// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, Principle 7, D44; WCAG 2.4.11).
// The bar at the foot of a phone's window that keeps the way to the cart in reach once the buy box's
// own button has scrolled out of sight: the product's picture, title and price, what is chosen
// ("Black, M"), and the one thing the shopper can do next. A client component as a whole, as
// CompareTray is: it observes the page.
// - When it appears. Only once the element with id `watch` (the buy box's button) has scrolled
//   above the top of the window: an IntersectionObserver reports it. While it is in view, or below
//   the window, or scrolled back into view, the bar is not drawn at all. On the server and at the
//   first render it is not drawn either, so the server's markup and hydration agree and there is no
//   mismatch; it is a thing the browser adds, and without JavaScript the page has the buy box and
//   nothing else. It is `md:hidden`: from 768 px the buy box sits beside the gallery and is always
//   in reach. `forceVisible` draws it whatever the scroll and the width (the design system's
//   states at 768 and 1440 px too), observes nothing and reserves nothing.
// - How "above the window" is asked. The observer's root is the window with a margin that turns it
//   into the band above the window's top edge (`rootMargin: "100000px 0px -100% 0px"`), and the
//   bar is drawn while the button is wholly inside that band. The plain question ("not
//   intersecting, with its top above 0") is wrong for a jump: observers report only when the answer
//   changes, so a button that starts below the window and is jumped over to above it (the buy box's
//   own "128 reviews" link, an anchor, the Home and End keys) is "not intersecting" before and
//   after, and nothing is reported. In the band the button is out before the jump and in after it,
//   which is a change at any speed. The same band answers the first report, so a page restored
//   scrolled past the button shows the bar at once.
// - Where it sits. `fixed inset-x-0 bottom-0`, on the `--z-sticky` layer (below the cookie banner and
//   the compare tray, which are fixed to the same edge on `--z-overlay`, so the shopper's consent is
//   never hidden behind a sales bar), with the bottom padding raised by `env(safe-area-inset-bottom)`
//   so the button clears a phone's home indicator (Principle 7). It scrolls inside itself at 60 % of
//   the window's height at most, rather than cover a short window.
// - WCAG 2.4.11 Focus Not Obscured. While the bar is drawn its height is reserved at the end of the
//   page (`reserveSpaceFor`, which CookieConsent and CompareTray share: bars at once take the
//   tallest), so a control the shopper tabs to is scrolled clear of it and the page's last links can
//   scroll above it. From `md` the bar is `display: none`, so its measured height is 0 and it
//   reserves nothing there.
// - One row that wraps. The picture (decoration, `alt=""`, 48 px), the title (wraps, never
//   truncated), the price (PriceBlock, small) and the choice come first; the action follows on the
//   same row, or under them when the words are long, and then takes the whole width. The action is
//   what `status` says: `ready` is a submit button with `form={formId}`, so it submits the buy box's
//   own form and adds exactly the choice the box holds (the box's guard still applies, so a press
//   that arrives while the box is adding is ignored); `incomplete` is a link, styled as a button, to
//   the buy box's options (`optionsHref`), a plain `<a>` since it is an in-page `#` link, which works
//   without JavaScript; `sold-out` is the words alone, with no control to press.
// - The region is a `<section>` named by the catalog, a landmark with a name of its own (the buy box's
//   form is not one), so a screen-reader user can find the bar and skip it.
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatList } from "@shopblok/i18n/format";
import type { MobileStickyATC as MobileStickyATCContent } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { StockIndicator } from "@shopblok/ui/atoms/stock-indicator";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { useEffect, useRef, useState } from "react";
import { reserveSpaceFor } from "./cookie-consent-reserve";

type MobileStickyATCProps = MobileStickyATCContent & {
  copy: {
    mobileStickyAtc: Messages["organisms"]["mobileStickyAtc"];
    priceBlock: Messages["molecules"]["priceBlock"];
  };
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The id of the element whose leaving the window shows the bar: the buy box's button. */
  watch: string;
  /** The buy box's form id: the bar's button submits that form, so it adds the same choice. */
  formId: string;
  /** Where "Choose options" goes: the buy box's options ("#buy-box-options"). */
  optionsHref: string;
  /** Drawn whatever the scroll (the design system's states). */
  forceVisible?: boolean;
  className?: string;
};

/**
 * The observer's root: the window's top edge and 100,000 px above it. The bottom margin of -100%
 * takes the window itself out, so an element "intersects" the root only above the top edge.
 */
const ABOVE_THE_WINDOW = "100000px 0px -100% 0px";

/** How much of the button must be in that band for it to have scrolled past (all of it, less rounding). */
const WHOLLY_ABOVE = 0.99;

function MobileStickyATC({
  title,
  image,
  price,
  choice,
  status,
  copy,
  locale,
  watch,
  formId,
  optionsHref,
  forceVisible = false,
  className,
}: MobileStickyATCProps) {
  const bar = useRef<HTMLElement>(null);
  // Whether the watched element has scrolled above the window. False until the browser says so, so
  // the server and the first render draw nothing.
  const [scrolledPast, setScrolledPast] = useState(false);
  const visible = forceVisible || scrolledPast;
  const reserve = visible && !forceVisible;

  useEffect(() => {
    if (forceVisible) return;
    const target = document.getElementById(watch);
    if (target === null || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        // The newest report is the one that counts when several have queued up.
        const entry = entries[entries.length - 1];
        if (entry !== undefined)
          setScrolledPast(entry.isIntersecting && entry.intersectionRatio >= WHOLLY_ABOVE);
      },
      { rootMargin: ABOVE_THE_WINDOW, threshold: [0, 1] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch, forceVisible]);

  // WCAG 2.4.11: the bar's height is reserved at the end of the page while it is there.
  useEffect(() => {
    const element = bar.current;
    if (!reserve || element === null) return;
    return reserveSpaceFor(element);
  }, [reserve]);

  if (!visible) return null;

  const words = copy.mobileStickyAtc;
  return (
    <section
      ref={bar}
      aria-label={words.region}
      data-slot="mobile-sticky-atc"
      data-status={status}
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-sticky) max-h-[60dvh] overflow-y-auto overscroll-contain border-t border-border bg-background text-foreground",
        !forceVisible && "md:hidden",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-page min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 flex-[1_1_12rem] items-center gap-3">
          {image === undefined ? null : (
            <Image src={image.src} alt="" sizes="48px" ratio="square" className="w-12 shrink-0" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p
              data-slot="mobile-sticky-atc-title"
              className="text-sm leading-snug font-medium wrap-anywhere"
            >
              {title}
            </p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <PriceBlock price={price} copy={copy.priceBlock} locale={locale} size="sm" />
              {choice.length === 0 ? null : (
                <span
                  data-slot="mobile-sticky-atc-choice"
                  className="min-w-0 text-sm text-muted-foreground wrap-anywhere"
                >
                  {formatList(choice, locale, "unit")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div data-slot="mobile-sticky-atc-action" className="flex min-w-0 flex-auto sm:flex-none">
          {status === "ready" ? (
            <Button
              type="submit"
              form={formId}
              data-slot="mobile-sticky-atc-add"
              className="w-full max-w-full wrap-anywhere sm:w-auto"
            >
              {words.add}
            </Button>
          ) : status === "incomplete" ? (
            <a
              href={optionsHref}
              data-slot="mobile-sticky-atc-choose"
              className={cn(buttonVariants(), "w-full max-w-full wrap-anywhere sm:w-auto")}
            >
              {words.choose}
            </a>
          ) : (
            <StockIndicator
              status="out"
              text={words.soldOut}
              data-slot="mobile-sticky-atc-sold-out"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export { MobileStickyATC };
export type { MobileStickyATCProps };
