// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99). The `featuredProduct` block's entry file:
// this file is what `@shopblok/ui/sections/featured-product` reaches, and it draws the member of
// the block's `variant`, each in its own file in `./featured-product/` (`standard.tsx`, M4's, is
// the first). A value the family does not have draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { FeaturedProductGallery } from "./featured-product/gallery";
import { FeaturedProductOverlay } from "./featured-product/overlay";
import {
  FeaturedProductStandard,
  type FeaturedProductSectionProps,
} from "./featured-product/standard";

const MEMBERS: Members<
  "featured-product",
  (props: FeaturedProductSectionProps) => React.ReactNode
> = {
  standard: FeaturedProductStandard,
  overlay: FeaturedProductOverlay,
  gallery: FeaturedProductGallery,
};

function FeaturedProductSection(props: FeaturedProductSectionProps) {
  const Member = pickVariant("featured-product", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { FeaturedProductSection };
export type { FeaturedProductSectionProps };
