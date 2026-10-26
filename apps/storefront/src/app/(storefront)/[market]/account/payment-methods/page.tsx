import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";

// D64 (T53): the saved payment methods: the empty wallet until M6's card payments (no way to add
// one yet). Dynamic and blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.paymentMethods.title);
}

export default async function PaymentMethodsPage() {
  const page = await accountPageContext();
  if (page.customer === null) return <SignInFirst page={page} path="/account/payment-methods" />;
  const { signOut, ...common } = await accountProps(page, "payment-methods");
  return (
    <AccountTemplate
      {...common}
      screen={{ kind: "payment-methods", wallet: { cards: [] } }}
      actions={{ signOut }}
    />
  );
}
