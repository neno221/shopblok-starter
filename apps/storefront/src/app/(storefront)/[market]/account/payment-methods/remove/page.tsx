import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../../lib/account-page";
import { removePaymentMethod } from "../../../../../../lib/actions/account";
import { param } from "../../../../../../lib/auth-page";
import { listSavedMethods } from "../../../../../../lib/medusa/payment-methods";
import { toSavedPaymentMethod } from "../../../../../../lib/view-models/checkout";

// M6 D119 (T101): the question before a saved method is removed, for a browser without scripts (the
// list's remove button is then a GET form here, `?paymentMethodId=`); its form posts the same
// action as the list's dialog. Another's id, or one already gone, is the 404. Dynamic and blocking;
// `noindex`; the sign-in in its place for anyone not signed in (back to the list after).

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.paymentMethods.title);
}

export default async function RemovePaymentMethodPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/payment-methods" />;
  const id = param(query.paymentMethodId);
  const [{ signOut, ...common }, methods] = await Promise.all([
    accountProps(page, "payment-methods"),
    listSavedMethods(),
  ]);
  const found = methods.find((method) => method.id === id);
  const card = found === undefined ? null : toSavedPaymentMethod(found);
  if (card === null) notFound();
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "payment-method-remove",
        card,
        backHref: context.url("/account/payment-methods"),
      }}
      actions={{ signOut, removePaymentMethod: removePaymentMethod.bind(null, market.key) }}
    />
  );
}
