import { headingField, sectionBlock } from "./section-block";

/**
 * `faq` (SPEC §7.4): questions and their answers in each language. An answer is plain text, its
 * paragraphs split by a blank line: what the page shows and the `FAQPage` JSON-LD's text.
 */
export const FaqBlock = sectionBlock({
  slug: "faq",
  interfaceName: "FaqBlock",
  plural: "FAQs",
  fields: [
    headingField,
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "question", type: "text", localized: true, required: true },
        {
          name: "answer",
          type: "textarea",
          localized: true,
          required: true,
          admin: { description: "A blank line starts a new paragraph." },
        },
      ],
    },
  ],
});
