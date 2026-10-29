import { headingField, imageField, sectionBlock } from "./section-block";

/** `testimonials` (SPEC §7.4): customers' words, written here until M8's reviews module. */
export const TestimonialsBlock = sectionBlock({
  slug: "testimonials",
  interfaceName: "TestimonialsBlock",
  plural: "Testimonials",
  fields: [
    headingField,
    {
      name: "quotes",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: "quote", type: "textarea", localized: true, required: true },
        // A person's name is the same in every language.
        { name: "author", type: "text", required: true },
        {
          name: "role",
          type: "text",
          localized: true,
          admin: { description: "Where they are from, or what they bought." },
        },
        {
          name: "rating",
          type: "number",
          min: 1,
          max: 5,
          admin: { step: 1, description: "Stars, from 1 to 5; none leaves them out." },
          validate: (value: number | null | undefined) =>
            value == null || (Number.isInteger(value) && value >= 1 && value <= 5)
              ? true
              : "A whole number from 1 to 5.",
        },
        imageField("avatar", { description: "Drawn small beside the name." }),
      ],
    },
  ],
});
