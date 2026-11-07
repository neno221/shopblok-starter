// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `chips` member: the listing page's frame (`parts.tsx`) with the `chips` filter layout's results
// (`listing-layouts/chips.tsx`, which the search page and the listing island draw too).
import { ListingResultsChips } from "../listing-layouts/chips";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingChips(props: ProductListingTemplateProps) {
  return <ProductListingFrame {...props} member="chips" Results={ListingResultsChips} />;
}

export { ProductListingChips };
