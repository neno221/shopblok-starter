// Ours (T79, T83; SETUP.md "Variant plumbing (T79)", "Product page and quick view variants (T83)";
// D99, D101). The `product-detail` family's entry file: what `@shopblok/ui/templates/product-detail`
// reaches. It draws the member of the page's `variant` (the `templates` global's pick), each in its
// own file in `./product-detail/` (`default.tsx`, M3's, is the first; what they share is in
// `parts.tsx`), so a page passes the `variant` it read and nothing else changes. A value the family
// does not have draws the first (`pickVariant`). `GALLERY_LAYOUT[variant]` is how the member draws
// its gallery, which the page's gallery island follows.
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { ProductDetailCentered } from "./product-detail/centered";
import { ProductDetailDefault } from "./product-detail/default";
import { ProductDetailGrid } from "./product-detail/grid";
import {
  GALLERY_LAYOUT,
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  productDetailCopy,
  type GalleryLayout,
  type ProductDetailCopy,
  type ProductDetailIds,
  type ProductDetailTemplateProps,
} from "./product-detail/parts";
import { ProductDetailStacked } from "./product-detail/stacked";
import { ProductDetailThumbnailsBelow } from "./product-detail/thumbnails-below";
import { ProductDetailWide } from "./product-detail/wide";

const MEMBERS: Members<"product-detail", (props: ProductDetailTemplateProps) => React.ReactNode> = {
  default: ProductDetailDefault,
  "thumbnails-below": ProductDetailThumbnailsBelow,
  grid: ProductDetailGrid,
  stacked: ProductDetailStacked,
  wide: ProductDetailWide,
  centered: ProductDetailCentered,
};

function ProductDetailTemplate(props: ProductDetailTemplateProps) {
  const Member = pickVariant("product-detail", MEMBERS, props.variant);
  return <Member {...props} />;
}

/** How the page's variant draws its gallery; a value the family does not have, the first's. */
function galleryLayoutFor(variant: string | undefined): GalleryLayout {
  return pickVariant("product-detail", GALLERY_LAYOUT, variant);
}

export {
  ProductDetailTemplate,
  GALLERY_LAYOUT,
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  galleryLayoutFor,
  productDetailCopy,
};
export type { GalleryLayout, ProductDetailCopy, ProductDetailIds, ProductDetailTemplateProps };
