// T84 (D102, SETUP.md "Listing variants (T84)"): the listing island's results in the `templates`
// global's filter layout. `default` (M3's `ListingResults`) is the island's own static import, as
// it was; each other layout is loaded on its branch, when the island first draws results in it
// (`React.lazy` in this client module, so its chunk is in no route's first load: `first-load.ts`'s
// `keptOut` rows check it), and a URL with filters waits for that chunk with the island's loading
// line. `React.lazy` rather than `next/dynamic`: the island renders in the browser only (its
// `useSearchParams` puts it under a `Suspense` with no fallback in the static shell), so there is
// nothing for `next/dynamic`'s server-side preload to do, and its runtime would cost the listings
// about 1.4 KB of a first load that had 2.7 KB left (T77's probe). A layout's chunk that does not
// load (a deploy took the old build's files away, the visitor went offline) draws `default`'s
// results instead (`LayoutBoundary`), not the route's error page: `React.lazy` keeps a rejected
// import, so a retry could not load it either, and the default layout is the island's own code.
"use client";

import type { VariantOf } from "@shopblok/registry/contracts";
import { ListingResults, type ListingResultsProps } from "@shopblok/ui/templates/listing-results";
import { Component, lazy, type ComponentType, type ReactNode } from "react";

type Layout = VariantOf<"product-listing">;

const LAZY: { readonly [V in Exclude<Layout, "default">]: ComponentType<ListingResultsProps> } = {
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

const isLazy = (layout: string | undefined): layout is keyof typeof LAZY =>
  layout !== undefined && Object.hasOwn(LAZY, layout);

/** Draws `fallback` instead of its children once one of them throws (a layout that cannot load). */
class LayoutBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * `layout`'s results; a layout the island does not know (or none) draws `default`'s, and so does a
 * layout whose code does not load.
 */
export function LayoutResults({
  layout,
  ...props
}: ListingResultsProps & { layout: string | undefined }) {
  if (!isLazy(layout)) return <ListingResults {...props} />;
  const Results = LAZY[layout];
  return (
    <LayoutBoundary key={layout} fallback={<ListingResults {...props} />}>
      <Results {...props} />
    </LayoutBoundary>
  );
}
