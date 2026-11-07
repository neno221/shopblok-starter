// Ours (T52, T86; SETUP.md "Cart and checkout (T52)", "Checkout and receipt variants (T86)"; D65,
// D99, SBP layouts/order-confirmation.md). What the receipt's layouts share, moved out of M3's
// `default.tsx` with no change to its pixels: the words, the props, the thanks, the parts (where it
// goes, how, how it is paid) and the way back to the shop.
//
// **The account's order screen** draws the same layouts (D101: the `templates` global's receipt)
// without the thanks: it passes `account`, its own heading (the order's number and date) and its
// own ways on (the return, back to the orders), and the layout draws those in their place, in a
// `div` inside the account's column. Each layout's columns follow its container's width (`@container`),
// so they fit the page and the narrower column beside AccountNav. Server components.
import { formatDate, formatMessage, type Messages } from "@shopblok/i18n";
import type { OrderConfirmationPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
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

/** The account's order screen's own parts, drawn in place of the thanks and the way back (T86). */
type ReceiptOnAccount = {
  /** The screen's heading: its `<h1>` (the order's number) and when it was placed. */
  header: React.ReactNode;
  /** Its ways on: the return, and back to the orders. */
  actions: React.ReactNode;
};

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
  /**
   * The account's order screen (T86): its heading and ways on in place of the thanks and the way
   * back, in a `div` in the account's column. The `default` layout is not drawn so: the account keeps
   * M3's order screen for it.
   */
  account?: ReceiptOnAccount;
  className?: string;
};

const partClass = "flex min-w-0 flex-col gap-2 text-sm leading-snug";
const partHeading = "text-base leading-snug font-semibold wrap-anywhere";

/**
 * A layout's root: the page's `<main>` (or the design system's `div`) with the family's slot and
 * `data-variant`, or, on the account, a `div` of its own in the account's column. A container, so
 * the layout's columns follow its width.
 */
function ReceiptRoot({
  variant,
  mainId = "main",
  as: Root = "main",
  account,
  className,
  children,
}: Pick<OrderConfirmationTemplateProps, "variant" | "mainId" | "as" | "account" | "className"> & {
  children: React.ReactNode;
}) {
  if (account !== undefined)
    return (
      <div
        data-slot="account-order-receipt"
        data-variant={variant}
        className={cn("@container flex w-full min-w-0 flex-col gap-6", className)}
      >
        {children}
      </div>
    );
  return (
    <Root
      id={mainId}
      data-slot="order-confirmation-template"
      data-variant={variant}
      className={cn(
        "@container mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:px-6 md:py-12 lg:px-8",
        className,
      )}
    >
      {children}
    </Root>
  );
}

/** The thanks: its check, the page's `<h1>`, the number, when it was placed and where updates go. */
function ReceiptThanks({
  order,
  copy,
  locale,
  timeZone = "UTC",
  className,
}: Pick<OrderConfirmationTemplateProps, "order" | "copy" | "locale" | "timeZone"> & {
  className?: string;
}) {
  const words = copy.page;
  return (
    <header className={cn("flex min-w-0 flex-col gap-2", className)}>
      <CircleCheckIcon aria-hidden="true" className="size-8 text-success" />
      <h1 className="text-2xl leading-tight font-semibold wrap-anywhere md:text-3xl">
        {words.title}
      </h1>
      <p data-slot="order-confirmation-number" className="text-lg font-medium">
        {formatMessage(words.number, { number: String(order.displayId) }, locale)}
      </p>
      <p data-slot="order-confirmation-placed" className="text-muted-foreground">
        {placedOn(order, copy, locale, timeZone)}
      </p>
      <p className="text-muted-foreground wrap-anywhere">
        {formatMessage(words.email, { email: order.email }, locale)}
      </p>
    </header>
  );
}

/** "Placed on 3 November 2026 at 21:14", in the market's time zone (D65). */
function placedOn(
  order: OrderConfirmationPage["order"],
  copy: OrderConfirmationCopy,
  locale: string,
  timeZone = "UTC",
): string {
  return formatMessage(
    copy.page.placed,
    {
      date: formatDate(order.placedAt, locale, { dateStyle: "long", timeStyle: "short", timeZone }),
    },
    locale,
  );
}

/** Where the order goes: its heading and the address. */
function ReceiptShipping({
  order,
  copy,
  locale,
  className,
}: Pick<OrderConfirmationTemplateProps, "order" | "copy" | "locale"> & { className?: string }) {
  return (
    <section data-slot="order-confirmation-shipping" className={cn(partClass, className)}>
      <h2 className={partHeading}>{copy.page.shipping}</h2>
      <AddressCard
        address={order.shippingAddress}
        copy={copy.addressCard}
        locale={locale}
        className="border-0 p-0"
      />
    </section>
  );
}

/** How it is delivered: the shipping method and its price ("Free" for nothing). */
function ReceiptDelivery({
  order,
  copy,
  locale,
  className,
}: Pick<OrderConfirmationTemplateProps, "order" | "copy" | "locale"> & { className?: string }) {
  return (
    <section data-slot="order-confirmation-delivery" className={cn(partClass, className)}>
      <h2 className={partHeading}>{copy.page.delivery}</h2>
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
  );
}

/** How it is paid: the provider's name or the card's brand, and its last four digits. */
function ReceiptPayment({
  order,
  copy,
  className,
}: Pick<OrderConfirmationTemplateProps, "order" | "copy"> & { className?: string }) {
  return (
    <section data-slot="order-confirmation-payment" className={cn(partClass, className)}>
      <h2 className={partHeading}>{copy.page.payment}</h2>
      <p className="wrap-anywhere">
        {order.payment.name ?? order.payment.brand ?? ""}
        {order.payment.last4 === undefined ? null : ` •••• ${order.payment.last4}`}
      </p>
    </section>
  );
}

/** The way back to the shop. */
function ReceiptContinue({
  continueHref,
  copy,
  prefetch,
  className,
}: Pick<OrderConfirmationTemplateProps, "continueHref" | "copy" | "prefetch"> & {
  className?: string;
}) {
  return (
    <NextLink
      href={continueHref as LinkHref}
      prefetch={prefetch}
      data-slot="order-confirmation-continue"
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "max-w-full self-start",
        className,
      )}
    >
      {copy.page.continue}
    </NextLink>
  );
}

/** The top of a layout: the thanks on the receipt, the account's heading on its order screen. */
function ReceiptTop({
  props: { account, order, copy, locale, timeZone },
  className,
}: {
  props: OrderConfirmationTemplateProps;
  className?: string;
}) {
  if (account !== undefined) return <>{account.header}</>;
  return (
    <ReceiptThanks
      order={order}
      copy={copy}
      locale={locale}
      timeZone={timeZone}
      className={className}
    />
  );
}

/** The end of a layout: the way back to the shop, or the account's ways on. */
function ReceiptEnd({
  props: { account, continueHref, copy, prefetch },
  className,
}: {
  props: OrderConfirmationTemplateProps;
  className?: string;
}) {
  if (account !== undefined) return <>{account.actions}</>;
  return (
    <ReceiptContinue
      continueHref={continueHref}
      copy={copy}
      prefetch={prefetch}
      className={className}
    />
  );
}

export {
  ReceiptContinue,
  ReceiptDelivery,
  ReceiptEnd,
  ReceiptPayment,
  ReceiptRoot,
  ReceiptShipping,
  ReceiptThanks,
  ReceiptTop,
  orderConfirmationCopy,
  partClass,
  partHeading,
  placedOn,
};
export type { OrderConfirmationCopy, OrderConfirmationTemplateProps, ReceiptOnAccount };
