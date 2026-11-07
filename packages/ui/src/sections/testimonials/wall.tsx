// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The
// testimonials' `wall` member: short quotes in columns of different heights, one on a phone, two
// from `md`, three from `lg` (CSS columns, so a card is never split between two). The reading
// order is the editor's: down the first column, then the next. A server component.
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { TestimonialCard, type TestimonialsSectionProps } from "./parts";

function TestimonialsWall({
  settings,
  heading,
  quotes,
  copy,
  locale,
  className,
}: TestimonialsSectionProps) {
  return (
    <SectionFrame
      data-variant="wall"
      settings={settings}
      slot="testimonials-section"
      className={className}
      innerClassName="flex flex-col gap-8"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      <ul data-slot="testimonials-wall" className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {quotes.map((quote) => (
          <li key={quote.id} className="mb-6 min-w-0 break-inside-avoid">
            <TestimonialCard quote={quote} copy={copy} locale={locale} className="h-auto" />
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { TestimonialsWall };
