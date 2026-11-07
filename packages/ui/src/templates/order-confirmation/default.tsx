// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SBP layouts/order-confirmation.md). The
// receipt's `<main>`, M3's layout and the `receipt` family's first member: the thanks as its one
// `<h1>`, the order's number, the date it was placed (in the market's time zone, D65, so an order
// placed after midnight in Cyprus shows that day) and the address its updates go to; then where it
// goes (AddressCard), how (the shipping method and its price) and how it is paid; the OrderSummary
// with its lines open; the OrderTimeline in the same time zone; and the way back to the shop. The
// parts the layouts share are in `parts.tsx` (T86); the account's order screen keeps M3's own for
// this layout. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import {
  ReceiptContinue,
  ReceiptDelivery,
  ReceiptPayment,
  ReceiptShipping,
  ReceiptThanks,
  orderConfirmationCopy,
  type OrderConfirmationCopy,
  type OrderConfirmationTemplateProps,
} from "./parts";

function OrderConfirmationDefault(props: OrderConfirmationTemplateProps) {
  const {
    order,
    summary,
    continueHref,
    copy,
    locale,
    timeZone = "UTC",
    mainId = "main",
    as: Root = "main",
    prefetch,
    className,
  } = props;
  const part = { order, copy, locale, timeZone };
  return (
    <Root
      id={mainId}
      data-slot="order-confirmation-template"
      data-variant="default"
      className={cn(
        "mx-auto grid w-full max-w-7xl min-w-0 grid-cols-1 gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-x-10 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-8">
        <ReceiptThanks {...part} />
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          <ReceiptShipping {...part} />
          <div className="flex min-w-0 flex-col gap-6">
            <ReceiptDelivery {...part} />
            <ReceiptPayment {...part} />
          </div>
        </div>
        <OrderTimeline
          events={order.events}
          copy={copy.timeline}
          locale={locale}
          timeZone={timeZone}
        />
        <ReceiptContinue continueHref={continueHref} copy={copy} prefetch={prefetch} />
      </div>
      <OrderSummary
        {...summary}
        copy={copy.summary}
        rowCopy={copy.rows}
        locale={locale}
        defaultOpen
        className="lg:sticky lg:top-4"
      />
    </Root>
  );
}

export { OrderConfirmationDefault, orderConfirmationCopy };
export type { OrderConfirmationCopy, OrderConfirmationTemplateProps };
