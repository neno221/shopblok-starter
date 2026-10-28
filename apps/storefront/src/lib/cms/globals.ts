/** The content globals (D78), in the order the admin's "Site" group lists them. */
export const CONTENT_GLOBALS = ["header", "footer", "site-settings"] as const;
export type ContentGlobalSlug = (typeof CONTENT_GLOBALS)[number];

/** The tag a content global's read carries, per language (SPEC §7.3, D73). */
export const globalTag = (slug: ContentGlobalSlug, locale: string) => `global:${slug}:${locale}`;
