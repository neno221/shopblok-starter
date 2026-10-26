import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../../lib/account-page";
import { getOrder } from "../../../../../../lib/medusa/orders";
import { toAccountOrder } from "../../../../../../lib/view-models/account";

// D64 (T53): one of the customer's orders, with its history and the way to return it. Only the
// customer's own: `getOrder` checks the order's customer against the signed-in one, and another's
// order is the same 404 as one that does not exist. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.orders.title);
}

export default async function AccountOrderPage({ params }: Props) {
  const [{ id }, page] = await Promise.all([params, accountPageContext()]);
  const { customer, context, market, messages } = page;
  const path = `/account/orders/${encodeURIComponent(id)}`;
  if (customer === null) return <SignInFirst page={page} path={path} />;
  const [{ signOut, ...common }, order] = await Promise.all([
    accountProps(page, "orders"),
    getOrder(id, market.medusaLocale),
  ]);
  if (order === null) notFound();
  const screen = toAccountOrder(
    order,
    context.hrefs,
    messages.organisms.paymentStep.systemName,
    context.url("/account/orders"),
    context.url(`/account/returns/${encodeURIComponent(order.id)}`),
  );
  if (screen === null) notFound();
  return <AccountTemplate {...common} screen={screen} actions={{ signOut }} />;
}
