// Ours (T81, SETUP.md "Catalog block variants (T81)"; D99). What the product collection's members
// share: the heading and its line, the empty state (the editor's `message`), the link to the
// listing the products come from, and a list of standard cards in the listing's columns. The
// heading, the line and the empty state moved here from `standard.tsx` with their classes
// unchanged, so the first member's pixels are M4's. `CollectionCards` draws what ProductGrid draws
// for its standard card without ListingCard's ten looks, so the `tabs` island that also draws it
// (`tabs-panels.tsx`) loads one card's code, not ten. Server parts that the island can draw too.
import type { ProductCard } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { ProductCardStandard } from "@shopblok/ui/molecules/product-card/standard";
import { PRODUCT_GRID, PRODUCT_GRID_SIZES } from "../../organisms/product-grid-layout";
import type { SectionProductsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import { PackageOpenIcon } from "lucide-react";
import type { ProductCollectionSectionProps } from "./standard";

/** The heading and the line under it. */
function ProductCollectionIntro({
  heading,
  intro,
  headingId,
  className,
}: {
  heading: string;
  intro?: string;
  /** The heading's id, for a tab list or a list it names. */
  headingId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <SectionHeading id={headingId}>{heading}</SectionHeading>
      {intro === undefined ? null : (
        <p className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground">
          {intro}
        </p>
      )}
    </div>
  );
}

/** What the section says when its source has no product and the editor asked to say so. */
function ProductCollectionEmpty({
  empty,
  prefetch,
}: Pick<ProductCollectionSectionProps, "empty" | "prefetch">) {
  return empty === undefined ? null : (
    <EmptyState {...empty} icon={PackageOpenIcon} headingLevel={3} prefetch={prefetch} />
  );
}

/**
 * A member's section when its source has no product: the heading over the empty state, as the
 * first member draws it, with the member's own `data-variant` (the shop leaves the block out
 * instead when the editor chose to hide it).
 */
function EmptyCollection({
  variant,
  settings,
  heading,
  intro,
  empty,
  prefetch,
  className,
}: ProductCollectionSectionProps & { variant: string }) {
  return (
    <SectionFrame
      data-variant={variant}
      settings={settings}
      slot="product-collection-section"
      className={className}
      innerClassName="flex flex-col gap-6 md:gap-8"
    >
      <ProductCollectionIntro heading={heading} intro={intro} />
      <ProductCollectionEmpty empty={empty} prefetch={prefetch} />
    </SectionFrame>
  );
}

/** The link to the listing the products come from. */
function ProductCollectionLink({
  link,
  copy,
  prefetch,
}: Pick<ProductCollectionSectionProps, "link" | "copy" | "prefetch">) {
  return link === undefined ? null : (
    <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
  );
}

/** Standard cards in the listing's columns, as ProductGrid draws them: a list named "Products". */
function CollectionCards({
  products,
  copy,
  locale,
  prefetch,
  className,
}: {
  products: readonly ProductCard[];
  copy: SectionProductsCopy;
  locale: string;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <ul
      aria-label={copy.grid.label}
      data-slot="product-grid"
      data-state="products"
      data-layout="grid"
      className={cn("min-w-0", PRODUCT_GRID, className)}
    >
      {products.map((product) => (
        <li key={product.id} data-slot="product-grid-item" className="min-w-0">
          <ProductCardStandard
            product={product}
            copy={copy}
            locale={locale}
            sizes={PRODUCT_GRID_SIZES}
            prefetch={prefetch}
          />
        </li>
      ))}
    </ul>
  );
}

export {
  CollectionCards,
  EmptyCollection,
  ProductCollectionEmpty,
  ProductCollectionIntro,
  ProductCollectionLink,
};
