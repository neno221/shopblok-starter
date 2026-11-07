// Ours (T84, SETUP.md "Listing variants (T84)"; M5 plan §1a). The `drawer` layout's results: no
// sidebar, the grid takes the page, and the toolbar's "Filters" opens FilterDrawer at every width,
// the chosen filters' chips above the grid. The drawer's sheet needs scripts to open, so without
// them the same form is drawn in the page instead (`<noscript>`): the layout still filters through
// `/search` (D59, D100), and a page with scripts never draws it.
import { FilterSidebar } from "@shopblok/ui/organisms/filter-sidebar";
import type { ListingResultsProps } from "../listing-results";
import { ResultsProducts, ResultsRoot } from "./parts";

function ListingResultsDrawer(props: ListingResultsProps) {
  const { filters, copy, locale, prefetch, className } = props;
  return (
    <ResultsRoot layout="drawer" className={className}>
      <ResultsProducts
        results={props}
        drawer="always"
        chips
        lead={
          filters === undefined ? undefined : (
            <noscript>
              <FilterSidebar
                {...filters}
                copy={copy.sidebar}
                groupCopy={copy.group}
                chipsCopy={copy.chips}
                locale={locale}
                prefetch={prefetch}
                chips={false}
                className="rounded-lg border p-4"
              />
            </noscript>
          )
        }
      />
    </ResultsRoot>
  );
}
// The marker `first-load.ts` finds this module's chunk by (D102): the island loads it on its branch.
ListingResultsDrawer.displayName = "shopblok:listing-drawer";

export { ListingResultsDrawer };
