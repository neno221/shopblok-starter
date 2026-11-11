// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `featured-first` member: the source's first product as one large card, two columns wide and two
// rows high from `md`, then the others in the listing's columns around it (two across on a phone,
// where the large card takes the first row). The cards are ProductCard's standard look; the large
// one asks for a larger picture. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { ProductCardStandard } from "@shopblok/ui/molecules/product-card/standard";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { EmptyCollection, ProductCollectionIntro, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

function ProductCollectionFeaturedFirst(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, products, copy, locale, prefetch, className } = props;
  if (products.length === 0) return <EmptyCollection {...props} variant="featured-first" />;
  return (
    <SectionFrame
      data-variant="featured-first"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} />
      <ul
        aria-label={copy.products.grid.label}
        data-slot="product-grid"
        className="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4"
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            data-slot="product-grid-item"
            data-featured={index === 0 ? "" : undefined}
            className={cn("min-w-0", index === 0 && "col-span-2 md:row-span-2")}
          >
            <ProductCardStandard
              product={product}
              copy={copy.products}
              locale={locale}
              sizes={
                index === 0
                  ? "(min-width: 1024px) 50vw, (min-width: 768px) 66vw, 100vw"
                  : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              }
              prefetch={prefetch}
              // The small cards are half a phone wide: three lines keep the names apart (W7
              // review item 9).
              titleLines={index === 0 ? 2 : 3}
            />
          </li>
        ))}
      </ul>
      <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { ProductCollectionFeaturedFirst };
