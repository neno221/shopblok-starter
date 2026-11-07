// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `chips` layout's results, for a
// shop with few filters: each group's values as toggles in a row above the products
// (`ToggleFilters`, one GET form), then the chosen filters' chips, at every width; no sidebar and
// no drawer.
import type { ListingResultsProps } from "../listing-results";
import { ResultsProducts, ResultsRoot, ToggleFilters } from "./parts";

function ListingResultsChips(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot layout="chips" className={className}>
      <ResultsProducts
        results={props}
        drawer="none"
        chips
        lead={
          filters === undefined ? undefined : (
            <ToggleFilters
              {...filters}
              copy={copy}
              locale={locale}
              prefetch={prefetch}
            />
          )
        }
      />
    </ResultsRoot>
  );
}
// The marker `first-load.ts` finds this module's chunk by (D102): the island loads it on its branch.
ListingResultsChips.displayName = "shopblok:listing-chips";

export { ListingResultsChips };
