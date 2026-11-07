// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `top-bar` member: the listing page's frame (`parts.tsx`) with the `top-bar` filter layout's results
// (`listing-layouts/top-bar.tsx`, which the search page and the listing island draw too).
import { ListingResultsTopBar } from "../listing-layouts/top-bar";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingTopBar(props: ProductListingTemplateProps) {
  return (
    <ProductListingFrame
      {...props}
      member="top-bar"
      Results={ListingResultsTopBar}
    />
  );
}

export { ProductListingTopBar };
