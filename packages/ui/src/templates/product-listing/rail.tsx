// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `rail` member: the listing page's frame (`parts.tsx`) with the `rail` filter layout's results
// (`listing-layouts/rail.tsx`, which the search page and the listing island draw too).
import { ListingResultsRail } from "../listing-layouts/rail";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingRail(props: ProductListingTemplateProps) {
  return <ProductListingFrame {...props} member="rail" Results={ListingResultsRail} />;
}

export { ProductListingRail };
