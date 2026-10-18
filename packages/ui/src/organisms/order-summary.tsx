// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4). What an order costs,
// for the checkout's column and the confirmation: a section named by its heading ("Order summary"),
// the lines, then the rows (OrderSummaryRow) in one `<dl>`, so a screen reader reads "Subtotal,
// €149.97" as a pair, ending with the total. A line is what was bought, not a cart line: its picture
// (decoration, `alt=""`), its title, every chosen option ("Size: M"; SBP cart.md), the quantity in
// words and the line's total; no controls, because the checkout changes the cart on the cart page.
// Below `lg` the lines are collapsed behind a 44 px toggle ("Show order summary", "3 items"), which is
// the small client part (`order-summary-lines.tsx`), so the form of the step comes first on a phone;
// from `lg` the column has the room and the lines are always shown. Without JavaScript the toggle
// cannot work, so it is hidden and the lines are shown (`noscript:`). The rows are always shown: the
// total is what a shopper checks at every step. A server component but for the toggle: it formats
// every word and hands the toggle plain strings.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { OrderSummary as OrderSummaryContent } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { Price } from "@shopblok/ui/atoms/price";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummaryRow } from "@shopblok/ui/molecules/order-summary-row";
import { ImageOffIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";
import { OrderSummaryLines } from "./order-summary-lines";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type OrderSummaryProps = Omit<React.ComponentProps<"section">, "children"> &
  OrderSummaryContent & {
    /** The wording, from the catalog's `organisms.orderSummary`. */
    copy: Messages["organisms"]["orderSummary"];
    /** OrderSummaryRow's wording, from the catalog's `molecules.orderSummaryRow`. */
    rowCopy: Messages["molecules"]["orderSummaryRow"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The heading's level in the page's outline: 2 unless the page wants another. */
    headingLevel?: HeadingLevel;
    /** The lines open at first below `lg` (the confirmation page, the design system's states). */
    defaultOpen?: boolean;
  };

function OrderSummary({
  currencyCode: _currency,
  items,
  itemCount,
  rows,
  copy,
  rowCopy,
  locale,
  headingLevel = 2,
  defaultOpen,
  className,
  ...props
}: OrderSummaryProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <section
      data-slot="order-summary"
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground",
        className,
      )}
      {...props}
    >
      <Heading id={titleId} className="text-base leading-snug font-semibold wrap-anywhere">
        {copy.title}
      </Heading>
      <OrderSummaryLines
        copy={{
          show: copy.show,
          hide: copy.hide,
          count: formatMessage(copy.count, { count: itemCount }, locale),
        }}
        defaultOpen={defaultOpen}
      >
        <ul
          role="list"
          aria-label={copy.items}
          data-slot="order-summary-items"
          className="flex min-w-0 flex-col gap-4"
        >
          {items.map((item) => (
            <li
              key={item.id}
              data-slot="order-summary-item"
              className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3"
            >
              <div className="w-14">
                {item.image === undefined ? (
                  <div
                    aria-hidden="true"
                    className="flex aspect-[4/5] w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
                  >
                    <ImageOffIcon className="size-5" />
                  </div>
                ) : (
                  <Image src={item.image.src} alt="" sizes="56px" ratio="portrait" radius="md" />
                )}
              </div>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5 text-sm leading-snug">
                  <p className="font-medium wrap-anywhere">{item.title}</p>
                  {item.options.map((option, index) => (
                    <p
                      key={`${option.option}-${index}`}
                      className="text-muted-foreground wrap-anywhere"
                    >
                      {formatMessage(copy.option, option, locale)}
                    </p>
                  ))}
                  <p className="text-muted-foreground">
                    {formatMessage(copy.quantity, { count: item.quantity }, locale)}
                  </p>
                </div>
                <p className="ms-auto text-sm font-medium">
                  <VisuallyHidden>{copy.lineTotal} </VisuallyHidden>
                  <Price
                    size="sm"
                    amount={item.total.amount}
                    currency={item.total.currencyCode}
                    locale={locale}
                  />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </OrderSummaryLines>
      <dl data-slot="order-summary-rows" className="flex min-w-0 flex-col border-t pt-2">
        {rows.map((row, index) => (
          <OrderSummaryRow key={`${row.kind}-${index}`} {...row} copy={rowCopy} locale={locale} />
        ))}
      </dl>
    </section>
  );
}

export { OrderSummary };
export type { OrderSummaryProps };
