import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { listOrders } from "../../../../../lib/medusa/orders";
import { canReturn, toOrderTable } from "../../../../../lib/view-models/account";

// D64 (T53): the customer's orders with something to send back (of the latest 50), each linked to
// its return form. Dynamic and blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.returns.title);
}

export default async function ReturnsPage() {
  const page = await accountPageContext();
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/returns" />;
  const [{ signOut, ...common }, orders] = await Promise.all([
    accountProps(page, "returns"),
    listOrders(1, 50, market.medusaLocale),
  ]);
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "returns",
        table: toOrderTable(
          (orders?.orders ?? []).filter(canReturn),
          (order) => context.url(`/account/returns/${encodeURIComponent(order.id)}`),
          context.url("/account/orders"),
        ),
      }}
      actions={{ signOut }}
    />
  );
}
