// Ours (T37, SETUP.md "Listing organisms (T37)"; D41, D46, D50; SPEC §13; SBP components/
// product-slider.md; the WAI-ARIA carousel pattern). A row of product cards that scrolls: a heading,
// a link to the whole listing, previous and next buttons, and the cards, one slide each. A server
// component that makes every word and draws the cards; the carousel primitive (embla) is the client
// part, and the live region that says the position is `product-carousel-client.tsx`.
// - One region. The carousel primitive's element is a `role="region"` with
//   `aria-roledescription="carousel"`, and the heading, the link and the buttons sit inside it, so
//   "the section named by its heading" and "the carousel" are the same element: it is named by the
//   heading (`aria-labelledby`), as the WAI-ARIA example's `<section aria-roledescription="carousel"
//   aria-label>` is, and a screen reader reads "New in, carousel" once rather than a region and
//   then a second, equally named group inside it. The heading is an `h2` unless `headingLevel`
//   says, and the cards' titles are one level deeper.
// - Each card is a slide: `aria-roledescription="slide"` (the catalog's word) and the name
//   "3 of 8" (`position`), so a screen reader says where it is. Every slide stays in the reading
//   order, in view or not: the pattern hides slides only for a carousel that shows one at a time.
// - The buttons are 44 x 44 and sit in the heading row, inside the component's box. The primitive
//   puts them 3 rem outside it (`-start-12`, `-end-12`), which at 375 px would widen the page or be
//   cut, so their position classes are replaced here. They are disabled at the ends, with
//   `focusableWhenDisabled` (`aria-disabled`, not the `disabled` attribute): a reader who pressed
//   Next to the end would otherwise lose focus from the button that has just turned off, and start
//   again from the top of the page.
// - No autoplay, at all, in any setting (SPEC §13, D50): nothing in this file or its client part
//   moves the carousel; only the visitor does, with the buttons, the arrow keys the primitive gives,
//   a swipe or a drag, or Tab into a card that is out of view. Under `prefers-reduced-motion` the
//   buttons and keys jump instead of gliding: embla's `duration: 0`, set through its `breakpoints`
//   option, which takes a media query and re-reads it when the preference changes, so no state or
//   effect of ours is involved and the server and the first client render agree. A swipe's release
//   still glides to rest on a slide with embla's own inertia (seen in Chromium), which is the
//   visitor's own momentum.
// - Snap and groups. Embla snaps to a slide's edge (`dragFree` is off), and `slidesToScroll: "auto"`
//   makes a button press move by what fits in view (a page), so with four in view "Next" shows the
//   next four and "Showing 5 to 8 of 8" is true. `containScroll: "trimSnaps"` (embla's default)
//   stops the last page at the end of the row, with no blank space after it. Tab into a card that
//   is out of view brings it in: embla's `watchFocus` (on by default in the installed 8.6.0)
//   listens for focus on each slide and, if Tab was pressed in the last 10 ms, jumps to the
//   snap that holds it. It does not act on a script's `focus()` or a click, which need no help.
// - Slides per view: about two on a phone (44 % of the row each, so a part of the next card shows
//   and tells the visitor the row scrolls), three from `md`, four from `lg`; `sizes` follows. The
//   track has 4 px of room at the top, the bottom and the end, and starts 4 px in (`-ms-3` for the
//   slides' `ps-4`), because the viewport clips what is outside it and a card's focus ring is drawn
//   3 px outside the card.
// - The DS check lets the viewport (`data-slot="carousel-content"`) clip, since the slides outside
//   it are reached by the buttons; it is `overflow: hidden`, not `auto`, so it is not a box that
//   scrolls sideways either.
// - The quick-add variant takes the grid's `quickAdd` (ListingCard). `viewAll` is the shop's own
//   listing, so its `external` flag is not used. Every link takes `prefetch` from the prop.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { ProductCarousel as ProductCarouselContent } from "@shopblok/registry/contracts";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import type { HeadingElement, ProductCardCopy } from "@shopblok/ui/molecules/product-card/parts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@shopblok/ui/primitives/carousel";
import { useId } from "react";
import type * as React from "react";
import { ListingCard, type ListingQuickAdd } from "./listing-card";
import { CarouselStatus } from "./product-carousel-client";

type ProductCarouselProps = ProductCarouselContent & {
  /** The carousel's words and the cards': `organisms.productCarousel` and `molecules`'. */
  copy: ProductCardCopy & { carousel: Messages["organisms"]["productCarousel"] };
  /** The market's `<html lang>`. */
  locale: string;
  /** The heading's level: 2 by default. The cards' titles are one deeper. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** The `quick-add` variant's form, for every card. */
  quickAdd?: ListingQuickAdd;
  /**
   * next/link's `prefetch` for every link. Unset, Next prefetches each in view; the DS page sets
   * `false`, because its pages answer 404 until M3.
   */
  prefetch?: boolean | null;
  className?: string;
};

/** Embla's options, which the primitive takes (they are not exported by embla-carousel-react). */
type CarouselOptions = NonNullable<React.ComponentProps<typeof Carousel>["opts"]>;

/** Plain data, so the server can hand it to the client primitive (see the header). */
const OPTIONS: CarouselOptions = {
  align: "start",
  slidesToScroll: "auto",
  containScroll: "trimSnaps",
  // A slide counts as in view once 90 % of it is: the part of the next card that peeks does not.
  inViewThreshold: 0.9,
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
};

/** The picture's width: about two cards on a phone, a third of the window from `md`, a quarter from `lg`. */
const SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 44vw";

/** A slide's width as a share of the row: the track is wider than the viewport by the slides' `ps-4`. */
const SLIDE = "basis-[44%] md:basis-1/3 lg:basis-1/4";

/** The previous and next buttons: in the row, not 3 rem outside the box, and focusable when off. */
const ARROW = "static inset-auto my-0 aria-disabled:pointer-events-none aria-disabled:opacity-50";

function ProductCarousel({
  title,
  products,
  variant,
  viewAll,
  copy,
  locale,
  headingLevel = 2,
  quickAdd,
  prefetch,
  className,
}: ProductCarouselProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const cardHeading = `h${headingLevel + 1}` as HeadingElement;
  const words = copy.carousel;
  return (
    <Carousel
      opts={OPTIONS}
      roleDescriptionLabel={words.carousel}
      slideRoleDescriptionLabel={words.slide}
      aria-labelledby={headingId}
      data-slot="product-carousel"
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <div
        data-slot="product-carousel-header"
        className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2"
      >
        <Heading
          id={headingId}
          data-slot="product-carousel-title"
          className="min-w-0 flex-1 basis-48 text-xl leading-snug font-semibold wrap-anywhere"
        >
          {title}
        </Heading>
        <div
          data-slot="product-carousel-controls"
          className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1"
        >
          {viewAll === undefined ? null : (
            <Link
              href={viewAll.href as React.ComponentProps<typeof Link>["href"]}
              prefetch={prefetch}
              variant="standalone"
              data-slot="product-carousel-view-all"
              className="min-w-11 justify-center wrap-anywhere"
            >
              {viewAll.label}
            </Link>
          )}
          <CarouselPrevious label={words.previous} focusableWhenDisabled className={ARROW} />
          <CarouselNext label={words.next} focusableWhenDisabled className={ARROW} />
        </div>
      </div>
      <CarouselContent className="-ms-3 touch-pan-y touch-pinch-zoom py-1 pe-1">
        {products.map((product, index) => (
          <CarouselItem
            key={product.id}
            aria-label={formatMessage(
              words.position,
              { index: index + 1, count: products.length },
              locale,
            )}
            className={SLIDE}
          >
            <ListingCard
              variant={variant}
              quickAdd={quickAdd}
              product={product}
              copy={copy}
              locale={locale}
              sizes={SIZES}
              heading={cardHeading}
              prefetch={prefetch}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselStatus message={words.showing} count={products.length} locale={locale} />
    </Carousel>
  );
}

export { ProductCarousel };
export type { ProductCarouselProps };
