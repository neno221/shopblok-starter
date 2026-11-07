// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The collection
// spotlight's `stacked` member: a wide picture across the section, the heading, the editor's words
// and the way to the collection under it, and a row of the collection's products under them (two
// across on a phone, four from `md`). Without the editor's picture the words lead; without products
// (none is sold in the region) the words stand alone. The heading is the editor's or the
// collection's title in the market's language. A server component.
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { ListingCard } from "@shopblok/ui/organisms/listing-card";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import type * as React from "react";
import type { CollectionSpotlightSectionProps } from "./standard";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function CollectionSpotlightStacked({
  settings,
  heading,
  text,
  image,
  href,
  products,
  copy,
  locale,
  prefetch,
  className,
}: CollectionSpotlightSectionProps) {
  return (
    <SectionFrame
      data-variant="stacked"
      settings={settings}
      slot="collection-spotlight-section"
      className={className}
      innerClassName="flex flex-col gap-8"
    >
      {image === undefined ? null : (
        <Image
          src={image.src}
          alt={image.alt}
          ratio="video"
          radius="xl"
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="w-full lg:aspect-[21/9]"
        />
      )}
      <div className="flex min-w-0 flex-col items-start gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionHeading>{heading}</SectionHeading>
          {text === undefined ? null : (
            <div className="flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere text-muted-foreground">
              {text.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
        <NextLink
          href={href as LinkHref}
          prefetch={prefetch}
          data-slot="collection-spotlight-link"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "max-w-full shrink-0 wrap-anywhere",
          )}
        >
          {copy.collectionSpotlight.shop}
        </NextLink>
      </div>
      {products.length === 0 ? null : (
        <ul
          aria-label={copy.products.grid.label}
          className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-6"
        >
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ListingCard
                variant="standard"
                product={product}
                copy={copy.products}
                locale={locale}
                sizes="(min-width: 768px) 25vw, 50vw"
                prefetch={prefetch}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionFrame>
  );
}

export { CollectionSpotlightStacked };
