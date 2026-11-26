import type { Image } from "@shopblok/registry/contracts";
import type { Metadata } from "next";
import { shareableImage, siteBase } from "./product";

// D82 (T68): a page's metadata in three layers. A document's own `meta` (the SEO plugin's fields:
// a page, a post, a product, a category or a collection) comes first; then what the page's template
// works out (M3's `lib/seo`: the product's title and its description's first 160 characters, the
// post's summary); then the site settings' description and picture. Pure, so each route's
// `generateMetadata` and the tests share it.

/** A document's SEO fields, or the site settings' defaults, as the pages use them. */
export type SeoFields = { title?: string; description?: string; image?: Image };

/**
 * The site's defaults with the last fallback of a page's picture (M7 D147, T110): the market's
 * generated share picture with the page's title on it (`shareImageFor`), which `getShellData`
 * adds; without it a page with no picture names none, as before.
 */
export type SiteSeo = SeoFields & { share?: (title?: string) => Image };

/** The title template: the site settings' when it has exactly one `%s`, else `%s | {store}`. */
export function titleTemplateOf(template: string | undefined, storeName: string): string {
  return template !== undefined && template.split("%s").length === 2
    ? template
    : `%s | ${storeName}`;
}

/** A title in the template (the layout's `title.template` does the same for a page's title). */
export const applyTitleTemplate = (template: string, title: string) =>
  template.replace("%s", title);

type OpenGraph = NonNullable<Metadata["openGraph"]>;

const imageEntry = (image: Image, base: URL) => {
  const url = shareableImage(image.src, base);
  return url === undefined
    ? undefined
    : { url, width: image.width, height: image.height, alt: image.alt };
};

/**
 * `metadata` (the template's) with the document's `meta` over it and the site's defaults under it:
 * - the title: `meta.title` as written, past the layout's template (the plugin suggests it with
 *   the template already in, `payload/seo.ts`); else the template's title;
 * - the description: `meta.description`, else the template's, else the site's;
 * - the Open Graph title, description and picture follow the same order, and keep everything else
 *   the template set (the type, the URL, a post's date);
 * - with no picture in any of them, the market's generated one with the page's own title (its
 *   template's title, not the document's SEO title, which holds the shop's name already), or, for
 *   a layout's metadata with no title of its own, the market's card (SPEC §12's last fallback).
 */
export function withSeo(
  metadata: Metadata,
  meta: SeoFields | null | undefined,
  site: SiteSeo,
  base: URL = siteBase(),
): Metadata {
  const description =
    meta?.description ??
    (typeof metadata.description === "string" ? metadata.description : undefined) ??
    site.description;
  const openGraph = (metadata.openGraph ?? {}) as OpenGraph;
  const pageTitle =
    typeof metadata.title === "string"
      ? metadata.title
      : typeof openGraph.title === "string"
        ? openGraph.title
        : undefined;
  const image =
    meta?.image ??
    (openGraph.images === undefined ? (site.image ?? site.share?.(pageTitle)) : undefined);
  const imageOf = image === undefined ? undefined : imageEntry(image, base);
  const ogTitle = meta?.title ?? openGraph.title;
  const shared = {
    ...openGraph,
    ...(ogTitle === undefined ? {} : { title: ogTitle }),
    ...(description === undefined ? {} : { description }),
    ...(imageOf === undefined ? {} : { images: [imageOf] }),
  } as OpenGraph;
  return {
    ...metadata,
    ...(meta?.title === undefined ? {} : { title: { absolute: meta.title } }),
    ...(description === undefined ? {} : { description }),
    // None where there is nothing to share: a page's `openGraph` replaces its layout's whole.
    ...(Object.keys(shared).length === 0 ? {} : { openGraph: shared }),
  };
}
