// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D100; WCAG 2.2.2;
// the WAI-ARIA carousel pattern). The testimonials' `carousel` member: a row of quote cards that
// scrolls, one on a phone, two from `md`, three from `lg`, with previous and next buttons in the
// heading's row. Nothing moves by itself: only the buttons, the arrow keys, a swipe or Tab into a
// card out of view do (the carousel primitive's embla, as ProductCarousel uses it, with its
// reduced-motion jump). The carousel is one region named by the heading, or by the cards' name when
// there is none; each card is a slide named "2 of 5". The buttons are 44 x 44, inside the box, and
// stay focusable at the ends (`aria-disabled`). A server component; the carousel primitive is its
// island.
import { formatMessage } from "@shopblok/i18n";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@shopblok/ui/primitives/carousel";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { useId } from "react";
import type * as React from "react";
import { TestimonialCard, type TestimonialsSectionProps } from "./parts";

type CarouselOptions = NonNullable<React.ComponentProps<typeof Carousel>["opts"]>;

/** Plain data for the client primitive: a page per press, snapping to a card, never by itself. */
const OPTIONS: CarouselOptions = {
  align: "start",
  slidesToScroll: "auto",
  containScroll: "trimSnaps",
  inViewThreshold: 0.9,
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
};

/** The buttons in the row, not 3 rem outside the box, and focusable when off. */
const ARROW = "static inset-auto my-0 aria-disabled:pointer-events-none aria-disabled:opacity-50";

function TestimonialsCarousel({
  settings,
  heading,
  quotes,
  copy,
  locale,
  className,
}: TestimonialsSectionProps) {
  const headingId = useId();
  const words = copy.products.carousel;
  return (
    <SectionFrame
      data-variant="carousel"
      settings={settings}
      slot="testimonials-section"
      className={className}
    >
      <Carousel
        opts={OPTIONS}
        roleDescriptionLabel={words.carousel}
        slideRoleDescriptionLabel={words.slide}
        {...(heading === undefined
          ? { "aria-label": copy.testimonials.label }
          : { "aria-labelledby": headingId })}
        data-slot="testimonials-carousel"
        className="flex min-w-0 flex-col gap-6"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {heading === undefined ? null : (
            <h2
              id={headingId}
              data-slot="section-heading"
              className="min-w-0 flex-1 basis-48 text-2xl font-semibold text-balance wrap-anywhere md:text-3xl"
            >
              {heading}
            </h2>
          )}
          <div className="ms-auto flex items-center gap-3">
            <CarouselPrevious
              label={copy.testimonials.previous}
              focusableWhenDisabled
              className={ARROW}
            />
            <CarouselNext label={copy.testimonials.next} focusableWhenDisabled className={ARROW} />
          </div>
        </div>
        <CarouselContent className="-ms-3 touch-pan-y touch-pinch-zoom py-1 pe-1">
          {quotes.map((quote, index) => (
            <CarouselItem
              key={quote.id}
              aria-label={formatMessage(
                words.position,
                { index: index + 1, count: quotes.length },
                locale,
              )}
              className={cn("basis-[88%] md:basis-1/2 lg:basis-1/3")}
            >
              <TestimonialCard quote={quote} copy={copy} locale={locale} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </SectionFrame>
  );
}

export { TestimonialsCarousel };
