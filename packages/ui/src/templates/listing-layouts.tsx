// Ours (T84, SETUP.md "Listing variants (T84)"; D101). A listing's results in the filter layout the
// `templates` global picks (the `product-listing` family's value), for what draws them on the
// server: the listing page's members and the search page, which follows the listing's picker
// (D101: one picker for both, so a filter form posted from a listing lands on a page that looks
// like it). `default` is M3's `ListingResults`; a value the family does not have draws it too
// (`pickVariant`). The listing island, a client component, does not import this file: it loads a
// layout other than `default` on its branch (D102, `listing-layouts.tsx` in the storefront).
import type { VariantOf } from "@shopblok/registry/contracts";
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import { ListingResults, type ListingResultsProps } from "./listing-results";
import { ListingResultsAccordion } from "./listing-layouts/accordion";
import { ListingResultsChips } from "./listing-layouts/chips";
import { ListingResultsDrawer } from "./listing-layouts/drawer";
import { ListingResultsInline } from "./listing-layouts/inline";
import { ListingResultsRail } from "./listing-layouts/rail";
import { ListingResultsTopBar } from "./listing-layouts/top-bar";

const LAYOUTS: Members<"product-listing", (props: ListingResultsProps) => React.ReactNode> = {
  default: ListingResults,
  "top-bar": ListingResultsTopBar,
  drawer: ListingResultsDrawer,
  accordion: ListingResultsAccordion,
  chips: ListingResultsChips,
  rail: ListingResultsRail,
  inline: ListingResultsInline,
};

type ListingResultsForProps = ListingResultsProps & {
  /** The filter layout: the `templates` global's listing pick. */
  layout?: VariantOf<"product-listing">;
};

function ListingResultsFor({ layout, ...props }: ListingResultsForProps) {
  const Layout = pickVariant("product-listing", LAYOUTS, layout);
  return <Layout {...props} />;
}

export { ListingResultsFor };
export type { ListingResultsForProps };
