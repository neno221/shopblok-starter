// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `split`
// receipt: the thanks (or the account's heading) across the top, then two columns from a container
// 48 rem wide: the lines and the totals (the summary, its lines open) at the start, and in a column
// beside them where it goes, how, how it is paid and its history. One column below that width, the
// summary first. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import {
  ReceiptDelivery,
  ReceiptEnd,
  ReceiptPayment,
  ReceiptRoot,
  ReceiptShipping,
  ReceiptTop,
  type OrderConfirmationTemplateProps,
} from "./parts";

function OrderConfirmationSplit(props: OrderConfirmationTemplateProps) {
  const { order, summary, copy, locale, timeZone = "UTC", mainId, as, account, className } = props;
  const part = { order, copy, locale, timeZone };
  return (
    <ReceiptRoot variant="split" mainId={mainId} as={as} account={account} className={className}>
      <div className="flex min-w-0 flex-col gap-8">
        <ReceiptTop props={props} />
        <div className="grid min-w-0 grid-cols-1 gap-8 @3xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] @3xl:items-start @3xl:gap-x-10">
          <OrderSummary
            {...summary}
            copy={copy.summary}
            rowCopy={copy.rows}
            locale={locale}
            defaultOpen
          />
          <div
            data-slot="order-confirmation-details"
            className={cn(
              "flex min-w-0 flex-col gap-6 rounded-xl border p-4",
              "@3xl:sticky @3xl:top-4",
            )}
          >
            <ReceiptShipping {...part} />
            <ReceiptDelivery {...part} className="border-t pt-4" />
            <ReceiptPayment {...part} className="border-t pt-4" />
            <div className="min-w-0 border-t pt-4">
              <OrderTimeline
                events={order.events}
                copy={copy.timeline}
                locale={locale}
                timeZone={timeZone}
              />
            </div>
          </div>
        </div>
        <ReceiptEnd props={props} />
      </div>
    </ReceiptRoot>
  );
}

export { OrderConfirmationSplit };
