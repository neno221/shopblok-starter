// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SBP layouts/order-confirmation.md). The
// receipt's `<main>`: the thanks as its one `<h1>`, the order's number, the date it was placed (in
// the market's time zone, D65, so an order placed after midnight in Cyprus shows that day) and the
// address its updates go to; then where it goes (AddressCard), how (the shipping method and its
// price) and how it is paid; the OrderSummary with its lines open; the OrderTimeline in the same
// time zone; and the way back to the shop. A server component.
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type { OrderConfirmationPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import { CircleCheckIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type OrderConfirmationCopy = {
  page: Messages["templates"]["orderConfirmation"];
  addressCard: Messages["molecules"]["addressCard"];
  summary: Messages["organisms"]["orderSummary"];
  rows: Messages["molecules"]["orderSummaryRow"];
  timeline: Messages["organisms"]["orderTimeline"];
  free: string;
};

/** The receipt's words from a whole catalog: its own and its organisms'. */
function orderConfirmationCopy(messages: Messages): OrderConfirmationCopy {
  const { molecules, organisms, templates } = messages;
  return {
    page: templates.orderConfirmation,
    addressCard: molecules.addressCard,
    summary: organisms.orderSummary,
    rows: molecules.orderSummaryRow,
    timeline: organisms.orderTimeline,
    free: molecules.orderSummaryRow.free,
  };
}

type OrderConfirmationTemplateProps = OrderConfirmationPage & {
  copy: OrderConfirmationCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The market's IANA time zone (D65) the dates are in; UTC unless given. */
  timeZone?: string;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function OrderConfirmationTemplate({
  order,
  summary,
  continueHref,
  copy,
  locale,
  timeZone = "UTC",
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: OrderConfirmationTemplateProps) {
  const words = copy.page;
  const part = "flex min-w-0 flex-col gap-2 text-sm leading-snug";
  const heading = "text-base leading-snug font-semibold wrap-anywhere";
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
        <header className="flex min-w-0 flex-col gap-2">
          <CircleCheckIcon aria-hidden="true" className="size-8 text-success" />
          <h1 className="text-2xl leading-tight font-semibold wrap-anywhere md:text-3xl">
            {words.title}
          </h1>
          <p data-slot="order-confirmation-number" className="text-lg font-medium">
            {formatMessage(words.number, { number: String(order.displayId) }, locale)}
          </p>
          <p data-slot="order-confirmation-placed" className="text-muted-foreground">
            {formatMessage(
              words.placed,
              {
                date: formatDate(order.placedAt, locale, {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone,
                }),
              },
              locale,
            )}
          </p>
          <p className="text-muted-foreground wrap-anywhere">
            {formatMessage(words.email, { email: order.email }, locale)}
          </p>
        </header>
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          <section data-slot="order-confirmation-shipping" className={part}>
            <h2 className={heading}>{words.shipping}</h2>
            <AddressCard
              address={order.shippingAddress}
              copy={copy.addressCard}
              locale={locale}
              className="border-0 p-0"
            />
          </section>
          <div className="flex min-w-0 flex-col gap-6">
            <section data-slot="order-confirmation-delivery" className={part}>
              <h2 className={heading}>{words.delivery}</h2>
              <p className="flex flex-wrap justify-between gap-x-3">
                <span className="wrap-anywhere">{order.shippingMethod.name}</span>
                {order.shippingMethod.price.amount === 0 ? (
                  <span className="text-success">{copy.free}</span>
                ) : (
                  <Price
                    amount={order.shippingMethod.price.amount}
                    currency={order.shippingMethod.price.currencyCode}
                    locale={locale}
                  />
                )}
              </p>
            </section>
            <section data-slot="order-confirmation-payment" className={part}>
              <h2 className={heading}>{words.payment}</h2>
              <p className="wrap-anywhere">
                {order.payment.name ?? order.payment.brand ?? ""}
                {order.payment.last4 === undefined ? null : ` •••• ${order.payment.last4}`}
              </p>
            </section>
          </div>
        </div>
        <OrderTimeline
          events={order.events}
          copy={copy.timeline}
          locale={locale}
          timeZone={timeZone}
        />
        <NextLink
          href={continueHref as LinkHref}
          prefetch={prefetch}
          data-slot="order-confirmation-continue"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "max-w-full self-start",
          )}
        >
          {words.continue}
        </NextLink>
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

export { OrderConfirmationTemplate, orderConfirmationCopy };
export type { OrderConfirmationCopy, OrderConfirmationTemplateProps };
