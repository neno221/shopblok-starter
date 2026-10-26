import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { param } from "../../../../../lib/auth-page";
import { listOrders } from "../../../../../lib/medusa/orders";
import { toOrderTable } from "../../../../../lib/view-models/account";

// D64 (T53): the customer's orders, ten a page (`?page=n`), newest first. A page after the last is
// the 404. Dynamic and blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.orders.title);
}

export default async function AccountOrdersPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market } = page;
  const requested = param(query.page) ?? "1";
  const number = /^[1-9]\d{0,4}$/.test(requested) ? Number(requested) : null;
  if (number === null) notFound();
  if (customer === null)
    return (
      <SignInFirst
        page={page}
        path={number === 1 ? "/account/orders" : `/account/orders?page=${number}`}
      />
    );
  const [{ signOut, ...common }, orders] = await Promise.all([
    accountProps(page, "orders"),
    listOrders(number, 10, market.medusaLocale),
  ]);
  if (orders === null || (number > orders.pageCount && number > 1)) notFound();
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "orders",
        table: toOrderTable(
          orders.orders,
          (order) => context.url(`/account/orders/${encodeURIComponent(order.id)}`),
          context.url("/store"),
        ),
        page: { page: number, pageCount: orders.pageCount },
        pageHref: context.url("/account/orders"),
        lookupHref: context.url("/order/lookup"),
      }}
      actions={{ signOut }}
    />
  );
}
