// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `compact` member: ProductCard's horizontal look (a narrow picture, the name and the price beside
// it) in two columns from `md`, one on a phone, a rule under each row, so many products fit in
// little height. A server component.
import { ProductCardHorizontal } from "@shopblok/ui/molecules/product-card/horizontal";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { EmptyCollection, ProductCollectionIntro, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

function ProductCollectionCompact(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, products, copy, locale, prefetch, className } = props;
  if (products.length === 0) return <EmptyCollection {...props} variant="compact" />;
  return (
    <SectionFrame
      data-variant="compact"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} />
      <ul
        aria-label={copy.products.grid.label}
        data-slot="product-grid"
        className="grid grid-cols-1 gap-x-8 md:grid-cols-2"
      >
        {products.map((product) => (
          <li
            key={product.id}
            data-slot="product-grid-item"
            className="min-w-0 border-b border-border py-4"
          >
            <ProductCardHorizontal
              product={product}
              copy={copy.products}
              locale={locale}
              sizes="96px"
              prefetch={prefetch}
            />
          </li>
        ))}
      </ul>
      <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
    </SectionFrame>
  );
}

export { ProductCollectionCompact };
