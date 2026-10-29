import { contentGlobalTags } from "./globals";

/** The tags a page's read carries in one language (D73): its language's, and every reader's. */
export const pageTags = (locale: string) => [`pages:${locale}`, "payload:pages"];

/** The tags a post's read carries in one language (T66): its language's, and every reader's. */
export const postTags = (locale: string) => [`posts:${locale}`, "payload:posts"];

/**
 * What a change to a document the content globals, the pages' blocks and the posts embed (an
 * upload's file, a catalog document's handle or deletion) refreshes in one language (T61, T63,
 * T66: a post's picture, and the links in its text).
 */
export const embeddingTags = (locale: string) => [
  ...contentGlobalTags(locale),
  ...pageTags(locale),
  ...postTags(locale),
];

/** What a change to a form refreshes in one language (T67): its own reads, and what embeds it. */
export const formTags = (locale: string) => [`forms:${locale}`, ...embeddingTags(locale)];
