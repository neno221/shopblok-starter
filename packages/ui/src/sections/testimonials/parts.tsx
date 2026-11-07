// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; D99). What the testimonials'
// members share, moved out of `standard.tsx` (T63) with the same classes, so the first member's
// pixels are unchanged: the props, the stars' name and the quote's card (the stars, the words and
// who said them, with a small picture of them if there is one, decoration). Server components.
import { formatMessage, formatNumber } from "@shopblok/i18n";
import type {
  Testimonial,
  TestimonialsSection as TestimonialsSectionData,
} from "@shopblok/registry/contracts";
import { Rating } from "@shopblok/ui/atoms/rating";
import { cn } from "@shopblok/ui/lib/utils";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import NextImage from "next/image";

const MAX_STARS = 5;

type TestimonialsSectionProps = TestimonialsSectionData & {
  copy: Pick<SectionsCopy, "rating" | "testimonials" | "products">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  className?: string;
};

type TestimonialCardProps = {
  quote: Testimonial;
  copy: Pick<SectionsCopy, "rating">;
  locale: string;
  /** The card's own classes (the single quote's size). */
  className?: string;
  /** The quote's own classes. */
  quoteClassName?: string;
};

/** One quote: its stars, the words in a blockquote, and who said them. */
function TestimonialCard({ quote, copy, locale, className, quoteClassName }: TestimonialCardProps) {
  return (
    <figure
      data-slot="testimonial"
      className={cn(
        "flex h-full flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground",
        className,
      )}
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
      <blockquote className={cn("flex-1 text-base leading-7 wrap-anywhere", quoteClassName)}>
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
            <span className="text-sm text-muted-foreground wrap-anywhere">{quote.role}</span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

export { TestimonialCard };
export type { TestimonialsSectionProps };
