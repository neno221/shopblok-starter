// Ours (T32, SETUP.md "Product molecules (T32)"): a product's price as a shopper reads it, on the
// Price atom. A sale (`compareAt`) is the sale price with the original struck through, each with
// its hidden label; `varies` puts "From {price}" before it, and the message decides where the word
// goes (the price is cut out of the formatted message, so a language that puts "from" after the
// price can); an optional tax note goes under it. A server component: it only formats.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { PriceSummary } from "@shopblok/registry/contracts";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";

type PriceBlockProps = Omit<React.ComponentProps<"div">, "children"> & {
  price: PriceSummary;
  copy: Messages["molecules"]["priceBlock"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  size?: "sm" | "default" | "lg";
  /** A note under the price: the price includes tax, or tax comes on top. Nothing: no note. */
  tax?: "included" | "excluded";
};

// The word "from" is smaller than the price it belongs to.
const fromSizes = { sm: "text-xs", default: "text-sm", lg: "text-base" } as const;

// A character no message contains, standing in for the price while the message is formatted.
const PRICE_SLOT = "";

function PriceBlock({
  price: summary,
  copy,
  locale,
  size = "default",
  tax,
  className,
  ...props
}: PriceBlockProps) {
  const { price, compareAt, varies } = summary;
  const [before = "", after = ""] = varies
    ? formatMessage(copy.from, { price: PRICE_SLOT }, locale).split(PRICE_SLOT)
    : [];
  const from = (text: string) =>
    text.trim() === "" ? null : (
      <span data-slot="price-from" className={cn("text-muted-foreground", fromSizes[size])}>
        {text.trim()}
      </span>
    );
  return (
    <div
      data-slot="price-block"
      data-sale={compareAt === undefined ? undefined : ""}
      data-varies={varies ? "" : undefined}
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        {from(before)}
        {compareAt === undefined ? (
          <Price amount={price.amount} currency={price.currencyCode} locale={locale} size={size} />
        ) : (
          <Price
            amount={price.amount}
            original={compareAt.amount}
            currency={price.currencyCode}
            locale={locale}
            size={size}
            saleLabel={copy.sale}
            originalLabel={copy.original}
          />
        )}
        {from(after)}
      </div>
      {tax === undefined ? null : (
        <p data-slot="price-tax" className="text-xs text-muted-foreground">
          {tax === "included" ? copy.taxIncluded : copy.taxExcluded}
        </p>
      )}
    </div>
  );
}

export { PriceBlock };
export type { PriceBlockProps };
