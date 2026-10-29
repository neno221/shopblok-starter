import { z } from "zod";
import { Address, AddressFormState } from "./address";
import { Cart } from "./cart";
import { CheckoutSteps, OrderSummary, PaymentStep } from "./cart-checkout-account";
import { Href, Id, Link } from "./content";
import { Image } from "./image";
import { Breadcrumbs, PageState, SearchQuery } from "./listing";
import { FilterPanel, ProductCarousel, ProductGrid, ProductToolbar } from "./listing-organisms";
import { ShippingOption } from "./shipping";
import { Order } from "./order";
import {
  BuyBox,
  MobileStickyATC,
  ProductGallery,
  ProductInfo,
  ReviewsSection,
} from "./product-page";

// The templates' contracts (D56, SPEC §9.3): what a page's template shows, besides the header and
// the footer, which the layout draws. A template's copy is the catalog's `templates` (D43); what
// only the page knows (a retry, a form's action) is a slot or a prop of its own.

/** The 404 page (`not-found`): somewhere to go from a page that does not exist. */
export const NotFoundPage = z.object({
  homeHref: Href,
  searchHref: Href.optional().describe("The search page, when the shop has one"),
});

/**
 * A CMS page (`cms-page`, T65, D80): its title and, for a page with parents, the breadcrumbs; its
 * blocks are the sections the shop draws under them. `heading` says who has the page's `<h1>`.
 */
export const CmsPage = z.object({
  title: z.string().min(1),
  breadcrumbs: Breadcrumbs.optional().describe("A page with parents: Home, the parents, the page"),
  heading: z
    .enum(["title", "hero"])
    .describe(
      "`title`: the template draws the title; `hero`: the first block, a hero, has the `<h1>`",
    ),
});

/** The error page (`error`): it says nothing about the error, only what the visitor can do. */
export const ErrorPage = z.object({ homeHref: Href });

/**
 * The product page (`product-detail`, T49, D61): the breadcrumbs, the gallery, the buy box and the
 * sticky bar for the default choice, the information, the reviews and the related products. A shop
 * draws the buy box, the sticky bar and the gallery through its islands (the chosen variant is in
 * the URL); the template draws them from these values where the page gives none (the design
 * system), and the island's fallback is the same buy box.
 */
export const ProductDetailPage = z
  .object({
    variant: z.literal("default").describe("D57: one variant in M3; M5 adds §9.5's"),
    breadcrumbs: Breadcrumbs,
    gallery: ProductGallery,
    buyBox: BuyBox,
    sticky: MobileStickyATC,
    info: ProductInfo,
    reviews: ReviewsSection,
    related: ProductCarousel.optional().describe("The same category's products, when it has some"),
  })
  .refine(
    (page) => page.gallery.title === page.buyBox.product.title,
    "the gallery is named after another product",
  )
  .refine(
    (page) => page.breadcrumbs.current === page.buyBox.product.title,
    "the breadcrumbs end on another page",
  )
  .refine(
    (page) => page.related?.products.every((card) => card.id !== page.buyBox.product.id) ?? true,
    "the product is among its own related products",
  );

/**
 * A listing's products with what changes them (T50, D59): the toolbar (the count and the sort), the
 * filters as one form, the grid and the page. The listing pages draw the first page of it on the
 * server and the listing island draws it again for a URL with filters; the search page draws it
 * on the server for every URL.
 */
export const ListingResults = z
  .object({
    toolbar: ProductToolbar,
    filters: FilterPanel.optional().describe("None when no product has anything to filter by"),
    grid: ProductGrid,
    page: PageState,
  })
  .refine(
    (results) => results.grid.products.length <= results.toolbar.count,
    "the grid holds more products than the listing counts",
  )
  .refine(
    (results) =>
      results.filters === undefined || results.filters.resultCount === results.toolbar.count,
    "the filters and the toolbar count different listings",
  );

/**
 * A listing page (`product-listing`, T50): a category, a collection or every product (the store),
 * its breadcrumbs, its name and its results. Its pages are paths (`/page/2`), its filters and sort
 * a query the island reads.
 */
export const ProductListingPage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3; M5 adds §9.5's"),
  breadcrumbs: Breadcrumbs,
  title: z.string().min(1).describe("The page's one heading: the category's or collection's name"),
  results: ListingResults,
});

/**
 * The search page (`search-results`, T50): the search field with the query, a heading that says
 * what was searched, and the results, every filter and sort read on the server. It is also where a
 * listing's filter form lands without JavaScript (D59).
 */
export const SearchResultsPage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3"),
  search: SearchQuery,
  title: z.string().min(1).describe("The page's one heading: what was searched, or “Search”"),
  results: ListingResults,
});

/** A category on the home (T51): its name, its page, and a picture of one of its products. */
export const CategoryTile = z.object({
  label: z.string().min(1),
  href: Href,
  image: Image.optional().describe("The category's first product's picture, when it has one"),
});

/**
 * The home page (`home`, T51, D58): a hero (the shop's message, a picture and the way into the
 * shop), the top-level categories as tiles, the newest products as a carousel and a link to every
 * product. M4's blocks replace the hero and decide the rest (`site-settings.homepage`).
 */
export const HomePage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3; M5 adds §9.5's"),
  hero: z.object({
    title: z.string().min(1).describe("The page's one heading"),
    text: z.string().min(1).optional(),
    image: Image.describe("Drawn beside the words: decorative, so its `alt` may be empty"),
    action: Link,
  }),
  categories: z
    .object({
      title: z.string().min(1),
      items: z.array(CategoryTile).min(1).max(8),
    })
    .optional()
    .describe("The top-level categories, when the shop has some"),
  newArrivals: ProductCarousel.optional().describe("The newest products, when there are some"),
  shopAll: Link.describe("Every product: the store's listing"),
});

/**
 * The cart page (`cart`, T52, D65): the lines with their forms, the promotion codes, the totals and
 * the way to the checkout; an empty cart is the way back to the shop.
 */
export const CartPage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3; M5 adds §9.5's"),
  cart: Cart,
  promoCode: z
    .string()
    .describe("What the promotion field holds: kept after an error, empty at first"),
  checkoutHref: Href.describe("The checkout's first step"),
  continueHref: Href.describe("Where 'Continue shopping' goes: the store"),
});

/** The checkout's first step: the email and the shipping address, in the region's countries. */
export const CheckoutContactStep = z.object({
  kind: z.literal("contact"),
  email: z.string().describe("What the email field holds: the cart's, or what was typed"),
  address: AddressFormState,
});

/**
 * The checkout's second step: the cart's shipping options (one chosen, or none yet) and the payment
 * (PaymentStep), sent as one form; with no option, the way back to the address.
 */
export const CheckoutDeliveryStep = z
  .object({
    kind: z.literal("delivery"),
    options: z.array(ShippingOption).describe("The cart's options; none when nothing ships there"),
    selected: Id.optional().describe("The option chosen, when one is"),
    payment: PaymentStep,
    addressHref: Href.describe("The first step, to change the address"),
  })
  .refine(
    (step) =>
      step.selected === undefined || step.options.some((option) => option.id === step.selected),
    { message: "the chosen option is not one on offer", path: ["selected"] },
  );

/** The checkout's last step: what will be ordered, each part with its way back, and the button. */
export const CheckoutReviewStep = z.object({
  kind: z.literal("review"),
  email: z.email(),
  shippingAddress: Address,
  shippingMethod: Order.shape.shippingMethod,
  payment: Order.shape.payment,
  editHrefs: z.object({
    contact: Href.describe("The first step: the email and the address"),
    delivery: Href.describe("The second step: the delivery and the payment"),
  }),
});

/**
 * The checkout (`checkout`, T52, D65): CheckoutSteps with the summary, and the current step's
 * content. Each step is its own page and its own form, so the checkout posts without scripts.
 */
export const CheckoutPage = z
  .object({
    variant: z.literal("default").describe("D57: one variant in M3"),
    checkout: CheckoutSteps,
    step: z.discriminatedUnion("kind", [
      CheckoutContactStep,
      CheckoutDeliveryStep,
      CheckoutReviewStep,
    ]),
  })
  .refine((page) => page.checkout.steps.current === page.step.kind, {
    message: "the stepper is on another step than the content",
    path: ["step", "kind"],
  });

/**
 * The receipt (`order-confirmation`, T52, D65): the thanks, the order's number, date and e-mail,
 * where it goes and how, its summary and its history, and the way back to the shop.
 */
export const OrderConfirmationPage = z
  .object({
    variant: z.literal("default").describe("D57: one variant in M3"),
    order: Order,
    summary: OrderSummary,
    continueHref: Href,
  })
  .refine((page) => page.summary.currencyCode === page.order.currencyCode, {
    message: "the summary is in another currency than the order",
    path: ["summary", "currencyCode"],
  });

export type NotFoundPage = z.infer<typeof NotFoundPage>;
export type CmsPage = z.infer<typeof CmsPage>;
export type ListingResults = z.infer<typeof ListingResults>;
export type ProductListingPage = z.infer<typeof ProductListingPage>;
export type SearchResultsPage = z.infer<typeof SearchResultsPage>;
export type ProductDetailPage = z.infer<typeof ProductDetailPage>;
export type ErrorPage = z.infer<typeof ErrorPage>;
export type CategoryTile = z.infer<typeof CategoryTile>;
export type HomePage = z.infer<typeof HomePage>;
export type CartPage = z.infer<typeof CartPage>;
export type CheckoutContactStep = z.infer<typeof CheckoutContactStep>;
export type CheckoutDeliveryStep = z.infer<typeof CheckoutDeliveryStep>;
export type CheckoutReviewStep = z.infer<typeof CheckoutReviewStep>;
export type CheckoutPage = z.infer<typeof CheckoutPage>;
export type OrderConfirmationPage = z.infer<typeof OrderConfirmationPage>;
