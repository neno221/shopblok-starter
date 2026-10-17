import {
  AccordionSection,
  ActiveFilters,
  Breadcrumbs,
  Countdown,
  DiscountCode,
  EmptyStateContent,
  FacetGroup,
  MarketChoice,
  MediaFigure,
  NewsletterSignup,
  PageState,
  PriceSummary,
  ProductCard,
  RatingSummary,
  Review,
  SearchQuery,
  SortState,
  ToastMessage,
  VariantChoice,
} from "../contracts";
import type { z } from "zod";
import type { EntryInput } from "../types";

// SPEC §9.3's molecules, in the navigation's order, each task's after the last (M2 plan, T32 to
// T34). ProductCard is a family of ten variants (D46), each its own entry and DS page, with the
// value a shop picks in Payload (M4) as `variant`; the others are one component with its states.
// Each renders the export of `@shopblok/ui/molecules/…` that it names, and shows its contract.

const productCard = <const Variant extends string, const Label extends string>(
  variant: Variant,
  label: Label,
  name: string,
) =>
  ({
    id: `molecules/product-card-${variant}`,
    group: "molecules",
    kind: "molecule",
    label: `ProductCard · ${label}`,
    component: { module: `@shopblok/ui/molecules/product-card/${variant}`, name },
    family: "product-card",
    variant,
    contract: ProductCard,
  }) as const satisfies EntryInput;

/** A molecule that is one component, with its states, at `@shopblok/ui/molecules/{slug}`. */
const molecule = <const Slug extends string>(
  slug: Slug,
  label: string,
  name: string,
  contract: z.ZodType,
) =>
  ({
    id: `molecules/${slug}`,
    group: "molecules",
    kind: "molecule",
    label,
    component: { module: `@shopblok/ui/molecules/${slug}`, name },
    contract,
  }) as const satisfies EntryInput;

export const molecules = [
  // T32: the product molecules.
  {
    id: "molecules/price-block",
    group: "molecules",
    kind: "molecule",
    label: "PriceBlock",
    component: { module: "@shopblok/ui/molecules/price-block", name: "PriceBlock" },
    contract: PriceSummary,
  },
  productCard("standard", "Standard", "ProductCardStandard"),
  productCard("swatches", "Swatches", "ProductCardSwatches"),
  productCard("quick-add", "Quick add", "ProductCardQuickAdd"),
  productCard("overlay", "Overlay", "ProductCardOverlay"),
  productCard("minimal", "Minimal", "ProductCardMinimal"),
  productCard("horizontal", "Horizontal", "ProductCardHorizontal"),
  productCard("compact", "Compact", "ProductCardCompact"),
  productCard("editorial", "Editorial", "ProductCardEditorial"),
  productCard("bordered", "Bordered", "ProductCardBordered"),
  productCard("image-swap", "Image swap", "ProductCardImageSwap"),
  {
    id: "molecules/variant-selector",
    group: "molecules",
    kind: "molecule",
    label: "VariantSelector",
    component: { module: "@shopblok/ui/molecules/variant-selector", name: "VariantSelector" },
    contract: VariantChoice,
  },
  {
    id: "molecules/rating-summary",
    group: "molecules",
    kind: "molecule",
    label: "RatingSummary",
    component: { module: "@shopblok/ui/molecules/rating-summary", name: "RatingSummary" },
    contract: RatingSummary,
  },
  {
    id: "molecules/review-item",
    group: "molecules",
    kind: "molecule",
    label: "ReviewItem",
    component: { module: "@shopblok/ui/molecules/review-item", name: "ReviewItem" },
    contract: Review,
  },
  {
    id: "molecules/media-figure",
    group: "molecules",
    kind: "molecule",
    label: "MediaFigure",
    component: { module: "@shopblok/ui/molecules/media-figure", name: "MediaFigure" },
    contract: MediaFigure,
  },
  // T33: discovery and the site-wide molecules.
  molecule("search-field", "SearchField", "SearchField", SearchQuery),
  molecule("breadcrumbs", "Breadcrumbs", "Breadcrumbs", Breadcrumbs),
  molecule("pagination", "Pagination", "Pagination", PageState),
  molecule("sort-select", "SortSelect", "SortSelect", SortState),
  molecule("filter-group", "FilterGroup", "FilterGroup", FacetGroup),
  molecule("active-filter-chips", "ActiveFilterChips", "ActiveFilterChips", ActiveFilters),
  molecule("empty-state", "EmptyState", "EmptyState", EmptyStateContent),
  molecule("market-switcher", "MarketSwitcher", "MarketSwitcher", MarketChoice),
  molecule("newsletter-form", "NewsletterForm", "NewsletterForm", NewsletterSignup),
  molecule("accordion-item", "AccordionItem", "AccordionItem", AccordionSection),
  molecule("toast", "Toast", "Toast", ToastMessage),
  molecule("copy-code-chip", "CopyCodeChip", "CopyCodeChip", DiscountCode),
  molecule("countdown-timer", "CountdownTimer", "CountdownTimer", Countdown),
] as const satisfies readonly EntryInput[];
