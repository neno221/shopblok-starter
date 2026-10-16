// Vendored from ReUI (`@reui/rating`, shadcn CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Atoms (T23)"): read-only, so the hover state, the
// click handler and `"use client"` are gone and it renders on the server; the value is rounded to
// the nearest half star; the colour is the `rating` token (not `yellow-400`) and the empty stars
// `muted-foreground`; the whole rating is one `role="img"` named by the required `label` prop (D30:
// "4.5 out of 5" in the page's language), and the visible value is the `valueText` prop (an
// `Intl` string in the page's locale, not `toFixed`); partial stars fill from the inline start.
import { cva, type VariantProps } from "class-variance-authority";
import { StarIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const ratingVariants = cva("inline-flex items-center", {
  variants: {
    size: {
      sm: "gap-2",
      default: "gap-2.5",
      lg: "gap-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const starVariants = cva("", {
  variants: {
    size: {
      sm: "size-4",
      default: "size-5",
      lg: "size-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const valueVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type RatingProps = Omit<React.ComponentProps<"div">, "children" | "role" | "aria-label"> &
  VariantProps<typeof ratingVariants> & {
    /** The value, from 0 to `max`; shown to the nearest half star. */
    value: number;
    /** The number of stars. */
    max?: number;
    /** The accessible name of the whole rating ("4.5 out of 5", in the page's language). */
    label: string;
    /** The number drawn beside the stars, formatted for the locale ("4,6"). Hidden from assistive technology: `label` says it. */
    valueText?: string;
  };

function Rating({ value, max = 5, label, valueText, size, className, ...props }: RatingProps) {
  const shown = Math.min(Math.max(Math.round(value * 2) / 2, 0), max);
  return (
    <div
      data-slot="rating"
      role="img"
      aria-label={label}
      className={cn(ratingVariants({ size }), className)}
      {...props}
    >
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.min(Math.max(shown - index, 0), 1) * 100;
          return (
            <div key={index} className="relative">
              <StarIcon
                data-slot="rating-star-empty"
                className={cn(starVariants({ size }), "text-muted-foreground/30")}
              />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <StarIcon
                  data-slot="rating-star-filled"
                  className={cn(starVariants({ size }), "fill-rating text-rating")}
                />
              </div>
            </div>
          );
        })}
      </div>
      {valueText ? (
        <span data-slot="rating-value" aria-hidden="true" className={valueVariants({ size })}>
          {valueText}
        </span>
      ) : null}
    </div>
  );
}

export { Rating };
export type { RatingProps };
