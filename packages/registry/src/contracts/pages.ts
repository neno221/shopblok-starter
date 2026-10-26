import { z } from "zod";
import { Href } from "./content";
import { Breadcrumbs } from "./listing";
import { ProductCarousel } from "./listing-organisms";
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

export type NotFoundPage = z.infer<typeof NotFoundPage>;
export type ProductDetailPage = z.infer<typeof ProductDetailPage>;
export type ErrorPage = z.infer<typeof ErrorPage>;
