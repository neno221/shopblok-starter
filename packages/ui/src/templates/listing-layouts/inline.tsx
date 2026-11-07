// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `inline` layout's results: the
// filters as one panel above the products, its groups in columns, opened and closed as one (a native
// disclosure, `InlineFilters`), then the chosen filters' chips, at every width; no sidebar and no
// drawer.
import type { ListingResultsProps } from "../listing-results";
import { InlineFilters, ResultsProducts, ResultsRoot } from "./parts";

function ListingResultsInline(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot layout="inline" className={className}>
      <ResultsProducts
        results={props}
        drawer="none"
        chips
        lead={
          filters === undefined ? undefined : (
            <InlineFilters
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
ListingResultsInline.displayName = "shopblok:listing-inline";

export { ListingResultsInline };
