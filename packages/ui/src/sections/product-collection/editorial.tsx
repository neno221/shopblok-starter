// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `editorial` member: the heading, the line and the link in a column of their own beside a grid of
// two columns, from `lg`; the column stays in view while the grid scrolls past (sticky under the
// header). On a phone and a tablet the column is above the grid. The cards are ProductCard's
// standard look. A server component.
import { ProductCardStandard } from "@shopblok/ui/molecules/product-card/standard";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { EmptyCollection, ProductCollectionIntro, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

function ProductCollectionEditorial(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, products, copy, locale, prefetch, className } = props;
  if (products.length === 0) return <EmptyCollection {...props} variant="editorial" />;
  return (
    <SectionFrame
      data-variant="editorial"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12"
    >
      <div className="flex min-w-0 flex-col items-start gap-6 lg:sticky lg:top-24">
        <ProductCollectionIntro heading={heading} intro={intro} />
        <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
      </div>
      <ul
        aria-label={copy.products.grid.label}
        data-slot="product-grid"
        className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8"
      >
        {products.map((product) => (
          <li key={product.id} data-slot="product-grid-item" className="min-w-0">
            <ProductCardStandard
              product={product}
              copy={copy.products}
              locale={locale}
              sizes="(min-width: 1024px) 33vw, 50vw"
              prefetch={prefetch}
            />
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { ProductCollectionEditorial };
