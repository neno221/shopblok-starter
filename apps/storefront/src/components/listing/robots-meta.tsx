// SPEC §12: a listing with more than two facets chosen is `noindex,follow`. React hoists a `<meta>`
// drawn anywhere into the `<head>`, so the listing island draws this beside its results; the
// server's listing pages never need it, because their URLs have no filter.
import { filterCount, NOINDEX_ABOVE, type ListingFilters } from "../../lib/listing/query";

export function RobotsMeta({ filters }: { filters: ListingFilters }) {
  return filterCount(filters) > NOINDEX_ABOVE ? (
    <meta name="robots" content="noindex,follow" />
  ) : null;
}
