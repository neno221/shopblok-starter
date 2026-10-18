import {
  AccountNav,
  AddressBook,
  AnnouncementBar,
  BuyBox,
  CartDrawer,
  CheckoutSteps,
  CompareTray,
  CookieConsent,
  FilterPanel,
  LoadingSkeleton,
  MarketSuggestion,
  MobileNav,
  MobileStickyATC,
  Navigation,
  OrderSummary,
  OrderTable,
  OrderTimeline,
  PaymentMethodsManager,
  PaymentStep,
  ProductCarousel,
  ProductGallery,
  ProductGrid,
  ProductInfo,
  ProductToolbar,
  QuickCart,
  ReturnRequest,
  ReviewsSection,
  SearchOverlay,
  SizeGuide,
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
  // T38: the product page.
  organism("product-gallery", "ProductGallery", "ProductGallery", ProductGallery),
  organism("buy-box", "BuyBox", "BuyBox", BuyBox),
  organism("mobile-sticky-atc", "MobileStickyATC", "MobileStickyATC", MobileStickyATC),
  organism(
    "product-info-accordions",
    "ProductInfoAccordions",
    "ProductInfoAccordions",
    ProductInfo,
  ),
  organism("reviews-section", "ReviewsSection", "ReviewsSection", ReviewsSection),
  // The quick view shows a buy box's data in a dialog, with the gallery beside it.
  organism("quick-view-dialog", "QuickViewDialog", "QuickViewDialog", BuyBox),
  organism("size-guide-dialog", "SizeGuideDialog", "SizeGuideDialog", SizeGuide),
  // T39: the cart, the checkout and the account.
  organism("cart-drawer", "CartDrawer", "CartDrawer", CartDrawer),
  organism("quick-cart-dropdown", "QuickCartDropdown", "QuickCartDropdown", QuickCart),
  organism("checkout-steps", "CheckoutSteps", "CheckoutSteps", CheckoutSteps),
  organism("payment-step", "PaymentStep", "PaymentStep", PaymentStep),
  organism("order-summary", "OrderSummary", "OrderSummary", OrderSummary),
  organism("account-nav", "AccountNav", "AccountNav", AccountNav),
  organism("order-timeline", "OrderTimeline", "OrderTimeline", OrderTimeline),
  organism("order-table", "OrderTable", "OrderTable", OrderTable),
  organism("address-book", "AddressBook", "AddressBook", AddressBook),
  organism(
    "payment-methods-manager",
    "PaymentMethodsManager",
    "PaymentMethodsManager",
    PaymentMethodsManager,
  ),
  organism("return-request-form", "ReturnRequestForm", "ReturnRequestForm", ReturnRequest),
] as const satisfies readonly EntryInput[];
