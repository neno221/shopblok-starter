import "server-only";
import type { FormField } from "@shopblok/registry/contracts";
import { formFields, type StoredFormField } from "../forms/fields";
import { cmsRead } from "./read";

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
