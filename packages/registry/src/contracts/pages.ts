import { z } from "zod";
import { Href, Link } from "./content";
import { Image } from "./image";
import { Breadcrumbs, PageState, SearchQuery } from "./listing";
import { FilterPanel, ProductCarousel, ProductGrid, ProductToolbar } from "./listing-organisms";
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

export type NotFoundPage = z.infer<typeof NotFoundPage>;
export type ListingResults = z.infer<typeof ListingResults>;
export type ProductListingPage = z.infer<typeof ProductListingPage>;
export type SearchResultsPage = z.infer<typeof SearchResultsPage>;
export type ProductDetailPage = z.infer<typeof ProductDetailPage>;
export type ErrorPage = z.infer<typeof ErrorPage>;
export type CategoryTile = z.infer<typeof CategoryTile>;
export type HomePage = z.infer<typeof HomePage>;
