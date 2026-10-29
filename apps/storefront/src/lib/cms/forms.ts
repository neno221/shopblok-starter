import "server-only";
import type { FormField } from "@shopblok/registry/contracts";
import type { Payload } from "payload";
import { formFields, type StoredFormField } from "../forms/fields";
import { getPayloadClient } from "./payload";
import { CMS_FALLBACK_LOCALE, cmsRead, type CmsQuery, type CmsReader } from "./read";
import { embeddingTags } from "./tags";

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

/**
 * The forms a visitor can reach (D81): the footer's newsletter and each form in a published page's
 * blocks. The server action takes posts to these only, so a form no page shows (a draft, one kept
 * for later) is no door for spam.
 */
async function loadPlacedForms(payload: Payload, query: CmsQuery): Promise<number[]> {
  const [pages, footer] = await Promise.all([
    payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { layout: true },
      pagination: false,
    }),
    payload.findGlobal({
      slug: "footer",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { newsletter: true },
    }),
  ]);
  const placed = [
    idOf(footer.newsletter?.form),
    ...pages.docs.flatMap((page) =>
      (page.layout ?? []).flatMap((block) =>
        block.blockType === "newsletter" || block.blockType === "formBlock"
          ? [idOf(block.form)]
          : [],
      ),
    ),
  ];
  return [...new Set(placed.filter((id): id is number => typeof id === "number"))];
}

/** `loadPlacedForms`, cached and tagged as the pages and the content globals are (`embeddingTags`). */
const readPlacedForms = cmsRead(loadPlacedForms, {
  name: "cms:placed-forms",
  tags: (locale) => embeddingTags(locale),
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
