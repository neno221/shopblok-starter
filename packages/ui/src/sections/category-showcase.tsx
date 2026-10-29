// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `categoryShowcase`). Categories as tiles,
// as M3's home draws them: a tall picture and the name, one link each, two across on a phone and
// four from `md`. The tiles come from a `categorySource` (top level, a category's children, or the
// editor's own list), each with the editor's picture or label when one is set, else the
// category's name and its newest product's picture. Above them the heading, a line and a link. A
// server component.
import type { CategoryShowcaseSection as CategoryShowcaseSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type CategoryShowcaseSectionProps = CategoryShowcaseSectionData & {
  copy: Pick<SectionsCopy, "newTab">;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function CategoryShowcaseSection({
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
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      {heading === undefined && intro === undefined ? null : (
        <div className="flex min-w-0 flex-col gap-3">
          {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
          {intro === undefined ? null : (
            <p className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground">
              {intro}
            </p>
          )}
        </div>
      )}
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
      {link === undefined ? null : (
        <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
      )}
    </SectionFrame>
  );
}

export { CategoryShowcaseSection };
export type { CategoryShowcaseSectionProps };
