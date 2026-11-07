// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `compact`
// receipt: one card. The thanks (or the account's heading), the total and the delivery (the method
// and the town), then "Order details", a native disclosure (`<details>`, so it opens without
// scripts) with the lines and the totals, where it goes, how it is paid and its history, and the
// way on. A server component.
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import { ChevronDownIcon } from "lucide-react";
import {
  ReceiptEnd,
  ReceiptPayment,
  ReceiptRoot,
  ReceiptShipping,
  ReceiptTop,
  type OrderConfirmationTemplateProps,
} from "./parts";

function OrderConfirmationCompact(props: OrderConfirmationTemplateProps) {
  const { order, summary, copy, locale, timeZone = "UTC", mainId, as, account, className } = props;
  const words = copy.page;
  const part = { order, copy, locale, timeZone };
  const row = "flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1";
  return (
    <ReceiptRoot
      variant="compact"
      mainId={mainId}
      as={as}
      account={account}
      className={cn(account === undefined && "max-w-xl", className)}
    >
      <div
        data-slot="order-confirmation-card"
        className="flex min-w-0 flex-col gap-6 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
      >
        <ReceiptTop props={props} />
        <dl className="flex min-w-0 flex-col gap-3 border-t pt-4 text-sm leading-snug">
          <div className={row}>
            <dt className="font-medium">{words.compact.total}</dt>
            <dd data-slot="order-confirmation-total" className="text-base font-semibold">
              <Price
                amount={order.total.amount}
                currency={order.total.currencyCode}
                locale={locale}
              />
            </dd>
          </div>
          <div className={row}>
            <dt className="font-medium">{words.delivery}</dt>
            <dd className="min-w-0 text-end wrap-anywhere">
              {order.shippingMethod.name}
              {order.shippingAddress.city === undefined || order.shippingAddress.city === ""
                ? null
                : ` · ${order.shippingAddress.city}`}
            </dd>
          </div>
        </dl>
        <details data-slot="order-confirmation-more" className="group min-w-0 border-t pt-2">
          <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 wrap-anywhere">{words.compact.details}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="flex min-w-0 flex-col gap-6 pt-4">
            <OrderSummary
              {...summary}
              copy={copy.summary}
              rowCopy={copy.rows}
              locale={locale}
              lines="open"
              className="border-0 p-0"
            />
            <ReceiptShipping {...part} />
            <ReceiptPayment {...part} />
            <OrderTimeline
              events={order.events}
              copy={copy.timeline}
              locale={locale}
              timeZone={timeZone}
            />
          </div>
        </details>
        <ReceiptEnd props={props} />
      </div>
    </ReceiptRoot>
  );
}

export { OrderConfirmationCompact };
