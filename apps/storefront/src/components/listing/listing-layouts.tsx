// T84 (D102, SETUP.md "Listing variants (T84)"): the listing island's results in the `templates`
// global's filter layout. `default` (M3's `ListingResults`) is the island's own static import, as
// it was; each other layout is loaded on its branch, when the island first draws results in it
// (`React.lazy` in this client module, so its chunk is in no route's first load: `first-load.ts`'s
// `keptOut` rows check it), and a URL with filters waits for that chunk with the island's loading
// line. `React.lazy` rather than `next/dynamic`: the island renders in the browser only (its
// `useSearchParams` puts it under a `Suspense` with no fallback in the static shell), so there is
// nothing for `next/dynamic`'s server-side preload to do, and its runtime would cost the listings
// about 1.4 KB of a first load that had 2.7 KB left (T77's probe).
"use client";

import type { VariantOf } from "@shopblok/registry/contracts";
import {
  ListingResults,
  type ListingResultsProps,
} from "@shopblok/ui/templates/listing-results";
import { lazy, type ComponentType } from "react";

type Layout = VariantOf<"product-listing">;

const LAZY: {
  readonly [
    V in Exclude<Layout, "default">
  ]: ComponentType<ListingResultsProps>;
} = {
  "top-bar": lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/top-bar").then((m) => ({
      default: m.ListingResultsTopBar,
    })),
  ),
  drawer: lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/drawer").then((m) => ({
      default: m.ListingResultsDrawer,
    })),
  ),
  accordion: lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/accordion").then((m) => ({
      default: m.ListingResultsAccordion,
    })),
  ),
  chips: lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/chips").then((m) => ({
      default: m.ListingResultsChips,
    })),
  ),
  rail: lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/rail").then((m) => ({
      default: m.ListingResultsRail,
    })),
  ),
  inline: lazy(() =>
    import("@shopblok/ui/templates/listing-layouts/inline").then((m) => ({
      default: m.ListingResultsInline,
    })),
  ),
};

/** The component that draws `layout`'s results; one the island does not know draws `default`. */
export function resultsFor(
  layout: string | undefined,
): ComponentType<ListingResultsProps> {
  if (
    layout === undefined ||
    layout === "default" ||
    !Object.hasOwn(LAZY, layout)
  )
    return ListingResults;
  return LAZY[layout as Exclude<Layout, "default">];
}
