// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `product-detail` family's entry
// file: what `@shopblok/ui/templates/product-detail` reaches. It draws the member of the page's
// `variant` (the `templates` global's pick), each in its own file in `./product-detail/`
// (`default.tsx`, M3's, is the first), so a page passes the `variant` it read and nothing else
// changes. A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  ProductDetailDefault,
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  productDetailCopy,
  type ProductDetailCopy,
  type ProductDetailIds,
  type ProductDetailTemplateProps,
} from "./product-detail/default";

const MEMBERS: Members<"product-detail", (props: ProductDetailTemplateProps) => React.ReactNode> = {
  default: ProductDetailDefault,
};

function ProductDetailTemplate(props: ProductDetailTemplateProps) {
  const Member = pickVariant("product-detail", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { ProductDetailTemplate, GALLERY_SIZES, PRODUCT_DETAIL_IDS, productDetailCopy };
export type { ProductDetailCopy, ProductDetailIds, ProductDetailTemplateProps };
