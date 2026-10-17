// Ours (T32, SETUP.md "Product molecules (T32)"). One customer review as an <article>: the rating
// (the Rating atom, named "Rated 4 out of 5" by the copy), a heading, the author and the date, a
// verified mark and the body. The heading is the review's title, or the author when it has none
// (then the byline does not repeat the name), at the level the page asks for (`headingLevel`,
// default h3), so the review sits in the page's outline. The verified mark is an icon and a word
// (WCAG 1.4.1). The date is `formatDate` in the market's locale, always in UTC so a review is
// dated the same wherever it renders, and the review's own time, never the clock (D50). A body of
// several paragraphs (blank lines) is split into <p>s, and long words wrap. A server component: it
// holds no state and handles no events.
import { formatDate, formatMessage, formatNumber } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { Review } from "@shopblok/registry/contracts";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Rating } from "@shopblok/ui/atoms/rating";
import { BadgeCheckIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type ReviewItemProps = Omit<React.ComponentProps<"article">, "children"> & {
  review: Review;
  /** The wording, from the catalog's `molecules.reviewItem`. */
  copy: Messages["molecules"]["reviewItem"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The level of the review's heading in the page's outline. */
  headingLevel?: HeadingLevel;
};

/** Stars out of five, the scale the contract's `rating` is on. */
const MAX_STARS = 5;

function ReviewItem({
  review,
  copy,
  locale,
  headingLevel = 3,
  className,
  ...props
}: ReviewItemProps) {
  const Heading = `h${headingLevel}` as const;
  const { author, title, body, createdAt, verified, rating } = review;
  // A blank line ends a paragraph: LF or CRLF (a textarea sends CRLF), spaces on it allowed.
  const paragraphs = body
    .split(/\r?\n[^\S\r\n]*(?:\r?\n[^\S\r\n]*)+/)
    .filter((paragraph) => paragraph.trim() !== "");
  return (
    <article
      data-slot="review-item"
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <Rating
        size="sm"
        value={rating}
        max={MAX_STARS}
        label={formatMessage(
          copy.rating,
          { value: formatNumber(rating, locale), max: formatNumber(MAX_STARS, locale) },
          locale,
        )}
      />
      <Heading data-slot="review-heading" className="text-base font-semibold wrap-anywhere">
        {title ?? author}
      </Heading>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {title === undefined ? null : (
          <span data-slot="review-author" className="font-medium text-foreground wrap-anywhere">
            {author}
          </span>
        )}
        <time dateTime={createdAt}>
          {formatDate(createdAt, locale, { dateStyle: "medium", timeZone: "UTC" })}
        </time>
        {verified ? (
          <span data-slot="review-verified" className="inline-flex items-center gap-1 text-success">
            <Icon icon={BadgeCheckIcon} size="sm" />
            {copy.verified}
          </span>
        ) : null}
      </p>
      <div data-slot="review-body" className="flex max-w-prose flex-col gap-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed whitespace-pre-line wrap-anywhere">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}

export { ReviewItem };
export type { HeadingLevel, ReviewItemProps };
