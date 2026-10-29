import type { FaqItem } from "@shopblok/registry/contracts";

// A page's FAQs as structured data (SPEC §12, T63): one `FAQPage` per page, whatever number of
// `faq` blocks it has, with every block's questions in the page's order. Each answer is its
// paragraphs joined by a blank line, the text the page shows. A page without a question has none:
// an empty `mainEntity` is invalid, so `null` tells the page to write no script at all.

export function faqJsonLd(items: readonly FaqItem[]): object | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.title,
      acceptedAnswer: { "@type": "Answer", text: item.answer.join("\n\n") },
    })),
  };
}
