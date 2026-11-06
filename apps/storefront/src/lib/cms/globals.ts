/**
 * The content globals (D78, D101), in the order the admin's "Site" group lists them. A change to a
 * document they embed (an upload, a catalog document's handle, a form) refreshes each of them
 * (`embeddingTags`), and live preview lists them all (`payload.config.ts`).
 */
export const CONTENT_GLOBALS = ["header", "footer", "site-settings", "templates"] as const;
export type ContentGlobalSlug = (typeof CONTENT_GLOBALS)[number];

/** The tag a content global's read carries, per language (SPEC §7.3, D73). */
export const globalTag = (slug: ContentGlobalSlug, locale: string) => `global:${slug}:${locale}`;

/** Every content global's tag in one language: what a change to a document they embed refreshes. */
export const contentGlobalTags = (locale: string) =>
  CONTENT_GLOBALS.map((slug) => globalTag(slug, locale));
