// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `categoryShowcase`). Categories as tiles,
// as M3's home draws them: a tall picture and the name, one link each, two across on a phone and
// four from `md`. The tiles come from a `categorySource` (top level, a category's children, or the
// editor's own list), each with the editor's picture or label when one is set, else the
// category's name and its newest product's picture. Above them the heading, a line and a link. A
// server component.
import type { CategoryShowcaseSection as CategoryShowcaseSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { CategoryShowcaseIntro, CategoryShowcaseLink, type LinkHref } from "./parts";

type CategoryShowcaseSectionProps = CategoryShowcaseSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "categoryShowcase" | "products">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>` (T81: the carousel's slide names). */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function CategoryShowcaseStandard({
  settings,
  heading,
  intro,
  link,
  tiles,
  copy,
  prefetch,
  className,
}: CategoryShowcaseSectionProps) {
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <CategoryShowcaseIntro heading={heading} intro={intro} />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {tiles.map((tile) => (
          <li key={tile.href} className="min-w-0">
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
                  sizes="(min-width: 1280px) 300px, (min-width: 768px) 25vw, 50vw"
                  imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              )}
              <span className="min-h-11 text-base font-medium wrap-anywhere underline-offset-4 group-hover:underline">
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

export { CategoryShowcaseStandard };
export type { CategoryShowcaseSectionProps };
