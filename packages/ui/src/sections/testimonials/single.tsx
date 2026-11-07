// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The
// testimonials' `single` member: one quote, large and centred under the heading, its stars, its
// words in display type and who said them. It draws the editor's first quote; the others are kept
// for the other designs (the block keeps one list). A server component.
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { TestimonialCard, type TestimonialsSectionProps } from "./parts";

function TestimonialsSingle({
  settings,
  heading,
  quotes,
  copy,
  locale,
  className,
}: TestimonialsSectionProps) {
  const [quote] = quotes;
  return (
    <SectionFrame
      data-variant="single"
      settings={settings}
      slot="testimonials-section"
      className={className}
      innerClassName="flex flex-col items-center gap-8 text-center"
    >
      {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
      {quote === undefined ? null : (
        <TestimonialCard
          quote={quote}
          copy={copy}
          locale={locale}
          className="max-w-3xl items-center border-0 bg-transparent p-0 text-foreground [&_figcaption]:justify-center"
          quoteClassName="text-2xl leading-snug font-medium text-balance md:text-3xl"
        />
      )}
    </SectionFrame>
  );
}

export { TestimonialsSingle };
