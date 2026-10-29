import type { InternalPaths } from "./link";
import { pagePath } from "./page-path";

/** The collections Medusa owns (D75): an internal link may point at their documents (SPEC §7.5). */
export const CATALOG_COLLECTIONS = ["categories", "collections", "products"] as const;

const handleOf = (doc: Record<string, unknown>): string | null =>
  typeof doc["handle"] === "string" && doc["handle"] !== "" && doc["deletedInMedusa"] !== true
    ? doc["handle"]
    : null;

/** A catalog document's path under `prefix`: none once Medusa deleted it (the link is left out). */
const catalogPath =
  (prefix: string, encode: (handle: string) => string) => (doc: Record<string, unknown>) => {
    const handle = handleOf(doc);
    return handle === null ? null : `${prefix}/${encode(handle)}`;
  };

/**
 * A page's address (D80): its last breadcrumb's, which the nested-docs plugin writes from the
 * parents' slugs in each language (`payload/nested-pages.ts`); its own slug while it has none yet
 * (a page that has never been saved with a parent, like live preview's first frame of a new page).
 */
const pageDocPath = (doc: Record<string, unknown>): string | null => {
  const breadcrumbs = doc["breadcrumbs"];
  const last = Array.isArray(breadcrumbs)
    ? (breadcrumbs.at(-1) as { url?: unknown } | undefined)
    : undefined;
  if (typeof last?.url === "string" && last.url !== "") return last.url;
  const parent = doc["parent"];
  return parent === null || parent === undefined || parent === "" ? pagePath([doc["slug"]]) : null;
};

/**
 * Where a CMS document is inside a market, per collection (`/about`). One map for everything that
 * turns a document into a URL: `resolveLink` (an internal link) and live preview's url function
 * (the frame), so a link and the preview of its target can never point at different pages. A page's
 * is its full path (`pageDocPath`); T66 adds `posts`.
 *
 * The catalog's paths are SPEC §8.1's (T61). A category's page is its whole path of handles
 * (`/categories/apparel/tops`), which its document does not hold (its `parent` is an id): this map
 * gives `/categories/<handle>`, right for a top-level category, and the shell passes its own
 * `categories` built from Medusa's tree (`lib/cms/site.ts`), so a child links to its full path.
 */
export const CMS_PATHS: InternalPaths = {
  pages: pageDocPath,
  products: catalogPath("/products", encodeURIComponent),
  categories: catalogPath("/categories", encodeURIComponent),
  collections: catalogPath("/collections", encodeURIComponent),
};
