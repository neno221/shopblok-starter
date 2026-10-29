// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `featuredProduct`). One product, large: the
// editor's picture (or the product's first) beside the product's name, its price in the market's
// currency, the editor's words and the way to its page. The section's heading, when the editor
// wrote one ("Product of the month"), is the `<h2>` and the product's name an `<h3>` under it;
// without one the name is the `<h2>`. The name, the price and the stock are Medusa's, read in the
// market's region and language; the words and the picture are Payload's. A server component.
import type { FeaturedProductSection as FeaturedProductSectionData } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FeaturedProductSectionProps = FeaturedProductSectionData & {
  copy: Pick<SectionsCopy, "products" | "featuredProduct">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function FeaturedProductSection({
  settings,
  heading,
  product,
  image,
  text,
  copy,
  locale,
  prefetch,
  className,
}: FeaturedProductSectionProps) {
  const Name = heading === undefined ? "h2" : "h3";
  return (
    <SectionFrame
      settings={settings}
      slot="featured-product-section"
      className={className}
      innerClassName="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
    >
      <Image
        src={image.src}
        alt={image.alt}
        ratio="square"
        radius="xl"
        sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
        className="w-full"
      />
      <div className="flex min-w-0 flex-col items-start gap-4">
        {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
        <Name
          data-slot="featured-product-name"
          className={cn(
            "font-semibold text-balance wrap-anywhere",
            heading === undefined ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
          )}
        >
          {product.title}
        </Name>
        <PriceBlock
          price={product.price}
          copy={copy.products.priceBlock}
          locale={locale}
          size="lg"
        />
        {text === undefined ? null : (
          <div className="flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere text-muted-foreground">
            {text.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
        <NextLink
          href={product.href as LinkHref}
          prefetch={prefetch}
          data-slot="featured-product-link"
          className={cn(buttonVariants({ size: "lg" }), "max-w-full wrap-anywhere")}
        >
          {copy.featuredProduct.view}
        </NextLink>
      </div>
    </SectionFrame>
  );
}

export { FeaturedProductSection };
export type { FeaturedProductSectionProps };
