/**
 * The most a form may hold, and the longest each kind of answer may be (D81's size limits). Its own
 * module, with no zod: FormBlockSection draws the fields' `maxLength` from it in the browser
 * (`@shopblok/registry/form-limits`), and the contracts re-export it.
 */
export const FORM_LIMITS = {
  fields: 20,
  text: 200,
  email: 254,
  textarea: 4000,
  option: 200,
} as const;
