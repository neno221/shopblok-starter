import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountErrorsOf,
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { makeDefaultAddress, removeAddress } from "../../../../../lib/actions/account";
import { param } from "../../../../../lib/auth-page";
import { readFlash } from "../../../../../lib/flash";
import { toAddressBook } from "../../../../../lib/view-models/account";

// D64 (T53): the address book: each address with its change page, remove and make-default forms
// (server actions that redirect back here), and the way to add one. Dynamic and blocking;
// `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.addresses.title);
}

export default async function AccountAddressesPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/addresses" />;
  const [{ signOut, ...common }, flash] = await Promise.all([
    accountProps(page, "addresses"),
    readFlash(context.url("/account/addresses"), param(query.f)),
  ]);
  return (
    <AccountTemplate
      {...common}
      screen={{ kind: "addresses", book: toAddressBook(customer, context.url) }}
      actions={{
        signOut,
        removeAddress: removeAddress.bind(null, market.key),
        defaultAddress: makeDefaultAddress.bind(null, market.key),
      }}
      errors={accountErrorsOf(flash)}
    />
  );
}
