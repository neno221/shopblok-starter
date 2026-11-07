// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The category showcase's
// `banner` member: wide tiles, one across on a phone and two from `md`, the category's name large on
// its picture over the `overlay` scrim (D100's rule for text on a picture: light text keeps 5.7:1 on
// a white photo). An odd last tile takes the whole row. Each tile is one link named by its
// category; the picture is decoration. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { overlayTokens } from "../overlay-tokens";
import { CategoryShowcaseIntro, CategoryShowcaseLink, type LinkHref } from "./parts";
import type { CategoryShowcaseSectionProps } from "./standard";

function CategoryShowcaseBanner({
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
      data-variant="banner"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <CategoryShowcaseIntro heading={heading} intro={intro} />
      <ul data-slot="category-banners" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {tiles.map((tile, index) => {
          const wide = index === tiles.length - 1 && index % 2 === 0;
          return (
            <li key={tile.href} className={cn("min-w-0", wide && "md:col-span-2")}>
              <NextLink
                href={tile.href as LinkHref}
                prefetch={prefetch}
                data-slot="category-tile"
                className="group relative isolate flex aspect-[2/1] flex-col justify-end overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring md:aspect-auto md:h-64 lg:h-80"
              >
                {tile.image === undefined ? null : (
                  <Image
                    src={tile.image.src}
                    alt={tile.image.alt}
                    radius="none"
                    sizes={wide ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
                    className="absolute inset-0 -z-10 aspect-auto h-full"
                    imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}
                <span
                  className={cn(
                    "m-3 flex min-h-11 items-center self-start rounded-lg bg-overlay px-4 py-2 text-xl font-semibold text-balance wrap-anywhere underline-offset-4 group-hover:underline md:m-4 md:text-2xl",
                    overlayTokens,
                  )}
                >
                  {tile.label}
                </span>
              </NextLink>
            </li>
          );
        })}
      </ul>
      <CategoryShowcaseLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { CategoryShowcaseBanner };
