// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D100). The product collection's
// `with-banner` member: the editor's picture takes the grid's first cells (half the width and the
// height of two rows from `lg`, the width of the section above the cards on a phone and a tablet),
// with the line and the link over it on the `overlay` scrim (D100's rule for text on a picture);
// the cards fill the cells beside and after it, two across. The heading stays above, the `<h2>` the
// cards' names are under. The picture is the editor's, with its alternative text; the contract
// refuses the member without one. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { overlayTokens } from "../overlay-tokens";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import { EmptyCollection, ProductCollectionLink } from "./parts";
import type { ProductCollectionSectionProps } from "./standard";

function ProductCollectionWithBanner(props: ProductCollectionSectionProps) {
  const { settings, heading, intro, link, image, products, copy, locale, prefetch, className } =
    props;
  if (products.length === 0 || image === undefined)
    return <EmptyCollection {...props} variant="with-banner" />;
  return (
    <SectionFrame
      data-variant="with-banner"
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <SectionHeading>{heading}</SectionHeading>
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-8">
        <div
          data-slot="product-collection-banner"
          className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-xl bg-muted md:min-h-96"
        >
          <Image
            src={image.src}
            alt={image.alt}
            radius="none"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 -z-10 aspect-auto h-full"
          />
          {intro === undefined && link === undefined ? null : (
            <div
              className={cn(
                "m-4 flex max-w-md min-w-0 flex-col items-start gap-4 rounded-xl bg-overlay p-5 md:m-6 md:p-6",
                overlayTokens,
              )}
            >
              {intro === undefined ? null : (
                <p className="text-base text-pretty wrap-anywhere md:text-lg">{intro}</p>
              )}
              <ProductCollectionLink link={link} copy={copy} prefetch={prefetch} />
            </div>
          )}
        </div>
        <ProductGrid
          products={products}
          variant="standard"
          layout="grid"
          // Never drawn: the grid has products.
          empty={{ title: heading }}
          copy={copy.products}
          locale={locale}
          prefetch={prefetch}
          // Two across beside the picture: the listing's columns would be four half-width ones.
          className="md:grid-cols-2 lg:grid-cols-2"
        />
      </div>
    </SectionFrame>
  );
}

export { ProductCollectionWithBanner };
