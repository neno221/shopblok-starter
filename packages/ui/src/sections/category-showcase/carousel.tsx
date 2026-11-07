// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100; WCAG 2.2.2; the WAI-ARIA
// carousel pattern). The category showcase's `carousel` member: the tiles (a tall picture and the
// name, as the first member draws them) in a row that scrolls, two on a phone, three from `md` and
// four from `lg`, with previous and next buttons in the heading's row. Nothing moves by itself: only
// the buttons, the arrow keys (from the buttons) or a swipe do (the carousel primitive's embla, as
// ProductCarousel and the testimonials' carousel use it, with its reduced-motion jump); those are
// its ways in, so the DS's clip check lets its viewport off as it does theirs. The carousel is one
// region named by the heading, or "Shop by category" without one; each tile is a slide named
// "2 of 8". The buttons are 44 x 44 and stay focusable at the ends (`aria-disabled`). A server
// component; the carousel primitive is its island.
import { formatMessage } from "@shopblok/i18n";
import { Image } from "@shopblok/ui/atoms/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@shopblok/ui/primitives/carousel";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { useId } from "react";
import type * as React from "react";
import { CategoryShowcaseLink, namedBy, type LinkHref } from "./parts";
import type { CategoryShowcaseSectionProps } from "./standard";

type CarouselOptions = NonNullable<React.ComponentProps<typeof Carousel>["opts"]>;

/** Plain data for the client primitive: a page per press, snapping to a tile, never by itself. */
const OPTIONS: CarouselOptions = {
  align: "start",
  slidesToScroll: "auto",
  containScroll: "trimSnaps",
  inViewThreshold: 0.9,
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
};

/** The buttons in the row, not 3 rem outside the box, and focusable when off. */
const ARROW = "static inset-auto my-0 aria-disabled:pointer-events-none aria-disabled:opacity-50";

function CategoryShowcaseCarousel({
  settings,
  heading,
  intro,
  link,
  tiles,
  copy,
  locale,
  prefetch,
  className,
}: CategoryShowcaseSectionProps) {
  const headingId = useId();
  const words = copy.products.carousel;
  return (
    <SectionFrame
      data-variant="carousel"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <Carousel
        opts={OPTIONS}
        roleDescriptionLabel={words.carousel}
        slideRoleDescriptionLabel={words.slide}
        {...namedBy(headingId, heading, copy.categoryShowcase.label)}
        data-slot="category-carousel"
        className="flex min-w-0 flex-col gap-6"
      >
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-1 basis-48 flex-col gap-3">
            {heading === undefined ? null : (
              <SectionHeading id={headingId}>{heading}</SectionHeading>
            )}
            {intro === undefined ? null : (
              <p className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground">
                {intro}
              </p>
            )}
          </div>
          <div className="ms-auto flex items-center gap-3">
            <CarouselPrevious
              label={copy.categoryShowcase.previous}
              focusableWhenDisabled
              className={ARROW}
            />
            <CarouselNext
              label={copy.categoryShowcase.next}
              focusableWhenDisabled
              className={ARROW}
            />
          </div>
        </div>
        <CarouselContent className="-ms-4 touch-pan-y touch-pinch-zoom py-1 pe-1">
          {tiles.map((tile, index) => (
            <CarouselItem
              key={tile.href}
              aria-label={formatMessage(
                words.position,
                { index: index + 1, count: tiles.length },
                locale,
              )}
              className="basis-1/2 ps-4 md:basis-1/3 lg:basis-1/4"
            >
              <NextLink
                href={tile.href as LinkHref}
                prefetch={prefetch}
                data-slot="category-tile"
                className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                {tile.image === undefined ? (
                  <span aria-hidden="true" className="aspect-[3/4] rounded-lg bg-muted" />
                ) : (
                  <Image
                    src={tile.image.src}
                    alt={tile.image.alt}
                    ratio="tall"
                    radius="lg"
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}
                <span className="min-h-11 text-base font-medium wrap-anywhere underline-offset-4 group-hover:underline">
                  {tile.label}
                </span>
              </NextLink>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <CategoryShowcaseLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { CategoryShowcaseCarousel };
