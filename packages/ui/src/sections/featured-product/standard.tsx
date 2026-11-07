// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `featuredProduct`). One product, large: the
// editor's picture (or the product's first) beside the product's name, its price in the market's
// currency, the editor's words and the way to its page. The section's heading, when the editor
// wrote one ("Product of the month"), is the `<h2>` and the product's name an `<h3>` under it;
// without one the name is the `<h2>`. The name, the price and the stock are Medusa's, read in the
// market's region and language; the words and the picture are Payload's. A server component.
import type { FeaturedProductSection as FeaturedProductSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { FeaturedProductDetails } from "./parts";

type FeaturedProductSectionProps = FeaturedProductSectionData & {
  copy: Pick<SectionsCopy, "products" | "featuredProduct">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function FeaturedProductStandard({
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
      data-variant="standard"
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
      <FeaturedProductDetails
        heading={heading}
        product={product}
        text={text}
        copy={copy}
        locale={locale}
        prefetch={prefetch}
      />
    </SectionFrame>
  );
}

export { FeaturedProductStandard };
export type { FeaturedProductSectionProps };
