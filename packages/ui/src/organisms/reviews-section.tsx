// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D42; SBP components/
// product-reviews.md). A product's reviews: a heading, the ratings (RatingSummary) with the link
// that writes a review, one page of reviews (ReviewItem), which ones those are, and the pager
// (Pagination). A server component: every molecule it uses is one, and a page of reviews is a
// link, so the reviews are in the HTML for a search engine and for a reader without JavaScript.
// M8 brings the data; until then the page passes what it has.
// - A `<section>` with an `id` (the buy box's rating links to `#reviews`, so the page passes one
//   that is unique on it) named by its own heading (`aria-labelledby`, an id made from `id`). The
//   heading is an `h2` unless `headingLevel` says, and each review's heading is one level deeper.
// - With reviews, from `lg` the ratings are a column at the start (the summary, then the write
//   link) and the list is the column after it; below `lg` the ratings come first and the list
//   under them, which is the same order in the markup, so reading order, tab order and the eye
//   agree. The write link is where the reviewer's eye is after the stars: SBP puts it near the
//   summary.
// - With none (`summary.count` is 0): the heading, the catalog's "No reviews yet" and its hint,
//   and the write link. No zero-star summary (a row of empty stars is a rating of none), no list
//   and no pager (SBP: do not show 0 stars or an empty rating).
// - The write link is next/link with the Button's classes (Base UI's Button on a link would give
//   it `role="button"`, see EmptyState), at least 44 px tall, and drawn only when the page has a
//   `writeHref`. It takes `prefetch` from the prop; the pager is plain anchors.
// - "Showing 7 to 12 of 128 reviews" is made from the page and the summary's count. A page that
//   is not the last holds as many reviews as the page size, so its range starts after
//   (page - 1) pages of that size; the last page ends at the count, whatever it holds. A page with
//   no reviews on it (a stale link) draws no list and no line, only the pager.
// - `copy.rating` (the Rating atom's words) is part of the props every organism with stars takes;
//   RatingSummary and ReviewItem name their stars from their own copy, so it is not used here.
import { formatMessage } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { ReviewsSection as ReviewsSectionContent } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { Pagination } from "@shopblok/ui/molecules/pagination";
import { RatingSummary } from "@shopblok/ui/molecules/rating-summary";
import { ReviewItem } from "@shopblok/ui/molecules/review-item";
import NextLink from "next/link";
import type * as React from "react";

type ReviewsSectionProps = ReviewsSectionContent & {
  copy: {
    reviewsSection: Messages["organisms"]["reviewsSection"];
    ratingSummary: Messages["molecules"]["ratingSummary"];
    reviewItem: Messages["molecules"]["reviewItem"];
    pagination: Messages["molecules"]["pagination"];
    rating: Messages["atoms"]["rating"];
  };
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The address of a page of reviews (`hrefFor(1)` is the first), as Pagination takes it. */
  hrefFor: (page: number) => string;
  /** The section's id: the buy box's rating links to it ("reviews"). Unique on the page. */
  id?: string;
  /** The heading's level (2 by default; the design system's states sit under an h3 and use 4). */
  headingLevel?: 2 | 3 | 4;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

// The write link's href is a string the app built; `next/link` takes whatever the app's typed
// routes allow, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** The range of reviews a page shows, 1-based and inclusive: "7 to 12". */
function rangeOf(page: number, pageCount: number, total: number, onPage: number) {
  if (page >= pageCount) return { from: Math.max(total - onPage + 1, 1), to: total };
  return { from: (page - 1) * onPage + 1, to: page * onPage };
}

function ReviewsSection({
  summary,
  reviews,
  page,
  writeHref,
  copy,
  locale,
  hrefFor,
  id = "reviews",
  headingLevel = 2,
  prefetch,
  className,
}: ReviewsSectionProps) {
  const words = copy.reviewsSection;
  const headingId = `${id}-title`;
  const Heading = `h${headingLevel}` as const;
  const reviewHeading = (headingLevel + 1) as 3 | 4 | 5;
  const none = summary.count === 0;
  const range = rangeOf(page.page, page.pageCount, summary.count, reviews.length);

  const write =
    writeHref === undefined ? null : (
      <NextLink
        href={writeHref as LinkHref}
        prefetch={prefetch}
        data-slot="reviews-section-write"
        className={cn(buttonVariants({ variant: "outline" }), "w-fit max-w-full wrap-anywhere")}
      >
        {words.write}
      </NextLink>
    );

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-slot="reviews-section"
      className={cn("flex min-w-0 flex-col gap-6", className)}
    >
      <Heading
        id={headingId}
        data-slot="reviews-section-title"
        className="text-xl leading-snug font-semibold wrap-anywhere"
      >
        {words.title}
      </Heading>
      {none ? (
        <div data-slot="reviews-section-empty" className="flex max-w-prose flex-col gap-3">
          <p className="font-medium wrap-anywhere">{words.empty}</p>
          <p className="text-sm wrap-anywhere text-muted-foreground">{words.emptyHint}</p>
          {write}
        </div>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
          <div data-slot="reviews-section-summary" className="flex min-w-0 flex-col gap-6">
            <RatingSummary summary={summary} copy={copy.ratingSummary} locale={locale} />
            {write}
          </div>
          <div data-slot="reviews-section-reviews" className="flex min-w-0 flex-col gap-6">
            {reviews.length === 0 ? null : (
              <>
                <ul role="list" aria-label={words.list} className="flex flex-col">
                  {reviews.map((review) => (
                    <li key={review.id} className="border-b py-6 first:pt-0 last:border-b-0">
                      <ReviewItem
                        review={review}
                        copy={copy.reviewItem}
                        locale={locale}
                        headingLevel={reviewHeading}
                      />
                    </li>
                  ))}
                </ul>
                <p data-slot="reviews-section-showing" className="text-sm text-muted-foreground">
                  {formatMessage(
                    words.showing,
                    { count: summary.count, from: range.from, to: range.to },
                    locale,
                  )}
                </p>
              </>
            )}
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={hrefFor}
              copy={copy.pagination}
              locale={locale}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export { ReviewsSection };
export type { ReviewsSectionProps };
