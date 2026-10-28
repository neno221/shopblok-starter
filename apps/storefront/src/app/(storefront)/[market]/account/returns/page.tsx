import type { Metadata } from "next";
import {
  accountMetadata,
  accountPageContext,
  ReturnsList,
  SignInFirst,
} from "../../../../../lib/account-page";

// D64 (T53): the customer's orders with something to send back, each linked to its return form
// (`ReturnsList`). Dynamic and blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.returns.title);
}

export default async function ReturnsPage() {
  const page = await accountPageContext();
  if (page.customer === null) return <SignInFirst page={page} path="/account/returns" />;
  return <ReturnsList page={page} />;
}
