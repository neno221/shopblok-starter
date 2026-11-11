// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `bento` member: the message in one tile, beside up to four products from its source as a
// two-by-two grid of cards (under it on a phone). With products, the editor's picture fills the
// message's tile and the words lie on the `overlay` scrim over it, as the overlay member's do (W7
// review item 11: the large tile was a grey panel); without a picture the tile is the muted fill.
// Without products the picture takes the second tile; with neither, the message runs across. The
// products are a list named as a grid, their names one level below the heading. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { overlayTokens } from "../overlay-tokens";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroProducts,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

/**
 * The products tile's columns by count (PR 119 review, item 3): one card fills the tile, two and
 * four sit two across, and of three the first spans both columns, so no quarter stays empty.
 * They replace HeroProducts' own per-count columns, which fit a full-width row, not a half tile.
 */
const bentoColumns = [
  "grid-cols-1 md:grid-cols-1",
  "md:grid-cols-2",
  "md:grid-cols-2 *:first:col-span-2",
  "md:grid-cols-2",
];

function HeroBento({
  settings,
  eyebrow,
  heading,
  subheading,
  image,
  links,
  countdown,
  products,
  copy,
  locale,
  headingLevel = 2,
  timeZone,
  frozen,
  prefetch,
  className,
}: HeroSectionProps) {
  // The second tile: the products if the source has any, else the picture, else none.
  const tile = products.length > 0 ? "products" : image === undefined ? null : image;
  // The picture behind the words: with products the second tile is theirs.
  const behind = products.length > 0 ? image : undefined;
  return (
    <SectionFrame
      data-variant="bento"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName={cn("grid grid-cols-1 gap-4 md:gap-6", tile !== null && "md:grid-cols-2")}
    >
      <div
        data-slot="hero-bento-message"
        className={cn(
          "relative isolate flex min-h-80 min-w-0 flex-col items-start justify-end overflow-hidden rounded-xl",
          behind === undefined ? "bg-muted p-6 md:p-10" : "p-4 md:p-6",
        )}
      >
        {behind === undefined ? null : (
          <Image
            src={behind.src}
            alt={behind.alt}
            radius="none"
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
            priority={headingLevel === 1}
            className="absolute inset-0 -z-10 aspect-auto h-full"
            data-slot="hero-image"
          />
        )}
        <div
          data-slot={behind === undefined ? undefined : "hero-scrim"}
          className={cn(
            "flex min-w-0 flex-col items-start gap-4 md:gap-6",
            behind !== undefined && cn("rounded-xl bg-overlay p-6 md:p-8", overlayTokens),
          )}
        >
          <HeroEyebrow>{eyebrow}</HeroEyebrow>
          <HeroHeading level={headingLevel}>{heading}</HeroHeading>
          <HeroSubheading>{subheading}</HeroSubheading>
          <HeroActions
            countdown={countdown}
            links={links}
            copy={copy}
            locale={locale}
            timeZone={timeZone}
            frozen={frozen}
            prefetch={prefetch}
          />
        </div>
      </div>
      {tile === "products" ? (
        <HeroProducts
          products={products}
          copy={copy}
          locale={locale}
          headingLevel={headingLevel}
          prefetch={prefetch}
          className={cn("gap-4 md:gap-x-6", bentoColumns[products.length - 1])}
        />
      ) : tile !== null ? (
        <Image
          src={tile.src}
          alt={tile.alt}
          ratio="square"
          radius="xl"
          sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
          priority={headingLevel === 1}
          className="h-full w-full"
          data-slot="hero-image"
        />
      ) : null}
    </SectionFrame>
  );
}

export { HeroBento };
