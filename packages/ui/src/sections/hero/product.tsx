// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `product` member: the source's first product as the page's opening, its picture (the editor's,
// or the product's first) beside the editor's heading, the product's name and price in the
// market's currency, the line, the countdown and the way to the product's page, then the editor's
// links. The name is one level below the heading. The contract refuses it without a product; the
// source's other products are not drawn. A server component.
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { CountdownTimer } from "@shopblok/ui/molecules/countdown-timer";
import { PriceBlock } from "@shopblok/ui/molecules/price-block";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import NextLink from "next/link";
import type * as React from "react";
import { HeroEyebrow, HeroHeading, HeroSubheading, type HeroSectionProps } from "./parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function HeroProduct({
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
  const [product] = products;
  const picture = image ?? product?.images[0];
  const Name = headingLevel === 1 ? "h2" : "h3";
  return (
    <SectionFrame
      data-variant="product"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName={cn(
        "grid grid-cols-1 items-center gap-8",
        picture !== undefined && "md:grid-cols-2 md:gap-12",
      )}
    >
      {picture === undefined ? null : (
        <Image
          src={picture.src}
          alt={picture.alt}
          ratio="square"
          radius="xl"
          sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
          priority={headingLevel === 1}
          className="w-full"
          data-slot="hero-image"
        />
      )}
      <div className="flex min-w-0 flex-col items-start gap-4 md:gap-6">
        <HeroEyebrow>{eyebrow}</HeroEyebrow>
        <HeroHeading level={headingLevel}>{heading}</HeroHeading>
        {product === undefined ? null : (
          <div data-slot="hero-product" className="flex flex-col items-start gap-2">
            <Name
              data-slot="hero-product-name"
              className="text-xl font-semibold text-balance wrap-anywhere md:text-2xl"
            >
              {product.title}
            </Name>
            <PriceBlock
              price={product.price}
              copy={copy.products.priceBlock}
              locale={locale}
              size="lg"
            />
          </div>
        )}
        <HeroSubheading>{subheading}</HeroSubheading>
        {countdown === undefined ? null : (
          <CountdownTimer
            countdown={countdown}
            copy={copy.countdown}
            locale={locale}
            timeZone={timeZone}
            frozen={frozen}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          {product === undefined ? null : (
            <NextLink
              href={product.href as LinkHref}
              prefetch={prefetch}
              data-slot="hero-product-link"
              className={cn(buttonVariants({ size: "lg" }), "max-w-full wrap-anywhere")}
            >
              {copy.featuredProduct.view}
            </NextLink>
          )}
          <SectionLinks links={links} newTabLabel={copy.newTab} prefetch={prefetch} />
        </div>
      </div>
    </SectionFrame>
  );
}

export { HeroProduct };
