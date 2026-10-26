import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../lib/account-page";
import { listOrders } from "../../../../lib/medusa/orders";
import { toOrderTable } from "../../../../lib/view-models/account";

// D64 (T53): the account's first page: the greeting, the three latest orders and the ways on. For
// the signed-in customer only; anyone else gets the sign-in in its place, coming back here (a page
// cannot redirect without scripts). Dynamic and blocking (`instant = false`); `noindex`.

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.overview.title);
}

export default async function AccountPage() {
  const page = await accountPageContext();
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account" />;
  const [{ signOut, ...common }, recent] = await Promise.all([
    accountProps(page, "overview"),
    listOrders(1, 3, market.medusaLocale),
  ]);
  const orderHref = (id: string) => context.url(`/account/orders/${encodeURIComponent(id)}`);
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "overview",
        ...(customer.firstName === null ? {} : { firstName: customer.firstName }),
        email: customer.email,
        recent: toOrderTable(
          recent?.orders ?? [],
          (order) => orderHref(order.id),
          context.url("/store"),
        ),
        ordersHref: context.url("/account/orders"),
        addressesHref: context.url("/account/addresses"),
        profileHref: context.url("/account/profile"),
        lookupHref: context.url("/order/lookup"),
      }}
      actions={{ signOut }}
    />
  );
}
