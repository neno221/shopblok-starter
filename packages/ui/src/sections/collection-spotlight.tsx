// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `collectionSpotlight`). A collection in the
// light: the editor's picture, heading and words with the way to the collection's page, beside a
// few of its products (its newest, or by price or name, as the editor chose), two across. The
// heading is the editor's or the collection's title in the market's language; the products and
// their prices are Medusa's, in the market's region. Without products (none is sold in the
// region) the words stand alone. A server component.
import type { CollectionSpotlightSection as CollectionSpotlightSectionData } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { ListingCard } from "@shopblok/ui/organisms/listing-card";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type CollectionSpotlightSectionProps = CollectionSpotlightSectionData & {
  copy: Pick<SectionsCopy, "products" | "collectionSpotlight">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function CollectionSpotlightSection({
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
      settings={settings}
      slot="collection-spotlight-section"
      className={className}
      innerClassName={cn(
        "grid grid-cols-1 items-start gap-8",
        products.length > 0 && "lg:grid-cols-2 lg:gap-12",
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-4">
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            ratio="landscape"
            radius="xl"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="w-full"
          />
        )}
        <SectionHeading>{heading}</SectionHeading>
        {text === undefined ? null : (
          <div className="flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere text-muted-foreground">
            {text.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
        <NextLink
          href={href as LinkHref}
          prefetch={prefetch}
          data-slot="collection-spotlight-link"
          className={cn(buttonVariants({ variant: "outline" }), "max-w-full wrap-anywhere")}
        >
          {copy.collectionSpotlight.shop}
        </NextLink>
      </div>
      {products.length === 0 ? null : (
        <ul
          aria-label={copy.products.grid.label}
          className="grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6"
        >
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ListingCard
                variant="standard"
                product={product}
                copy={copy.products}
                locale={locale}
                sizes="(min-width: 1024px) 25vw, 50vw"
                prefetch={prefetch}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionFrame>
  );
}

export { CollectionSpotlightSection };
export type { CollectionSpotlightSectionProps };
