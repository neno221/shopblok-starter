// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The category showcase's
// `list` member: an index of the shop. The categories' names in columns (one on a phone, two from
// `sm`, three from `md`, four from `lg`), each beside a small round picture, one link of at least
// 44 px per category, named by it; the pictures are decoration. A category's whole path is its
// name's place in the tree, so the columns read in the tree's order. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { useId } from "react";
import { CategoryShowcaseIntro, CategoryShowcaseLink, namedBy, type LinkHref } from "./parts";
import type { CategoryShowcaseSectionProps } from "./standard";

function CategoryShowcaseList({
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
      data-variant="list"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <CategoryShowcaseIntro heading={heading} intro={intro} headingId={headingId} />
      <ul
        data-slot="category-index"
        {...namedBy(headingId, heading, copy.categoryShowcase.label)}
        className="columns-1 gap-x-8 border-y border-border py-4 sm:columns-2 md:columns-3 lg:columns-4"
      >
        {tiles.map((tile) => (
          <li key={tile.href} className="break-inside-avoid py-1">
            <NextLink
              href={tile.href as LinkHref}
              prefetch={prefetch}
              data-slot="category-tile"
              className="group flex min-h-11 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              {tile.image === undefined ? (
                <span aria-hidden="true" className="size-10 shrink-0 rounded-full bg-muted" />
              ) : (
                <Image
                  src={tile.image.src}
                  alt={tile.image.alt}
                  ratio="square"
                  radius="full"
                  sizes="40px"
                  className="size-10 shrink-0"
                />
              )}
              <span className="min-w-0 text-base font-medium wrap-anywhere underline-offset-4 group-hover:underline">
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

export { CategoryShowcaseList };
