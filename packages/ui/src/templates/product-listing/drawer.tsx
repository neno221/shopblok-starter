// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `drawer` member: the listing page's frame (`parts.tsx`) with the `drawer` filter layout's results
// (`listing-layouts/drawer.tsx`, which the search page and the listing island draw too).
import { ListingResultsDrawer } from "../listing-layouts/drawer";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingDrawer(props: ProductListingTemplateProps) {
  return (
    <ProductListingFrame
      {...props}
      member="drawer"
      Results={ListingResultsDrawer}
    />
  );
}

export { ProductListingDrawer };
