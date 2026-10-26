import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  accountErrorsOf,
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../../lib/account-page";
import { requestReturn } from "../../../../../../lib/actions/account";
import { param } from "../../../../../../lib/auth-page";
import { readFlash } from "../../../../../../lib/flash";
import { getOrder, listReturnReasons } from "../../../../../../lib/medusa/orders";
import { toReturnRequest } from "../../../../../../lib/view-models/account";

// D64 (T53): the return form for one of the customer's orders (`getOrder` checks the owner; another's
// order is the 404, as is one with nothing left to return). `?sent=1` after a request; a failed one
// comes back with what was chosen (`?f=`). Dynamic and blocking; `noindex`.

export const instant = false;

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.return.title);
}

export default async function ReturnPage({ params, searchParams }: Props) {
  const [{ orderId: raw }, query, page] = await Promise.all([
    params,
    searchParams,
    accountPageContext(),
  ]);
  const orderId = decodeURIComponent(raw);
  const { customer, context, market } = page;
  const path = `/account/returns/${encodeURIComponent(orderId)}`;
  if (customer === null) return <SignInFirst page={page} path={path} />;
  const [{ signOut, ...common }, order, reasons, flash] = await Promise.all([
    accountProps(page, "returns"),
    getOrder(orderId, market.medusaLocale),
    listReturnReasons(),
    readFlash(context.url(path), param(query.f)),
  ]);
  if (order === null) notFound();
  const sent = flash === null && param(query.sent) === "1";
  const typed = flash?.values ?? {};
  const quantities: Record<string, number> = {};
  for (const [name, value] of Object.entries(typed))
    if (name.startsWith("items.")) quantities[name.slice("items.".length)] = Number(value) || 0;
  // Once sent, nothing may be left to return; the screen only says it was sent, over the form as
  // it stood before the request (what was asked back counted as not asked).
  const request = sent
    ? toReturnRequest(
        { ...order, lines: order.lines.map((line) => ({ ...line, returnRequested: 0 })) },
        reasons,
      )
    : toReturnRequest(order, reasons, {
        ...(typed.reason === undefined ? {} : { reason: typed.reason }),
        ...(typed.note === undefined ? {} : { note: typed.note }),
        quantities,
      });
  if (request === null) notFound();
  return (
    <AccountTemplate
      {...common}
      screen={{
        kind: "return",
        request,
        sent,
        backHref: context.url("/account/returns"),
      }}
      actions={{ signOut, requestReturn: requestReturn.bind(null, market.key) }}
      errors={accountErrorsOf(flash, "return")}
    />
  );
}
