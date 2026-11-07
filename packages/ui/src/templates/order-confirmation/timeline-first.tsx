// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The
// `timeline-first` receipt: where the order is comes first. The thanks (or the account's heading),
// then OrderTimeline in a card of its own, then where it goes, how and how it is paid, side by side
// from a container 42 rem wide, then the summary with its lines open, and the way on. One column. A
// server component.
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

function OrderConfirmationTimelineFirst(props: OrderConfirmationTemplateProps) {
  const { order, summary, copy, locale, timeZone = "UTC", mainId, as, account, className } = props;
  const part = { order, copy, locale, timeZone };
  return (
    <ReceiptRoot
      variant="timeline-first"
      mainId={mainId}
      as={as}
      account={account}
      className={cn(account === undefined && "max-w-4xl", className)}
    >
      <div className="flex min-w-0 flex-col gap-8">
        <ReceiptTop props={props} />
        <div data-slot="order-confirmation-status" className="min-w-0 rounded-xl border p-4 md:p-6">
          <OrderTimeline
            events={order.events}
            copy={copy.timeline}
            locale={locale}
            timeZone={timeZone}
          />
        </div>
        <div className="grid min-w-0 gap-6 @2xl:grid-cols-3">
          <ReceiptShipping {...part} />
          <ReceiptDelivery {...part} />
          <ReceiptPayment {...part} />
        </div>
        <OrderSummary
          {...summary}
          copy={copy.summary}
          rowCopy={copy.rows}
          locale={locale}
          defaultOpen
        />
        <ReceiptEnd props={props} />
      </div>
    </ReceiptRoot>
  );
}

export { OrderConfirmationTimelineFirst };
