// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `inline` member: the listing page's frame (`parts.tsx`) with the `inline` filter layout's results
// (`listing-layouts/inline.tsx`, which the search page and the listing island draw too).
import { ListingResultsInline } from "../listing-layouts/inline";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingInline(props: ProductListingTemplateProps) {
  return <ProductListingFrame {...props} member="inline" Results={ListingResultsInline} />;
}

export { ProductListingInline };
