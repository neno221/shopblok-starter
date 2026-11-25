import { AccountTemplate, type AccountErrors } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountErrorsOf,
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { removePaymentMethod } from "../../../../../lib/actions/account";
import { regionStripeKey } from "../../../../../lib/medusa/payment";
import { param } from "../../../../../lib/auth-page";
import { readFlash } from "../../../../../lib/flash";
import { listSavedMethods } from "../../../../../lib/medusa/payment-methods";
import { toSavedPaymentMethods } from "../../../../../lib/view-models/checkout";

// D64 (T53), M6 D119 (T101): the signed-in customer's saved payment methods (Stripe's, through the
// backend's `/store/customers/me/payment-methods`), each with its remove button (a dialog, or
// without scripts the page that asks, `remove/`), and "Add a payment method" (`new/`) where the
// market takes Stripe. The return from Stripe (`?added=1`, with Stripe's `redirect_status` when the
// method had its own page) and a removal (`?removed=1`) say so. Dynamic and blocking; `noindex`;
// the sign-in in its place for anyone not signed in.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.paymentMethods.title);
}

export default async function PaymentMethodsPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/payment-methods" />;
  const [{ signOut, ...common }, flash, methods, stripe] = await Promise.all([
    accountProps(page, "payment-methods"),
    readFlash(context.url("/account/payment-methods"), param(query.f)),
    listSavedMethods(),
    regionStripeKey(context.region.id),
  ]);
  const redirect = param(query.redirect_status);
  const status =
    param(query.removed) === "1"
      ? ("removed" as const)
      : param(query.added) === "1" && (redirect === undefined || redirect === "succeeded")
        ? ("added" as const)
        : undefined;
  const errors: AccountErrors =
    param(query.added) === "1" && redirect === "failed"
      ? { form: "rejected" }
      : accountErrorsOf(flash);
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "payment-methods",
        wallet: {
          cards: toSavedPaymentMethods(methods),
          ...(stripe === null ? {} : { addHref: context.url("/account/payment-methods/new") }),
        },
        ...(status === undefined ? {} : { status }),
        removeHref: context.url("/account/payment-methods/remove"),
      }}
      actions={{ signOut, removePaymentMethod: removePaymentMethod.bind(null, market.key) }}
      errors={errors}
    />
  );
}
