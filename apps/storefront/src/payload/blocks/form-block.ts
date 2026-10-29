import { formReference } from "../fields/form-reference";
import { headingField, sectionBlock } from "./section-block";

/**
 * `formBlock` (SPEC §7.4, D81): a form built under Forms, its fields in the editor's order, posted
 * through the shop's server action (a contact form, a trade enquiry). The fields, their labels and
 * the confirmation are the form's, so one form can sit on several pages.
 */
export const FormBlockBlock = sectionBlock({
  slug: "formBlock",
  interfaceName: "FormBlockBlock",
  plural: "Forms",
  // A form reads best in the text's column, as `FormBlockSection` draws it by default.
  settings: { container: "narrow" },
  fields: [headingField, { name: "intro", type: "text", localized: true }, formReference()],
});
