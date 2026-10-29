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
