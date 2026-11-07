// Ours (T81, SETUP.md "Catalog block variants (T81)"; D99). What the featured product's members
// share: the words beside the picture (the section's heading, the product's name, its price, the
// editor's words and the way to its page), moved here from `standard.tsx` with their classes
// unchanged, so the first member's pixels are M4's. The section's heading, when the editor wrote
// one, is the `<h2>` and the product's name an `<h3>` under it; without one the name is the `<h2>`.
// A server part.
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextLink from "next/link";
import type * as React from "react";
import type { FeaturedProductSectionProps } from "./standard";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function FeaturedProductDetails({
  heading,
  product,
  text,
  copy,
  locale,
  prefetch,
  className,
}: Pick<
  FeaturedProductSectionProps,
  "heading" | "product" | "text" | "copy" | "locale" | "prefetch"
> & { className?: string }) {
  const Name = heading === undefined ? "h2" : "h3";
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-4", className)}>
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
      <PriceBlock price={product.price} copy={copy.products.priceBlock} locale={locale} size="lg" />
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
  );
}

export { FeaturedProductDetails };
