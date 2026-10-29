import "server-only";
import type { Payload } from "payload";
import { cmsRead, type CmsQuery } from "./read";
import { catalogContent, type CatalogContent } from "./catalog-content";
import { CATALOG_CONTENT_TAG, catalogContentTag, type CatalogContentSlug } from "./tags";

// The catalog's content (D83, T69): the shop's own fields on Medusa's synced documents, read by
// handle in the market's language (D73), with no fallback to English. One cached entry per
// document and language, tagged `cms:<kind>:<handle>` (a save of the document refreshes it,
// `syncedCollection`'s hooks) and `cms:catalog` (a replaced upload, or a renamed or deleted linked
// document, refreshes every one: `linkedTags`). The uploads come populated with what `mediaImage`
// needs and nothing else; a rich text's internal link with its document's handle, whether Medusa
// deleted it, and a page's address (`CMS_PATHS`).

const POPULATE = {
  media: { url: true, filename: true, alt: true, width: true, height: true, mimeType: true },
  products: { handle: true, deletedInMedusa: true },
  categories: { handle: true, deletedInMedusa: true },
  collections: { handle: true, deletedInMedusa: true },
  pages: { title: true, slug: true, parent: true, breadcrumbs: true },
} as const;

// `meta` is the SEO plugin's group (T68, D82), with its picture populated like the others.
const SELECT: Record<CatalogContentSlug, Record<string, true>> = {
  products: { richDescription: true, gallery: true, meta: true },
  categories: { image: true, banner: true, intro: true, meta: true },
  collections: { image: true, banner: true, intro: true, meta: true },
};

function readContent<S extends CatalogContentSlug>(slug: S) {
  return cmsRead(
    async (
      payload: Payload,
      query: CmsQuery,
      handle: string,
    ): Promise<CatalogContent<S> | null> => {
      const { docs } = await payload.find({
        collection: slug,
        ...query,
        locale: query.locale as never,
        // Not D73's English fallback: a text not written in the market's language is not set there,
        // and the page shows Medusa's, which is translated (D83). The uploads are not localized.
        fallbackLocale: false,
        // A handle Medusa freed by deleting its document can be taken by a new one: the live one.
        where: { and: [{ handle: { equals: handle } }, { deletedInMedusa: { not_equals: true } }] },
        depth: 1,
        select: SELECT[slug] as never,
        populate: POPULATE as never,
        sort: "-updatedAt",
        limit: 1,
        pagination: false,
      });
      const doc = docs[0] as Record<string, unknown> | undefined;
      return doc === undefined ? null : catalogContent(slug, doc);
    },
    {
      name: `cms:catalog:${slug}`,
      tags: (_locale, handle) => [catalogContentTag(slug, handle), CATALOG_CONTENT_TAG],
    },
  );
}

/**
 * A product's, a category's or a collection's content by its handle, in the market's language:
 * `null` when Payload has no live document with that handle (the sync has not written it yet),
 * or with no database (the build's stand-in), and the page shows Medusa's alone.
 */
export const readProductContent = readContent("products");
export const readCategoryContent = readContent("categories");
export const readCollectionContent = readContent("collections");
