import { formBuilderPlugin } from "@payloadcms/plugin-form-builder";
import { FORM_LIMITS } from "@shopblok/registry/contracts";
import { APIError, type BlocksField, type CollectionBeforeDeleteHook, type Field } from "payload";
import { blocks } from "payload/shared";
import { formTags } from "../lib/cms/tags";
import { checkFields, type StoredFormField } from "../lib/forms/fields";
import { isAdmin, isStaff } from "./access/roles";
import { seedKey } from "./fields/seed-key";
import { revalidateOnPublish } from "./hooks/revalidate-on-publish";

/** The form builder's own field kinds that D81 offers: no payment, upload, number, date or address. */
export const FORM_FIELD_BLOCKS = {
  text: true,
  textarea: true,
  email: true,
  select: true,
  checkbox: true,
  message: true,
  country: false,
  state: false,
  number: false,
  payment: false,
  upload: false,
} as const;

const named = (field: Field, name: string) => "name" in field && field.name === name;

/** Payload's own check of the fields first (rows, required), then D81's rules (`checkFields`). */
const validateFields: BlocksField["validate"] = async (value, options) => {
  const base = await blocks(value, options);
  if (base !== true) return base;
  return checkFields(value as StoredFormField[] | null | undefined);
};

/**
 * A form with submissions is not deleted (D81): a submission names its form (the plugin's `form` is
 * required), and deleting the form would take visitors' answers with it, or fail in the database.
 * An admin deletes its submissions first, on purpose.
 */
export const keepFormWithSubmissions: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: "form-submissions",
    where: { form: { equals: id } },
    overrideAccess: true,
    req,
  });
  if (totalDocs === 0) return;
  // With `data`, so a production build shows the message (see `users.ts`).
  throw new APIError(
    `This form has ${totalDocs === 1 ? "a submission" : `${totalDocs} submissions`}: an admin deletes them under Form Submissions first.`,
    400,
    {},
  );
};

/**
 * The plugin's `forms` fields, as D81 keeps them: the title, the fields (at most 20, their names
 * checked), the submit button's label and the confirmation message. Left out: the redirect after a
 * submission (`confirmationType` and `redirect`; the form always answers with its message, in
 * place) and the e-mails on submission (`emails`; M6 sends them through Resend).
 */
function formFields({ defaultFields }: { defaultFields: Field[] }): Field[] {
  return [
    ...defaultFields.flatMap((field): Field[] => {
      if (named(field, "fields"))
        return [
          {
            ...(field as BlocksField),
            required: true,
            minRows: 1,
            maxRows: FORM_LIMITS.fields,
            validate: validateFields,
          },
        ];
      if (named(field, "confirmationMessage"))
        return [
          {
            ...field,
            required: false,
            admin: { description: "Shown when the form is sent. Empty: the shop's thank-you." },
          } as Field,
        ];
      if (named(field, "confirmationType") || named(field, "redirect") || named(field, "emails"))
        return [];
      return [field];
    }),
    seedKey(),
  ];
}

/**
 * D81: Payload's form builder, hardened. Forms are built in the admin by staff and read by anyone
 * (the shop reads them anonymously, as it reads every published document; a form holds labels, not
 * secrets). A change revalidates the pages and globals that embed a form, and the form reads
 * (`formTags`); one with submissions is kept (`keepFormWithSubmissions`). Submissions arrive only through the shop's server action (`lib/actions/form.ts`):
 * the plugin's REST `create` is closed, so `POST /api/form-submissions` answers 403 and is no door
 * for spam. Staff read submissions; nobody edits one; admins may delete them.
 */
export const formBuilder = formBuilderPlugin({
  fields: FORM_FIELD_BLOCKS,
  formOverrides: {
    admin: { group: "Forms", defaultColumns: ["title", "updatedAt"] },
    access: { read: () => true, create: isStaff, update: isStaff, delete: isStaff },
    hooks: { ...revalidateOnPublish({ tags: formTags }), beforeDelete: [keepFormWithSubmissions] },
    fields: formFields,
  },
  formSubmissionOverrides: {
    admin: { group: "Forms", defaultColumns: ["form", "createdAt"] },
    access: {
      create: () => false,
      read: isStaff,
      update: () => false,
      delete: isAdmin,
    },
  },
});
