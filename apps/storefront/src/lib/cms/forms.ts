import "server-only";
import type { FormField } from "@shopblok/registry/contracts";
import type { Payload } from "payload";
import { formFields, type StoredFormField } from "../forms/fields";
import { pageLayout } from "./page-layout";
import { getPayloadClient } from "./payload";
import { CMS_FALLBACK_LOCALE, cmsRead, type CmsQuery, type CmsReader } from "./read";
import { CATALOG_CONTENT_TAG, embeddingTags, type CatalogContentSlug } from "./tags";

/** A form as the server action checks a post against it (D81): its id and the fields it draws. */
export type CmsForm = { id: number; fields: FormField[] };

/**
 * One form by its id in the market's language (D73), as anyone reads it: the fields the server
 * action builds its schema from. Tagged `forms:<locale>`, which a change to a form revalidates
 * (`formTags`), so a post is checked against the fields the page shows.
 */
export const readForm = cmsRead(
  async (payload, query, id: number): Promise<CmsForm | null> => {
    const { docs } = await payload.find({
      collection: "forms",
      ...query,
      locale: query.locale as never,
      where: { id: { equals: id } },
      depth: 0,
      select: { fields: true },
      limit: 1,
      pagination: false,
    });
    const form = docs[0];
    return form === undefined
      ? null
      : { id: form.id, fields: formFields(form.fields as StoredFormField[]) };
  },
  { name: "cms:form", tags: (locale) => [`forms:${locale}`] },
);

/** A relationship's id at depth 0 (an id) or 1 (the document). */
const idOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;

/** The synced collections whose documents may hold sections of their own (D104, T87). */
const CATALOG_COLLECTIONS: CatalogContentSlug[] = ["products", "categories", "collections"];

/** The forms a list of blocks shows: each `newsletter`'s and `formBlock`'s. */
const formsIn = (blocks: unknown): unknown[] =>
  Array.isArray(blocks)
    ? blocks.flatMap((block: { blockType?: unknown; form?: unknown }) =>
        block.blockType === "newsletter" || block.blockType === "formBlock"
          ? [idOf(block.form)]
          : [],
      )
    : [];

/**
 * The forms a visitor can reach (D81): the footer's newsletter, each form in a published page's
 * blocks and, since T87 (D104), each form in a product's, a category's or a collection's own
 * sections (while it shows them, and Medusa has not deleted it) and in the `templates` global's
 * default sections. The server action takes posts to these only, so a form no page shows (a draft,
 * one kept for later) is no door for spam.
 */
async function loadPlacedForms(payload: Payload, query: CmsQuery): Promise<number[]> {
  const locale = query.locale as never;
  const [pages, footer, templates, ...catalog] = await Promise.all([
    payload.find({
      collection: "pages",
      ...query,
      locale,
      depth: 0,
      // Both layouts: a page with a layout per language places its forms in `localizedLayout`.
      select: { layoutPerLanguage: true, layout: true, localizedLayout: true },
      pagination: false,
    }),
    payload.findGlobal({
      slug: "footer",
      ...query,
      locale,
      depth: 0,
      select: { newsletter: true },
    }),
    payload.findGlobal({
      slug: "templates",
      ...query,
      locale,
      depth: 0,
      select: { productPage: { sections: true }, listing: { sections: true } } as never,
    }),
    ...CATALOG_COLLECTIONS.map((collection) =>
      payload.find({
        collection,
        ...query,
        locale,
        depth: 0,
        where: {
          and: [{ sectionsMode: { equals: "own" } }, { deletedInMedusa: { not_equals: true } }],
        },
        select: { sections: true } as never,
        pagination: false,
      }),
    ),
  ]);
  const defaults = templates as {
    productPage?: { sections?: unknown };
    listing?: { sections?: unknown };
  };
  const placed = [
    idOf(footer.newsletter?.form),
    ...pages.docs.flatMap((page) => formsIn(pageLayout(page))),
    ...formsIn(defaults.productPage?.sections),
    ...formsIn(defaults.listing?.sections),
    ...catalog.flatMap(({ docs }) =>
      docs.flatMap((doc) => formsIn((doc as { sections?: unknown }).sections)),
    ),
  ];
  return [...new Set(placed.filter((id): id is number => typeof id === "number"))];
}

/**
 * `loadPlacedForms`, cached and tagged as the pages and the content globals are (`embeddingTags`,
 * the `templates` global among them), and as the catalog's content (`cms:catalog`, T87). A save of
 * one product's sections refreshes its own tag only, so a form placed there is found by the
 * uncached look below until the list is next refreshed.
 */
const readPlacedForms = cmsRead(loadPlacedForms, {
  name: "cms:placed-forms",
  tags: (locale) => [...embeddingTags(locale), CATALOG_CONTENT_TAG],
});

/**
 * Whether a visitor can reach form `id` in the reader's language (`loadPlacedForms`). The cached
 * list first; a form missing from it is looked for again, uncached, since a publish only marks the
 * list stale (`revalidateTag(tag, "max")`) and a page published a moment ago takes posts at once.
 * Without a content database, no form is.
 */
export async function isFormPlaced(reader: CmsReader, id: number): Promise<boolean> {
  const cached = await readPlacedForms(reader);
  if (cached === null) return false;
  if (cached.includes(id)) return true;
  const fresh = await loadPlacedForms(await getPayloadClient(), {
    locale: reader.market.language,
    fallbackLocale: CMS_FALLBACK_LOCALE,
    draft: false,
    overrideAccess: false,
    user: null,
  });
  return fresh.includes(id);
}
