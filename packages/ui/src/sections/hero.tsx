// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `hero`, D50, D79). A page's opening band:
// an eyebrow, the heading, a line and up to two calls to action, beside the editor's picture (under
// them on a phone, so the heading is read and seen first). Optionally a countdown to an
// offer's end, which the server renders from the time it rendered (D50, CountdownTimer), and up to
// four products under the text, from a `productSource`. The heading is the page's `<h1>` when the
// hero opens the page (`headingLevel={1}`), and then its picture is preloaded; otherwise an `<h2>`.
// The cards' titles are one level below the heading. A server component; the countdown's clock is
// the only island.
import type { HeroSection as HeroSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { CountdownTimer } from "@shopblok/ui/molecules/countdown-timer";
import { ListingCard } from "@shopblok/ui/organisms/listing-card";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";

type HeroSectionProps = HeroSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "countdown" | "products">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** 1 when the hero opens the page and its heading is the page's title; 2 by default. */
  headingLevel?: 1 | 2;
  /** The IANA time zone the countdown's end is written in: the market's (UTC unless given). */
  timeZone?: string;
  /** The countdown stays at its `now` and does not tick: the design system's states. */
  frozen?: boolean;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

/** Up to four cards: two across on a phone, as many as there are from `md`. */
const productColumns = ["md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"];

function HeroSection({
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
  const Heading = `h${headingLevel}` as const;
  const cardHeading = headingLevel === 1 ? "h2" : "h3";
  return (
    <SectionFrame
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col gap-10"
    >
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-8",
          image !== undefined && "md:grid-cols-2 md:gap-12",
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4 md:gap-6">
          {eyebrow === undefined ? null : (
            <p
              data-slot="hero-eyebrow"
              className="text-sm font-medium tracking-wide wrap-anywhere text-muted-foreground uppercase"
            >
              {eyebrow}
            </p>
          )}
          <Heading
            data-slot="hero-heading"
            className="text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-5xl"
          >
            {heading}
          </Heading>
          {subheading === undefined ? null : (
            <p
              data-slot="hero-subheading"
              className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground md:text-lg"
            >
              {subheading}
            </p>
          )}
          {countdown === undefined ? null : (
            <CountdownTimer
              countdown={countdown}
              copy={copy.countdown}
              locale={locale}
              timeZone={timeZone}
              frozen={frozen}
            />
          )}
          <SectionLinks links={links} newTabLabel={copy.newTab} prefetch={prefetch} />
        </div>
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            ratio="landscape"
            radius="xl"
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
            priority={headingLevel === 1}
            className="w-full"
            data-slot="hero-image"
          />
        )}
      </div>
      {products.length === 0 ? null : (
        <ul
          aria-label={copy.products.grid.label}
          data-slot="hero-products"
          className={cn(
            "grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6",
            productColumns[products.length - 1],
          )}
        >
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ListingCard
                variant="standard"
                product={product}
                copy={copy.products}
                locale={locale}
                sizes="(min-width: 768px) 25vw, 50vw"
                heading={cardHeading}
                prefetch={prefetch}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionFrame>
  );
}

export { HeroSection };
export type { HeroSectionProps };
