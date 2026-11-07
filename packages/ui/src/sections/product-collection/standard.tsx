// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `productCollection`). Products from a
// `productSource`, resolved in the market's region (prices in its currency), as a grid
// (ProductGrid's columns) or a row that scrolls (ProductCarousel), with the editor's heading, a
// line and a link to the listing they come from. When the source has no product and the editor
// asked to say so, the heading stands over EmptyState with the catalog's words and the way to every
// product; when the editor asked to hide it, the storefront leaves the block out. A server
// component; the carousel's primitive is the only island.
import type { ProductCollectionSection as ProductCollectionSectionData } from "@shopblok/registry/contracts";
import { ProductCarousel } from "@shopblok/ui/organisms/product-carousel";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { ProductCollectionEmpty, ProductCollectionIntro, ProductCollectionLink } from "./parts";

type ProductCollectionSectionProps = ProductCollectionSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "products" | "productCollection" | "tabs">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function ProductCollectionStandard({
  settings,
  heading,
  intro,
  link,
  display,
  products,
  empty,
  copy,
  locale,
  prefetch,
  className,
}: ProductCollectionSectionProps) {
  if (display === "carousel" && products.length > 0)
    return (
      <SectionFrame
        data-variant="standard"
        settings={settings}
        slot="product-collection-section"
        data-display="carousel"
        className={className}
      >
        <ProductCarousel
          title={heading}
          intro={intro}
          products={products}
          variant="standard"
          viewAll={link === undefined ? undefined : { label: link.label, href: link.href }}
          copy={copy.products}
          locale={locale}
          prefetch={prefetch}
        />
      </SectionFrame>
    );
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="product-collection-section"
      data-display={display}
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} />
      {products.length === 0 ? (
        <ProductCollectionEmpty empty={empty} prefetch={prefetch} />
      ) : (
        <>
          <ProductGrid
            products={products}
            variant="standard"
            layout="grid"
            // Never drawn: the grid has products.
            empty={{ title: heading }}
            copy={copy.products}
            locale={locale}
            prefetch={prefetch}
          />
          <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
        </>
      )}
    </SectionFrame>
  );
}

export { ProductCollectionStandard };
export type { ProductCollectionSectionProps };
