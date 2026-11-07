// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `next-steps`
// receipt: the thanks, then what happens next as three cards (the e-mail on its way, the order being
// prepared for its delivery, and the account: an account to create for a guest, the order in the
// account for its owner, `followUp`), then where it goes, how, how it is paid and its history beside
// the summary, and the way back to the shop. On the account's order screen the cards are part of the
// thanks and are left out with it. A server component.
import { formatMessage } from "@shopblok/i18n";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { OrderSummary } from "@shopblok/ui/organisms/order-summary";
import { OrderTimeline } from "@shopblok/ui/organisms/order-timeline";
import { MailIcon, PackageIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";
import {
  ReceiptDelivery,
  ReceiptEnd,
  ReceiptPayment,
  ReceiptRoot,
  ReceiptShipping,
  ReceiptThanks,
  ReceiptTop,
  type OrderConfirmationTemplateProps,
} from "./parts";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function OrderConfirmationNextSteps(props: OrderConfirmationTemplateProps) {
  const {
    order,
    summary,
    followUp,
    copy,
    locale,
    timeZone = "UTC",
    prefetch,
    mainId = "main",
    as,
    account,
    className,
  } = props;
  const words = copy.page.nextSteps;
  const part = { order, copy, locale, timeZone };
  const titleId = `${mainId}-next-steps-title`;
  return (
    <ReceiptRoot
      variant="next-steps"
      mainId={mainId}
      as={as}
      account={account}
      className={className}
    >
      <div className="flex min-w-0 flex-col gap-10">
        {account === undefined ? (
          <>
            <ReceiptThanks {...part} />
            <section
              data-slot="order-confirmation-next-steps"
              aria-labelledby={titleId}
              className="flex min-w-0 flex-col gap-4"
            >
              <h2 id={titleId} className="text-lg leading-snug font-semibold wrap-anywhere">
                {words.title}
              </h2>
              <ol role="list" className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-3">
                <NextStep
                  icon={MailIcon}
                  title={words.email.title}
                  text={formatMessage(words.email.text, { email: order.email }, locale)}
                />
                <NextStep
                  icon={PackageIcon}
                  title={words.delivery.title}
                  text={formatMessage(
                    words.delivery.text,
                    { method: order.shippingMethod.name, city: order.shippingAddress.city ?? "" },
                    locale,
                  )}
                />
                {followUp === undefined ? null : (
                  <NextStep
                    icon={UserRoundIcon}
                    title={words[followUp.kind].title}
                    text={words[followUp.kind].text}
                  >
                    <NextLink
                      href={followUp.href as LinkHref}
                      prefetch={prefetch}
                      data-slot="order-confirmation-follow-up"
                      data-kind={followUp.kind}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "max-w-full self-start",
                      )}
                    >
                      {words[followUp.kind].action}
                    </NextLink>
                  </NextStep>
                )}
              </ol>
            </section>
          </>
        ) : (
          <ReceiptTop props={props} />
        )}
        <div className="grid min-w-0 grid-cols-1 gap-8 @4xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] @4xl:items-start @4xl:gap-x-10">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="grid min-w-0 gap-6 @xl:grid-cols-2">
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
            <ReceiptEnd props={props} />
          </div>
          <OrderSummary
            {...summary}
            copy={copy.summary}
            rowCopy={copy.rows}
            locale={locale}
            defaultOpen
          />
        </div>
      </div>
    </ReceiptRoot>
  );
}

/** One card of what happens next: its icon, its heading, its words and, for the account, its link. */
function NextStep({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      data-slot="order-confirmation-next-step"
      className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <Icon aria-hidden="true" className="size-6 text-primary" />
      <h3 className="text-base leading-snug font-semibold wrap-anywhere">{title}</h3>
      <p className="text-sm leading-snug text-muted-foreground wrap-anywhere">{text}</p>
      {children}
    </li>
  );
}

export { OrderConfirmationNextSteps };
