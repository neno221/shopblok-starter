// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `productCollection` block's entry file:
// this file is what `@shopblok/ui/sections/product-collection` reaches, and it draws the member of
// the block's `variant`, each in its own file in `./product-collection/` (`standard.tsx`, M4's, is
// the first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  ProductCollectionStandard,
  type ProductCollectionSectionProps,
} from "./product-collection/standard";

const MEMBERS: Members<
  "product-collection",
  (props: ProductCollectionSectionProps) => React.ReactNode
> = {
  standard: ProductCollectionStandard,
};

function ProductCollectionSection(props: ProductCollectionSectionProps) {
  const Member = pickVariant("product-collection", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { ProductCollectionSection };
export type { ProductCollectionSectionProps };
