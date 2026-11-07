// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `lookbook` member: the editor's large picture (a look, a room) with up to four of the source's
// products listed beside it from `lg` (under it on a phone and a tablet), each a row of
// ProductCard's horizontal look, so the products in the picture are a click away. No hotspots on
// the picture: those are v1.1's. The heading, the line and the link are above the list. The
// picture is the editor's, with its alternative text; the contract refuses the member without one.
// A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { ProductCardHorizontal } from "@shopblok/ui/molecules/product-card/horizontal";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { EmptyCollection, ProductCollectionIntro, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

/** The products listed beside the picture. */
const LOOKBOOK_PRODUCTS = 4;

function ProductCollectionLookbook(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, image, products, copy, locale, prefetch, className } =
    props;
  if (products.length === 0 || image === undefined)
    return <EmptyCollection {...props} variant="lookbook" />;
  return (
    <SectionFrame
      data-variant="lookbook"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12"
    >
      <Image
        src={image.src}
        alt={image.alt}
        ratio="portrait"
        radius="xl"
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="w-full"
        data-slot="product-collection-look"
      />
      <div className="flex min-w-0 flex-col gap-6">
        <ProductCollectionIntro heading={heading} intro={intro} />
        <ul
          aria-label={copy.products.grid.label}
          data-slot="product-grid"
          className="flex flex-col"
        >
          {products.slice(0, LOOKBOOK_PRODUCTS).map((product) => (
            <li
              key={product.id}
              data-slot="product-grid-item"
              className="min-w-0 border-b border-border py-4 first:pt-0"
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
      </div>
    </SectionFrame>
  );
}

export { ProductCollectionLookbook };
