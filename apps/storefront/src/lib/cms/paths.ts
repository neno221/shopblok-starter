import type { InternalPaths } from "./link";

/**
 * Where a CMS document is inside a market, per collection (`/about`). One map for everything that
 * turns a document into a URL: `resolveLink` (an internal link) and live preview's url function
 * (the frame), so a link and the preview of its target can never point at different pages. T65
 * gives `pages` its full path (the parents' slugs) and its route; T61 adds the catalog's
 * collections, T66 `posts`.
 */
export const CMS_PATHS: InternalPaths = {
  pages: (doc) => (typeof doc["slug"] === "string" && doc["slug"] ? `/${doc["slug"]}` : null),
};
