// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The category showcase's
// `bento` member: the first category as one large tile and up to four more beside it, smaller, the
// name on each picture's foot over the `overlay` scrim (D100's rule for text on a picture). From
// `md` a grid of four columns, the large tile two columns and two rows; on a phone the large tile
// across the width and the others two across. Tiles past the fifth are not drawn. Each tile is one
// link named by its category; the picture is decoration. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import { overlayTokens } from "../overlay-tokens";
import {
  CategoryShowcaseIntro,
  CategoryShowcaseLink,
  type CategoryTileData,
  type LinkHref,
} from "./parts";
import type { CategoryShowcaseSectionProps } from "./standard";

/** One large and up to four small. */
const BENTO_TILES = 5;

function BentoTile({
  tile,
  large,
  prefetch,
}: {
  tile: CategoryTileData;
  large: boolean;
  prefetch?: boolean | null;
}) {
  return (
    <NextLink
      href={tile.href as LinkHref}
      prefetch={prefetch}
      data-slot="category-tile"
      className="group relative isolate flex h-full min-h-40 flex-col justify-end overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring md:min-h-48"
    >
      {tile.image === undefined ? null : (
        <Image
          src={tile.image.src}
          alt={tile.image.alt}
          radius="none"
          sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
          className="absolute inset-0 -z-10 aspect-auto h-full"
          imageClassName="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
      <span
        className={cn(
          "m-2 flex min-h-11 items-center self-start rounded-lg bg-overlay px-3 py-1.5 font-medium wrap-anywhere underline-offset-4 group-hover:underline",
          large ? "text-lg md:text-xl" : "text-sm md:text-base",
          overlayTokens,
        )}
      >
        {tile.label}
      </span>
    </NextLink>
  );
}

function CategoryShowcaseBento({
  settings,
  heading,
  intro,
  link,
  tiles,
  copy,
  prefetch,
  className,
}: CategoryShowcaseSectionProps) {
  const shown = tiles.slice(0, BENTO_TILES);
  return (
    <SectionFrame
      data-variant="bento"
      settings={settings}
      slot="category-showcase-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <CategoryShowcaseIntro heading={heading} intro={intro} />
      <ul
        data-slot="category-bento"
        className="grid auto-rows-[10rem] grid-cols-2 gap-4 md:auto-rows-[12rem] md:grid-cols-4 md:gap-6"
      >
        {shown.map((tile, index) => (
          <li
            key={tile.href}
            className={cn(
              "min-w-0",
              index === 0 && "col-span-2 row-span-2",
              // A lone small tile under the large one takes the row.
              index === shown.length - 1 && index % 2 === 1 && "max-md:col-span-2",
            )}
          >
            <BentoTile tile={tile} large={index === 0} prefetch={prefetch} />
          </li>
        ))}
      </ul>
      <CategoryShowcaseLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { CategoryShowcaseBento };
