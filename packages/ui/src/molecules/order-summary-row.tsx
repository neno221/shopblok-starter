// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). One row of an order summary:
// a label and a value. It is a `<div>` holding a `<dt>` and a `<dd>`, which HTML allows inside a
// `<dl>`, so the organism that draws the summary (OrderSummary, T39) wraps its rows in one list of
// terms and values and a screen reader reads "Subtotal, $149.97" as a pair. The label comes from the
// copy by `kind` (Subtotal, Discount, Shipping, Taxes, Total); `detail` stands beside it where one
// helps, as the copy's `withDetail` puts it ("Discount (WELCOME10)"), cut at a slot character so the
// code can be set in the medium weight and break anywhere (a 40-character code has nowhere else to
// break). The value: a discount is the amount taken off (the contract says so) and is drawn as a
// negative with the real minus sign U+2212, which a screen reader says as "minus" (a hyphen is read
// "dash", or not at all), and in the success colour with the minus beside it, so colour is never
// the only sign; shipping of 0 is "Free"; an amount that is not known yet (shipping before an
// option is chosen) is "Calculated at the next step". The total is emphasised by size, weight and a
// rule above it, never by colour alone. Amounts are major units through `formatMoney` (the Price
// atom for all but the discount, whose minus it cannot draw). A server component: it only formats.
import { formatMessage, formatMoney, type Messages } from "@shopblok/i18n";
import type { Money, SummaryLine } from "@shopblok/registry/contracts";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import type * as React from "react";

type OrderSummaryRowProps = Omit<React.ComponentProps<"div">, "children"> &
  SummaryLine & {
    /** The wording, from the catalog's `molecules.orderSummaryRow`. */
    copy: Messages["molecules"]["orderSummaryRow"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
  };

// A private-use character no message contains, standing in for the detail while the label is formatted.
const DETAIL_SLOT = "\uE000";

// U+2212, the minus sign. Intl writes a hyphen-minus (U+002D) for a negative amount.
const MINUS = "\u2212";

/** `amount` as the amount taken off: "−€5.00" in the locale's own arrangement of sign and currency. */
function formatNegative(amount: Money, locale: string): string {
  const written = formatMoney(-Math.abs(amount.amount), amount.currencyCode, locale);
  return written.replace(/[-\u2010-\u2012]/, MINUS);
}

function OrderSummaryRow({
  kind,
  amount,
  detail,
  copy,
  locale,
  className,
  ...props
}: OrderSummaryRowProps) {
  const total = kind === "total";
  const label = copy[kind];
  const [before = "", after = ""] =
    detail === undefined
      ? [label]
      : formatMessage(copy.withDetail, { label, detail: DETAIL_SLOT }, locale).split(DETAIL_SLOT);
  return (
    <div
      data-slot="order-summary-row"
      data-kind={kind}
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2",
        total && "border-t pt-3",
        className,
      )}
      {...props}
    >
      <dt
        data-slot="order-summary-row-label"
        className={cn(
          "min-w-0 text-sm leading-snug wrap-break-word text-muted-foreground",
          total && "text-base font-semibold text-foreground",
        )}
      >
        {before}
        {detail === undefined ? null : (
          <>
            <span
              data-slot="order-summary-row-detail"
              className="font-medium wrap-anywhere text-foreground"
            >
              {detail}
            </span>
            {after}
          </>
        )}
      </dt>
      <dd
        data-slot="order-summary-row-value"
        className="ms-auto min-w-0 text-end text-sm leading-snug wrap-break-word"
      >
        <Value kind={kind} amount={amount} copy={copy} locale={locale} />
      </dd>
    </div>
  );
}

function Value({
  kind,
  amount,
  copy,
  locale,
}: Pick<OrderSummaryRowProps, "kind" | "amount" | "copy" | "locale">) {
  if (amount === undefined)
    return (
      <span data-slot="order-summary-row-pending" className="text-muted-foreground">
        {copy.pending}
      </span>
    );
  if (kind === "shipping" && amount.amount === 0)
    return <span className="font-medium text-success">{copy.free}</span>;
  if (kind === "discount" && amount.amount !== 0)
    return (
      <span className="font-medium text-success tabular-nums">
        {formatNegative(amount, locale)}
      </span>
    );
  return (
    <Price
      amount={amount.amount}
      currency={amount.currencyCode}
      locale={locale}
      size={kind === "total" ? "lg" : "sm"}
      className={kind === "total" ? "font-semibold" : undefined}
    />
  );
}

export { OrderSummaryRow };
export type { OrderSummaryRowProps };
