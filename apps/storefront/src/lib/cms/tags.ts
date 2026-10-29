import { contentGlobalTags } from "./globals";

/** The tags a page's read carries in one language (D73): its language's, and every reader's. */
export const pageTags = (locale: string) => [`pages:${locale}`, "payload:pages"];

/**
 * What a change to a document the content globals and the pages' blocks embed (an upload's file,
 * a catalog document's handle or deletion) refreshes in one language (T61, T63).
 */
export const embeddingTags = (locale: string) => [
  ...contentGlobalTags(locale),
  ...pageTags(locale),
];

/** What a change to a form refreshes in one language (T67): its own reads, and what embeds it. */
export const formTags = (locale: string) => [`forms:${locale}`, ...embeddingTags(locale)];

/** The synced collections whose documents carry the shop's own content (D83, T69). */
export type CatalogContentSlug = "products" | "categories" | "collections";

const CATALOG_TAG_KIND: Record<CatalogContentSlug, string> = {
  products: "product",
  categories: "category",
  collections: "collection",
};

/**
 * The tag of a catalog document's content read (D73: `cms:product:<handle>`,
 * `cms:category:<handle>`, `cms:collection:<handle>`). One for every language: a save writes the
 * document's content in all of them at once, as far as a reader can tell (English is every
 * language's fallback).
 */
export const catalogContentTag = (slug: CatalogContentSlug, handle: string) =>
  `cms:${CATALOG_TAG_KIND[slug]}:${handle}`;

/** Every catalog content read's tag besides its own: what a replaced upload refreshes. */
export const CATALOG_CONTENT_TAG = "cms:catalog";

/**
 * What a change to a document others embed refreshes in one language: the content globals, the
 * pages and the catalog's content (T61, T63, T69). An upload's file is copied into each read, and a
 * product's, category's or collection's handle and deletion into each link to it (a product's
 * description linking to another product).
 */
export const linkedTags = (locale: string) => [...embeddingTags(locale), CATALOG_CONTENT_TAG];
