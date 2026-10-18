import {
  AnnouncementBar,
  CompareTray,
  CookieConsent,
  FilterPanel,
  LoadingSkeleton,
  MarketSuggestion,
  MobileNav,
  Navigation,
  ProductCarousel,
  ProductGrid,
  ProductToolbar,
  SearchOverlay,
} from "../contracts";
import type { z } from "zod";
import type { EntryInput } from "../types";

// SPEC §9.3's organisms, in the navigation's order, each task's after the last (M2 plan, T35 to
// T39). Each is one component with its states, at `@shopblok/ui/organisms/{slug}`, and shows its
// contract. The headers and footers are organisms too, in a group of their own
// (`headers-footers.ts`).

/** An organism that is one component, with its states, at `@shopblok/ui/organisms/{slug}`. */
const organism = <const Slug extends string>(
  slug: Slug,
  label: string,
  name: string,
  contract: z.ZodType,
) =>
  ({
    id: `organisms/${slug}`,
    group: "organisms",
    kind: "organism",
    label,
    component: { module: `@shopblok/ui/organisms/${slug}`, name },
    contract,
  }) as const satisfies EntryInput;

export const organisms = [
  // T35: navigation.
  organism("announcement-bar", "AnnouncementBar", "AnnouncementBar", AnnouncementBar),
  organism("mega-menu", "MegaMenu", "MegaMenu", Navigation),
  organism("mobile-nav-drawer", "MobileNavDrawer", "MobileNavDrawer", MobileNav),
  organism(
    "market-suggestion-banner",
    "MarketSuggestionBanner",
    "MarketSuggestionBanner",
    MarketSuggestion,
  ),
  // T36: the site's organisms (the footers are in `headers-footers.ts`).
  organism("cookie-consent", "CookieConsent", "CookieConsent", CookieConsent),
  organism("loading-skeletons", "Loading skeletons", "LoadingSkeleton", LoadingSkeleton),
  // T37: the listing.
  organism("search-overlay", "SearchOverlay", "SearchOverlay", SearchOverlay),
  organism("filter-sidebar", "FilterSidebar", "FilterSidebar", FilterPanel),
  organism("filter-drawer", "FilterDrawer", "FilterDrawer", FilterPanel),
  organism("product-toolbar", "ProductToolbar", "ProductToolbar", ProductToolbar),
  organism("product-grid", "ProductGrid", "ProductGrid", ProductGrid),
  organism("product-carousel", "ProductCarousel", "ProductCarousel", ProductCarousel),
  organism("compare-tray", "CompareTray", "CompareTray", CompareTray),
] as const satisfies readonly EntryInput[];
