// Ours (T50, SETUP.md "Listing pages and search (T50)"; D57, D59, SPEC §8.4, §12). The
// `product-listing` family's first member, M3's listing page: the frame (`parts.tsx`) with the
// filters beside the products from `lg` and in a drawer below it (`ListingResults`,
// `listing-results.tsx`, which the search page and the shop's listing island draw too).
import {
  ListingResults,
  listingResultsCopy,
  type ListingResultsCopy,
  type ListingResultsProps,
} from "../listing-results";
import {
  ProductListingFrame,
  productListingCopy,
  type ProductListingCopy,
  type ProductListingTemplateProps,
} from "./parts";

function ProductListingDefault(props: ProductListingTemplateProps) {
  return (
    <ProductListingFrame {...props} member="default" Results={ListingResults} />
  );
}

export {
  ListingResults,
  listingResultsCopy,
  ProductListingDefault,
  productListingCopy,
};
export type {
  ListingResultsCopy,
  ListingResultsProps,
  ProductListingCopy,
  ProductListingTemplateProps,
};
