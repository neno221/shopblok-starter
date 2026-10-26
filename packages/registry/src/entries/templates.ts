import {
  ErrorPage,
  NotFoundPage,
  ProductDetailPage,
  ProductListingPage,
  SearchResultsPage,
} from "../contracts";
import type { EntryInput } from "../types";

// SPEC §9.3's templates (D56): a page's `<main>`, drawn in the DS inside the classic header and the
// multi-column footer so the picture is a page. M3 builds them task by task (T48 to T54); M5's
// sections compose the home and the CMS pages from them.

const template = <const Slug extends string>(
  slug: Slug,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    id: `templates/${slug}`,
    group: "templates",
    kind: "template",
    label,
    component: { module: `@shopblok/ui/templates/${slug}`, name },
    contract,
  }) as const satisfies EntryInput;

export const templates = [
  // T48: the two the shell needs.
  template("not-found", "Not found", "NotFoundTemplate", NotFoundPage),
  template("error", "Error", "ErrorTemplate", ErrorPage),
  // T49: the product page.
  template("product-detail", "Product page", "ProductDetailTemplate", ProductDetailPage),
  // T50: the listing pages and the search page.
  template("product-listing", "Listing page", "ProductListingTemplate", ProductListingPage),
  template("search-results", "Search results", "SearchResultsTemplate", SearchResultsPage),
] as const satisfies readonly EntryInput[];
