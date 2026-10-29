import type { RelationshipField, RelationshipFieldSingleValidation } from "payload";
import { relationship } from "payload/shared";
import { formFields, newsletterField, type StoredFormField } from "../../lib/forms/fields";
import { SHELL_LINK_TARGETS } from "../globals/header";
import { link } from "./link";

export const NOT_A_NEWSLETTER =
  "A newsletter posts one email address: pick a form whose only field is an email field, such as the seeded “Newsletter”.";

/**
 * A newsletter's form (D81) is one whose only field to fill in is an email field
 * (`newsletterField`), since NewsletterForm draws that field alone; another form would be refused on
 * every post for the fields it never shows. Checked on the server only, where Payload hands the
 * request (the plugin's own check on a submission's form does the same).
 */
export const newsletterForm: RelationshipFieldSingleValidation = async (value, options) => {
  const base = await relationship(value, options);
  if (base !== true) return base;
  // Payload's own check above passes an id alone, or nothing.
  const id = typeof value === "number" || typeof value === "string" ? value : undefined;
  const payload = options.req?.payload;
  if (id === undefined || payload === undefined) return true;
  try {
    const form = await payload.findByID({
      collection: "forms",
      id,
      depth: 0,
      overrideAccess: true,
      req: options.req,
    });
    return newsletterField(formFields(form.fields as StoredFormField[])) === undefined
      ? NOT_A_NEWSLETTER
      : true;
  } catch {
    return "This form no longer exists.";
  }
};

/**
 * A form built in the admin (D81): `formBlock`'s any form, a newsletter's a form with one email
 * field (`newsletterForm`).
 */
export function formReference({
  newsletter = false,
  required = true,
}: { newsletter?: boolean; required?: boolean } = {}): RelationshipField {
  return {
    name: "form",
    type: "relationship",
    relationTo: "forms",
    required,
    maxDepth: 1,
    ...(newsletter
      ? {
          validate: newsletterForm,
          admin: {
            description: "A form whose only field is an email field, such as “Newsletter”.",
          },
        }
      : {}),
  };
}

/** The privacy page a newsletter's consent sentence links to (NewsletterForm's `privacyHref`). */
export const privacyLink = () => ({
  ...link({ name: "privacy", relationTo: SHELL_LINK_TARGETS, label: false }),
  label: "Privacy policy",
  admin: { description: "Where “privacy policy” in the consent sentence goes." },
});
