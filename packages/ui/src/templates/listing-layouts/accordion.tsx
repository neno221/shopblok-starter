// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `accordion` layout's results: the
// sidebar beside the products from `lg`, as M3's, with every group closed but the first and the chosen ones (native
// disclosures, FilterFields' `open="first"`, so they open without scripts); the chosen filters'
// chips above the grid at every width instead of in the sidebar. Below `lg`, FilterDrawer.
import { cn } from "@shopblok/ui/lib/utils";
import { FilterSidebar } from "@shopblok/ui/organisms/filter-sidebar";
import type { ListingResultsProps } from "../listing-results";
import { ResultsProducts, ResultsRoot } from "./parts";

function ListingResultsAccordion(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot
      layout="accordion"
      className={cn(filters !== undefined && "lg:grid-cols-[16rem_minmax(0,1fr)]", className)}
    >
      {filters === undefined ? null : (
        <div data-slot="listing-filters" className="min-w-0 max-lg:hidden">
          <FilterSidebar
            {...filters}
            copy={copy.sidebar}
            groupCopy={copy.group}
            chipsCopy={copy.chips}
            locale={locale}
            prefetch={prefetch}
            open="first"
            chips={false}
          />
        </div>
      )}
      <ResultsProducts results={props} drawer="below-lg" chips />
    </ResultsRoot>
  );
}
// The marker `first-load.ts` finds this module's chunk by (D102): the island loads it on its branch.
ListingResultsAccordion.displayName = "shopblok:listing-accordion";

export { ListingResultsAccordion };
