// The FAQ JSON-LD (SPEC §12, T63), checked against the shape Google's FAQ rich result requires: a
// `FAQPage` whose `mainEntity` is a list of at least one `Question`, each with a `name` and an
// `acceptedAnswer` `Answer` with its `text`.
import { sectionFixtures } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { faqJsonLd } from "./faq";

const FaqPageSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("FAQPage"),
  mainEntity: z
    .array(
      z.object({
        "@type": z.literal("Question"),
        name: z.string().min(1),
        acceptedAnswer: z.object({ "@type": z.literal("Answer"), text: z.string().min(1) }),
      }),
    )
    .min(1),
});

describe("faqJsonLd", () => {
  it("is a FAQPage with every question and its answer, as the schema wants", () => {
    const { items } = sectionFixtures.en.faq.section;
    const data = FaqPageSchema.parse(faqJsonLd(items));
    expect(data.mainEntity.map((question) => question.name)).toEqual(items.map((i) => i.title));
    expect(data.mainEntity[0]?.acceptedAnswer.text).toBe(items[0]?.answer.join("\n\n"));
  });

  it("merges a page's FAQs into one, in the page's order", () => {
    const first = sectionFixtures.de.faq.section.items;
    const second = sectionFixtures.de.faq.long.items;
    const data = FaqPageSchema.parse(faqJsonLd([...first, ...second]));
    expect(data.mainEntity).toHaveLength(first.length + second.length);
    expect(data.mainEntity.at(-1)?.name).toBe(second.at(-1)?.title);
  });

  it("is nothing for a page without a question (an empty mainEntity is invalid)", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(
      FaqPageSchema.safeParse({ "@context": "https://schema.org", "@type": "FAQPage" }).success,
    ).toBe(false);
  });
});
