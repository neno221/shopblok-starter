// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `rail` layout's results: from `lg`
// a narrow rail of the groups' buttons stays beside the products as the page scrolls, each opening
// its values in a popover beside it (`PopoverFilters`, one GET form); the chosen filters' chips
// above the grid. Below `lg`, FilterDrawer.
import { cn } from "@shopblok/ui/lib/utils";
import type { ListingResultsProps } from "../listing-results";
import { PopoverFilters, ResultsProducts, ResultsRoot } from "./parts";

function ListingResultsRail(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot
      layout="rail"
      className={cn(filters !== undefined && "lg:grid-cols-[11rem_minmax(0,1fr)]", className)}
    >
      {filters === undefined ? null : (
        <div data-slot="listing-filters" className="min-w-0 max-lg:hidden">
          <PopoverFilters
            {...filters}
            copy={copy}
            locale={locale}
            prefetch={prefetch}
            orientation="rail"
            className="sticky top-4"
          />
        </div>
      )}
      <ResultsProducts results={props} drawer="below-lg" chips />
    </ResultsRoot>
  );
}
// The marker `first-load.ts` finds this module's chunk by (D102): the island loads it on its branch.
ListingResultsRail.displayName = "shopblok:listing-rail";

export { ListingResultsRail };
