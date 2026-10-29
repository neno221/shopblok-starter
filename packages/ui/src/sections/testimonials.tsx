// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `testimonials`, §9.5's reviews row). Customers'
// words in cards: the stars when the editor gave a rating, the quote, and who said it, with a small
// picture of them if there is one (decoration: their name is beside it). One column on a phone, two
// from `md`, three from `lg`. Written in Payload until M8's reviews module. A server component.
import { formatMessage, formatNumber } from "@shopblok/i18n";
import type { TestimonialsSection as TestimonialsSectionData } from "@shopblok/registry/contracts";
import { Rating } from "@shopblok/ui/atoms/rating";
import { cn } from "@shopblok/ui/lib/utils";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import NextImage from "next/image";

const MAX_STARS = 5;

/** The columns from `lg` up: as many as there are quotes, at most three. */
const columns = ["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"] as const;

type TestimonialsSectionProps = TestimonialsSectionData & {
  copy: Pick<SectionsCopy, "rating">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  className?: string;
};

function TestimonialsSection({
  settings,
  heading,
  quotes,
  copy,
  locale,
  className,
}: TestimonialsSectionProps) {
  return (
    <SectionFrame
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
            <figure
              data-slot="testimonial"
              className="flex h-full flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground"
            >
              {quote.rating === undefined ? null : (
                <Rating
                  size="sm"
                  value={quote.rating}
                  max={MAX_STARS}
                  label={formatMessage(
                    copy.rating,
                    {
                      value: formatNumber(quote.rating, locale),
                      max: formatNumber(MAX_STARS, locale),
                    },
                    locale,
                  )}
                />
              )}
              <blockquote className="flex-1 text-base leading-7 wrap-anywhere">
                <p>{quote.quote}</p>
              </blockquote>
              <figcaption className="flex min-w-0 items-center gap-3">
                {quote.avatar === undefined ? null : (
                  <NextImage
                    src={quote.avatar.src}
                    alt=""
                    width={40}
                    height={40}
                    sizes="40px"
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium wrap-anywhere">{quote.author}</span>
                  {quote.role === undefined ? null : (
                    <span className="text-sm text-muted-foreground wrap-anywhere">
                      {quote.role}
                    </span>
                  )}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

export { TestimonialsSection };
export type { TestimonialsSectionProps };
