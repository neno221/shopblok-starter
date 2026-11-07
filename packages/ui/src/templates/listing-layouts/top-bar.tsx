// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `top-bar` layout's results: from
// `lg` each filter group is a popover in a bar above the products, the chosen filters' chips under
// it; below `lg` the toolbar's button opens FilterDrawer, as M3's layout does. The bar is one GET
// form (`PopoverFilters`), so it works without scripts and the island reads it unchanged (D59).
import type { ListingResultsProps } from "../listing-results";
import { PopoverFilters, ResultsProducts, ResultsRoot } from "./parts";

function ListingResultsTopBar(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot layout="top-bar" className={className}>
      <ResultsProducts
        results={props}
        drawer="below-lg"
        chips
        lead={
          filters === undefined ? undefined : (
            <PopoverFilters
              {...filters}
              copy={copy}
              locale={locale}
              prefetch={prefetch}
              orientation="bar"
              className="max-lg:hidden"
            />
          )
        }
      />
    </ResultsRoot>
  );
}
// The marker `first-load.ts` finds this module's chunk by (D102): the island loads it on its branch.
ListingResultsTopBar.displayName = "shopblok:listing-top-bar";

export { ListingResultsTopBar };
