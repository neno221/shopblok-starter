// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; D99). What the hero's
// members share (`sections/hero/<variant>.tsx`): the props of the family's one contract, and the
// pieces each lays out in its own way: the eyebrow, the heading (the page's `<h1>` when the hero
// opens it), the line, the countdown, the links and the products under them. Moved from
// `standard.tsx` (T64) with their classes unchanged, so the first member's pixels are M4's. Server
// components.
import type { HeroSection as HeroSectionData } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { CountdownTimer } from "@shopblok/ui/molecules/countdown-timer";
import { ListingCard } from "@shopblok/ui/organisms/listing-card";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import type * as React from "react";

type HeroSectionProps = HeroSectionData & {
  copy: Pick<
    SectionsCopy,
    "newTab" | "countdown" | "products" | "featuredProduct" | "collectionSpotlight"
  >;
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

/** The heading's element: `h1` when the hero opens the page, `h2` otherwise. */
const headingTag = (level: 1 | 2 = 2) => `h${level}` as const;

function HeroEyebrow({ children, className }: { children?: string; className?: string }) {
  if (children === undefined) return null;
  return (
    <p
      data-slot="hero-eyebrow"
      className={cn(
        "text-sm font-medium tracking-wide wrap-anywhere text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function HeroHeading({
  level,
  className,
  children,
  ...props
}: React.ComponentProps<"h1"> & { level?: 1 | 2 }) {
  const Heading = headingTag(level);
  return (
    <Heading
      data-slot="hero-heading"
      className={cn(
        "text-3xl leading-tight font-semibold text-balance wrap-anywhere md:text-5xl",
        className,
      )}
      {...props}
    >
      {children}
    </Heading>
  );
}

function HeroSubheading({ children, className }: { children?: string; className?: string }) {
  if (children === undefined) return null;
  return (
    <p
      data-slot="hero-subheading"
      className={cn(
        "max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground md:text-lg",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The countdown and the links, as every member draws them under its words. */
function HeroActions({
  countdown,
  links,
  copy,
  locale,
  timeZone,
  frozen,
  prefetch,
  className,
}: Pick<
  HeroSectionProps,
  "countdown" | "links" | "copy" | "locale" | "timeZone" | "frozen" | "prefetch"
> & { className?: string }) {
  return (
    <>
      {countdown === undefined ? null : (
        <CountdownTimer
          countdown={countdown}
          copy={copy.countdown}
          locale={locale}
          timeZone={timeZone}
          frozen={frozen}
        />
      )}
      <SectionLinks
        links={links}
        newTabLabel={copy.newTab}
        prefetch={prefetch}
        className={className}
      />
    </>
  );
}

/** Up to four cards: two across on a phone, as many as there are from `md`. */
const productColumns = ["md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"];

/** The source's products under the words, a list named as a grid; nothing without them. */
function HeroProducts({
  products,
  copy,
  locale,
  headingLevel,
  prefetch,
  className,
}: Pick<HeroSectionProps, "products" | "copy" | "locale" | "headingLevel" | "prefetch"> & {
  className?: string;
}) {
  if (products.length === 0) return null;
  // The cards' titles are one level below the hero's heading.
  const cardHeading = headingLevel === 1 ? "h2" : "h3";
  return (
    <ul
      aria-label={copy.products.grid.label}
      data-slot="hero-products"
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6",
        productColumns[products.length - 1],
        className,
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
  );
}

export { HeroActions, HeroEyebrow, HeroHeading, HeroProducts, HeroSubheading, headingTag };
export type { HeroSectionProps };
