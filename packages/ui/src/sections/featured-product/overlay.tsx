// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The featured product's
// `overlay` member: the picture across the band (wide from `md`, its height fixed so the band reads
// as one), the product's name, its price, the editor's words and the way to its page on a card that
// lies over the picture's foot at the start. On a phone the card overlaps the picture's lower edge
// and runs on below it, so the words never sit on the photo: the card is the page's own surface,
// with the theme's contrast pairing. The picture is the editor's, or the product's first. A server
// component.
import { Image } from "@shopblok/ui/atoms/image";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { FeaturedProductDetails } from "./parts";
import type { FeaturedProductSectionProps } from "./standard";

function FeaturedProductOverlay({
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
  return (
    <SectionFrame
      data-variant="overlay"
      settings={settings}
      slot="featured-product-section"
      className={className}
      innerClassName="grid grid-cols-1"
    >
      <Image
        src={image.src}
        alt={image.alt}
        ratio="landscape"
        radius="xl"
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="w-full md:col-start-1 md:row-start-1 md:aspect-auto md:h-[34rem]"
        data-slot="featured-product-image"
      />
      <div
        data-slot="featured-product-card"
        className="relative z-10 mx-4 -mt-12 max-w-md min-w-0 rounded-xl border border-border bg-background p-6 text-foreground shadow-lg md:col-start-1 md:row-start-1 md:m-8 md:self-end md:justify-self-start"
      >
        <FeaturedProductDetails
          heading={heading}
          product={product}
          text={text}
          copy={copy}
          locale={locale}
          prefetch={prefetch}
        />
      </div>
    </SectionFrame>
  );
}

export { FeaturedProductOverlay };
