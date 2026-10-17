import type { ActiveFilter, ActiveFilters, FacetGroup } from "@shopblok/registry/contracts";
import type { Context } from "../context";

// The filters `buildFacets` has chosen, as the chips above a listing (T33, ActiveFilterChips). The
// listing is the market's `/store` page, and a filter is in its URL the way a GET form sends it: a
// checkbox or swatch option adds `{facet}={value}` (a facet with two chosen values repeats the
// name), a price range `{facet}.min` and `{facet}.max`, and an on/off filter `{facet}=1`. So the
// link that removes a chip is the page with every other chosen value, and "clear all" is the page
// with none; built from the facets' `selected`, they cannot drift from what the sidebar shows.

type Param = [name: string, value: string];

/** The URL of the listing with these query parameters. */
function listingWith(listing: string, params: Param[]): string {
  return params.length === 0 ? listing : `${listing}?${new URLSearchParams(params).toString()}`;
}

export function buildActiveFilters(ctx: Context, facets: FacetGroup[]): ActiveFilters {
  const listing = ctx.href("/store");
  // Each chosen value, in the facets' order, with the parameters it adds to the URL.
  const chosen: { filter: Omit<ActiveFilter, "removeHref">; params: Param[] }[] = [];
  for (const facet of facets) {
    if (facet.kind === "checkbox" || facet.kind === "swatch") {
      for (const option of facet.options) {
        if (!option.selected) continue;
        chosen.push({
          filter: { id: `${facet.id}:${option.value}`, group: facet.label, label: option.label },
          params: [[facet.id, option.value]],
        });
      }
    } else if (facet.kind === "range") {
      const { selected } = facet;
      if (selected === undefined) continue;
      chosen.push({
        filter: {
          id: facet.id,
          group: facet.label,
          label: ctx.copy.activeFilters.priceRange(selected.min, selected.max),
        },
        params: [
          [`${facet.id}.min`, String(selected.min)],
          [`${facet.id}.max`, String(selected.max)],
        ],
      });
    } else if (facet.selected) {
      // An on/off filter has no group: its label ("In stock") says it all.
      chosen.push({ filter: { id: facet.id, label: facet.label }, params: [[facet.id, "1"]] });
    }
  }
  return {
    filters: chosen.map(({ filter }, index) => ({
      ...filter,
      removeHref: listingWith(
        listing,
        chosen.flatMap(({ params }, other) => (other === index ? [] : params)),
      ),
    })),
    clearHref: listing,
  };
}
