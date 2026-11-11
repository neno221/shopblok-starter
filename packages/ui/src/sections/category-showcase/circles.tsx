// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The category showcase's
// `circles` member: each category a round picture with its name under it. On a phone the circles
// are one row that scrolls sideways inside its own box (never the page), snapping to a circle; from
// `md` they wrap, centred while they fit, and from `lg` in even rows (`circlesPerRow`). The
// scrolling row is a list named by the heading (or "Shop by category") that takes the focus, so the
// keyboard can scroll it too (axe's scrollable-region-focusable; the DS's sideways-scroll check
// lets it off as it does the USP strip). Each circle is one link of at least 44 px named by the
// category; the picture is decoration. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { useId, type CSSProperties } from "react";
import { CategoryShowcaseIntro, CategoryShowcaseLink, namedBy, type LinkHref } from "./parts";
import type { CategoryShowcaseSectionProps } from "./standard";

/** The circles in each row from `lg`: at most eight, the rows as even as they can be. */
export function circlesPerRow(count: number): number {
  const rows = Math.max(1, Math.ceil(count / 8));
  return Math.max(1, Math.ceil(count / rows));
}

function CategoryShowcaseCircles({
  settings,
  heading,
  intro,
  link,
  tiles,
  copy,
  prefetch,
  className,
}: CategoryShowcaseSectionProps) {
  const headingId = useId();
  return (
    <SectionFrame
      data-variant="circles"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <CategoryShowcaseIntro heading={heading} intro={intro} headingId={headingId} />
      <ul
        data-slot="category-circles"
        {...namedBy(headingId, heading, copy.categoryShowcase.label)}
        // A scrolling list the keyboard can reach, named (axe's scrollable-region-focusable).
        tabIndex={0}
        className={cn(
          "-mx-1 flex snap-x gap-4 overflow-x-auto rounded-md px-1 pt-1 pb-2 outline-none focus-visible:ring-3 focus-visible:ring-ring",
          "md:flex-wrap md:justify-center md:gap-x-8 md:gap-y-6 md:overflow-visible",
          // From `lg`, the rows are balanced: at most eight circles a row, as many in each row as
          // can be, so eight are one row and nine are five and four, never one alone on a second
          // row (W7 review item 10).
          "lg:mx-auto lg:max-w-[calc(var(--circles-row)*8rem+(var(--circles-row)-1)*1.5rem+0.5rem)] lg:gap-x-6",
        )}
        style={{ "--circles-row": circlesPerRow(tiles.length) } as CSSProperties}
      >
        {tiles.map((tile) => (
          <li key={tile.href} className="w-24 shrink-0 snap-start md:w-32">
            <NextLink
              href={tile.href as LinkHref}
              prefetch={prefetch}
              data-slot="category-tile"
              className="group flex flex-col items-center gap-2 rounded-lg text-center outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              {tile.image === undefined ? (
                <span aria-hidden="true" className="aspect-square w-full rounded-full bg-muted" />
              ) : (
                <Image
                  src={tile.image.src}
                  alt={tile.image.alt}
                  ratio="square"
                  radius="full"
                  sizes="128px"
                  className="w-full"
                  imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              )}
              <span className="flex min-h-11 items-start text-sm font-medium text-balance wrap-anywhere underline-offset-4 group-hover:underline md:text-base">
                {tile.label}
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
      <CategoryShowcaseLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { CategoryShowcaseCircles };
