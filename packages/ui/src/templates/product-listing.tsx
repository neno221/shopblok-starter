// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `product-listing` family's entry
// file: what `@shopblok/ui/templates/product-listing` reaches. It draws the member of the page's
// `variant` (the `templates` global's pick), each in its own file in `./product-listing/`
// (`default.tsx`, M3's, is the first), so a page passes the `variant` it read and nothing else
// changes. A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  ProductListingDefault,
  ListingResults,
  listingResultsCopy,
  productListingCopy,
  type ListingResultsCopy,
  type ListingResultsProps,
  type ProductListingCopy,
  type ProductListingTemplateProps,
} from "./product-listing/default";

const MEMBERS: Members<"product-listing", (props: ProductListingTemplateProps) => React.ReactNode> =
  {
    default: ProductListingDefault,
  };

function ProductListingTemplate(props: ProductListingTemplateProps) {
  const Member = pickVariant("product-listing", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { ProductListingTemplate, ListingResults, listingResultsCopy, productListingCopy };
export type {
  ListingResultsCopy,
  ListingResultsProps,
  ProductListingCopy,
  ProductListingTemplateProps,
};
