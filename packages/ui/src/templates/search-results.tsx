// Ours (T50, SETUP.md "Listing pages and search (T50)"; D59, SPEC §8.1, §8.4). The search page's
// `<main>`: the search field with the query, a heading that says what was searched, then the
// results, the same `ListingResults` as a listing page's. The page is dynamic and reads every filter
// and sort on the server, so there is no island here: it is also where a listing's filter form lands
// without JavaScript (D59). The field is a GET form of its own (`q`), so a new query starts without
// the filters of the last one.
import type { Messages } from "@shopblok/i18n";
import type { SearchResultsPage } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { SearchField } from "@shopblok/ui/molecules/search-field";
import { ListingResults, listingResultsCopy, type ListingResultsCopy } from "./product-listing";

type SearchResultsCopy = {
  field: Messages["molecules"]["searchField"];
  results: ListingResultsCopy;
};

/** The search page's words from a whole catalog. */
function searchResultsCopy(messages: Messages): SearchResultsCopy {
  return { field: messages.molecules.searchField, results: listingResultsCopy(messages) };
}

type SearchResultsTemplateProps = SearchResultsPage & {
  copy: SearchResultsCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The address of a page of these results (`?page=2`, with the query and filters). */
  hrefFor: (page: number) => string;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function SearchResultsTemplate({
  search,
  title,
  results,
  copy,
  locale,
  hrefFor,
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: SearchResultsTemplateProps) {
  return (
    <Root
      id={mainId}
      data-slot="search-results-template"
      data-variant="default"
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-8 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <SearchField {...search} copy={copy.field} className="max-w-xl" />
        <h1
          data-slot="search-results-title"
          className="text-2xl leading-tight font-semibold wrap-anywhere md:text-3xl"
        >
          {title}
        </h1>
      </div>
      <ListingResults
        {...results}
        copy={copy.results}
        locale={locale}
        hrefFor={hrefFor}
        prefetch={prefetch}
      />
    </Root>
  );
}

export { SearchResultsTemplate, searchResultsCopy };
export type { SearchResultsCopy, SearchResultsTemplateProps };
