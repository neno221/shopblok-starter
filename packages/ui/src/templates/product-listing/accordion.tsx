// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a, D99). The `product-listing` family's
// `accordion` member: the listing page's frame (`parts.tsx`) with the `accordion` filter layout's results
// (`listing-layouts/accordion.tsx`, which the search page and the listing island draw too).
import { ListingResultsAccordion } from "../listing-layouts/accordion";
import { ProductListingFrame, type ProductListingTemplateProps } from "./parts";

function ProductListingAccordion(props: ProductListingTemplateProps) {
  return (
    <ProductListingFrame
      {...props}
      member="accordion"
      Results={ListingResultsAccordion}
    />
  );
}

export { ProductListingAccordion };
