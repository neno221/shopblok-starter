import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import {
  accountErrorsOf,
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../lib/account-page";
import { saveProfile } from "../../../../../lib/actions/account";
import { param } from "../../../../../lib/auth-page";
import { readFlash } from "../../../../../lib/flash";

// D64 (T53): the customer's name and phone; the e-mail is shown, not changed (it is the sign-in).
// `?saved=1` after a save; a failed one comes back with what was typed (`?f=`). Dynamic and
// blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.profile.title);
}

export default async function ProfilePage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/profile" />;
  const [{ signOut, ...common }, flash] = await Promise.all([
    accountProps(page, "profile"),
    readFlash(context.url("/account/profile"), param(query.f)),
  ]);
  const typed = flash?.values ?? {};
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "profile",
        email: customer.email,
        values: {
          firstName: typed.firstName ?? customer.firstName ?? "",
          lastName: typed.lastName ?? customer.lastName ?? "",
          phone: typed.phone ?? customer.phone ?? "",
        },
        saved: flash === null && param(query.saved) === "1",
      }}
      actions={{ signOut, saveProfile: saveProfile.bind(null, market.key) }}
      errors={accountErrorsOf(flash, "profile")}
    />
  );
}
