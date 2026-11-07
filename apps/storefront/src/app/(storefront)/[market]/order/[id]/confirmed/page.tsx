import {
  OrderConfirmationTemplate,
  orderConfirmationCopy,
} from "@shopblok/ui/templates/order-confirmation";
import type { ReceiptFollowUp } from "@shopblok/registry/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { getCurrentMarket } from "../../../../../../lib/current-market";
import { getMarketContext, type MarketContext } from "../../../../../../lib/market-context";
import { getCustomer } from "../../../../../../lib/medusa/customer";
import { getReceiptOrder, type OrderDto } from "../../../../../../lib/medusa/orders";
import { SHELL_PREFETCH } from "../../../../../../lib/site";
import { toOrderConfirmation } from "../../../../../../lib/view-models/checkout";
import { getShellData } from "../../../../../../components/shell/shell-data";

// D65 (T52): the receipt. Only for the order's owner: the signed-in customer whose order it is, or
// the browser that placed it (the signed receipt cookie the order action set); any other visitor
// gets the 404, the same as for an id that does not exist (`getReceiptOrder`). Dynamic and
// blocking (`instant = false`): the answer is the order or a real 404 status, never a shell that
// streams a not-found into a 200. `noindex`; the dates are in the market's time zone (D65). The
// layout is the `templates` global's (D101, T86); `next-steps` also offers the account's way on: the
// order in the account for the signed-in customer whose order it is, an account to create for a
// guest.

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    title: messages.templates.orderConfirmation.title,
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmedPage({ params }: Props) {
  const [{ id }, market, messages, { templates }] = await Promise.all([
    params,
    getCurrentMarket(),
    getMessages(),
    getShellData(),
  ]);
  const context = await getMarketContext(market.key);
  if (context === null) notFound();
  const order = await getReceiptOrder(decodeURIComponent(id), market.medusaLocale);
  if (order === null) notFound();
  const page = toOrderConfirmation(
    order,
    context.hrefs,
    messages.organisms.paymentStep.systemName,
    context.url("/store"),
  );
  if (page === null) notFound();
  const variant = templates.receipt;
  const followUp = variant === "next-steps" ? await followUpOf(order, context) : undefined;
  return (
    <OrderConfirmationTemplate
      {...page}
      {...(followUp === undefined ? {} : { followUp })}
      variant={variant}
      copy={orderConfirmationCopy(messages)}
      locale={market.htmlLang}
      timeZone={market.timeZone}
      prefetch={SHELL_PREFETCH}
    />
  );
}

/** The `next-steps` layout's third card (T86): the account's order, or an account to create. */
async function followUpOf(order: OrderDto, context: MarketContext): Promise<ReceiptFollowUp> {
  const customer = await getCustomer();
  return customer !== null && order.customerId === customer.id
    ? {
        kind: "account-order",
        href: context.url(`/account/orders/${encodeURIComponent(order.id)}`),
      }
    : { kind: "register", href: context.url("/register") };
}
