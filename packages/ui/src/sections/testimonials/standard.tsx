// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `testimonials`, §9.5's reviews row). Customers'
// words in cards: the stars when the editor gave a rating, the quote, and who said it, with a small
// picture of them if there is one (decoration: their name is beside it). One column on a phone, two
// from `md`, three from `lg`. Written in Payload until M8's reviews module. A server component.
// T82 moved the card to `parts.tsx`, which the other members share.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { TestimonialCard, type TestimonialsSectionProps } from "./parts";

/** The columns from `lg` up: as many as there are quotes, at most three. */
const columns = ["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"] as const;

function TestimonialsStandard({
  settings,
  heading,
  quotes,
  copy,
  locale,
  className,
}: TestimonialsSectionProps) {
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="testimonials-section"
      className={className}
      innerClassName="flex flex-col gap-8"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <ul
        className={cn(
          "grid grid-cols-1 gap-6",
          quotes.length > 1 && "md:grid-cols-2",
          columns[Math.min(quotes.length, 3) - 1],
        )}
      >
        {quotes.map((quote) => (
          <li key={quote.id} className="min-w-0">
            <TestimonialCard quote={quote} copy={copy} locale={locale} />
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { TestimonialsStandard };
export type { TestimonialsSectionProps };
