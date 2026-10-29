import { formReference, privacyLink } from "../fields/form-reference";
import { headingField, sectionBlock } from "./section-block";

/**
 * `newsletter` (SPEC §7.4, D81): the signup as a band of a page, the editor's heading and line over
 * a form with one email field, posted through the shop's server action. M6 adds Resend Audiences
 * when a key is set; until then the address is a submission of the form.
 */
export const NewsletterBlock = sectionBlock({
  slug: "newsletter",
  interfaceName: "NewsletterBlock",
  plural: "Newsletters",
  // The signup reads best in the text's column, as `NewsletterSection` draws it by default.
  settings: { container: "narrow" },
  fields: [
    {
      ...headingField,
      admin: { description: "Empty: the shop's “Join our newsletter”, in each language." },
    },
    {
      name: "text",
      type: "text",
      localized: true,
      admin: { description: "The line under the heading. Empty: the shop's own." },
    },
    formReference({ newsletter: true }),
    privacyLink(),
  ],
});
