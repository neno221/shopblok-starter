// Ours (T32, SETUP.md "Product molecules (T32)"). A product's ratings: the average (the number
// large, and the Rating atom named by the copy), how many reviews it rests on, and a bar for each
// star from 5 to 1. Each bar row carries its numbers as text (WCAG 1.4.1: the bar is a picture of
// them, not the only carrier): the row is a list item whose name reads "5 stars, 94 reviews", and
// the drawn star, bar and count are hidden from assistive technology so they are not read twice.
// The bars share their columns (a subgrid), so they start and end together whatever the counts'
// digits. A product with no reviews shows the message alone, never zero stars (SBP
// `product-reviews.md`). A server component: it holds no state and handles no events.
import { formatMessage, formatNumber } from "@shopblok/i18n";
import type { Messages } from "@shopblok/i18n";
import type { RatingSummary as RatingSummaryData } from "@shopblok/registry/contracts";
import { Rating } from "@shopblok/ui/atoms/rating";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { StarIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type RatingSummaryProps = Omit<React.ComponentProps<"div">, "children"> & {
  summary: RatingSummaryData;
  /** The wording, from the catalog's `molecules.ratingSummary`. */
  copy: Messages["molecules"]["ratingSummary"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
};

/** The scale of the average: the five stars of the contract. */
const MAX_STARS = 5;

function RatingSummary({ summary, copy, locale, className, ...props }: RatingSummaryProps) {
  const { average, count, distribution } = summary;
  const countText = formatMessage(copy.count, { count }, locale);
  return (
    <div
      data-slot="rating-summary"
      className={cn("flex min-w-0 flex-col gap-4", className)}
      {...props}
    >
      {count === 0 ? (
        <p data-slot="rating-summary-count" className="text-sm text-muted-foreground">
          {countText}
        </p>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                data-slot="rating-summary-average"
                aria-hidden="true"
                className="text-4xl leading-none font-semibold tabular-nums"
              >
                {formatNumber(average, locale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
              <Rating
                size="lg"
                value={average}
                max={MAX_STARS}
                label={formatMessage(
                  copy.rating,
                  {
                    value: formatNumber(average, locale, { maximumFractionDigits: 1 }),
                    max: formatNumber(MAX_STARS, locale),
                  },
                  locale,
                )}
              />
            </div>
            <p data-slot="rating-summary-count" className="text-sm text-muted-foreground">
              {countText}
            </p>
          </div>
          <ul
            role="list"
            aria-label={copy.distribution}
            className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 text-sm"
          >
            {distribution.map((row) => (
              <li
                key={row.stars}
                data-slot="rating-summary-row"
                className="relative col-span-3 grid grid-cols-subgrid items-center"
              >
                <span aria-hidden="true" className="inline-flex items-center gap-1 tabular-nums">
                  {formatNumber(row.stars, locale)}
                  <StarIcon className="size-4 fill-rating text-rating" />
                </span>
                <span
                  aria-hidden="true"
                  className="block h-2 min-w-0 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    data-slot="rating-summary-bar"
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((row.count / count) * 1000) / 10}%` }}
                  />
                </span>
                <span aria-hidden="true" className="text-end tabular-nums text-muted-foreground">
                  {formatNumber(row.count, locale)}
                </span>
                <VisuallyHidden>
                  {formatMessage(copy.row, { stars: row.stars, count: row.count }, locale)}
                </VisuallyHidden>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export { RatingSummary };
export type { RatingSummaryProps };
