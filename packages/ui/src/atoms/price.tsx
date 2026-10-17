// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). An amount in major units, as Medusa returns it
// (12.5 is €12.50: never divided or multiplied by 100), formatted by `formatMoney` for the
// market's `<html lang>`. With `original` it is a sale: the sale price in `price-sale`, the
// original struck through in `price-original`, and each with a visually hidden label (WCAG 1.4.1:
// colour and a line alone do not say which is which).
import { formatMoney } from "@shopblok/i18n/format";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type PriceProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** In major units. */
  amount: number;
  /** ISO 4217, either case. */
  currency: string;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  size?: "sm" | "default" | "lg";
} & (
    | { original?: undefined; saleLabel?: undefined; originalLabel?: undefined }
    | {
        /** The price before the sale, in major units. */
        original: number;
        /** Read out before the sale price ("Sale price"). */
        saleLabel: string;
        /** Read out before the original price ("Original price"). */
        originalLabel: string;
      }
  );

const sizes = {
  sm: "text-sm",
  default: "text-base",
  lg: "text-xl",
} as const;

function Price({
  amount,
  currency,
  locale,
  size = "default",
  original,
  saleLabel,
  originalLabel,
  className,
  ...props
}: PriceProps) {
  const classes = cn(
    "inline-flex flex-wrap items-baseline gap-x-2 font-medium tabular-nums",
    sizes[size],
    className,
  );
  if (original === undefined) {
    return (
      <span data-slot="price" className={cn(classes, "text-price")} {...props}>
        {formatMoney(amount, currency, locale)}
      </span>
    );
  }
  return (
    <span data-slot="price" data-sale="" className={classes} {...props}>
      <span data-slot="price-sale" className="text-price-sale">
        <VisuallyHidden>{saleLabel} </VisuallyHidden>
        {formatMoney(amount, currency, locale)}
      </span>
      <s data-slot="price-original" className="text-sm font-normal text-price-original">
        <VisuallyHidden>{originalLabel} </VisuallyHidden>
        {formatMoney(original, currency, locale)}
      </s>
    </span>
  );
}

export { Price };
export type { PriceProps };
