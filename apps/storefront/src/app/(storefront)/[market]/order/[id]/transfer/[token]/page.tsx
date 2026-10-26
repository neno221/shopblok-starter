import { OrderLookupTemplate, orderLookupCopy } from "@shopblok/ui/templates/order-lookup";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { answerTransfer } from "../../../../../../../lib/actions/account";
import { authPageContext, param } from "../../../../../../../lib/auth-page";
import { getOrderNumber } from "../../../../../../../lib/medusa/orders";
import { SHELL_PREFETCH } from "../../../../../../../lib/site";

// D64 (T53): the link the claim e-mails to the order's address (`order-transfer-requested`
// subscriber): accept the claim or decline it. Whoever holds the link answers; Medusa checks the
// token (accept and decline need no sign-in). The answer comes back here as `?done=`. An order
// that does not exist is the 404. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = {
  params: Promise<{ id: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.templates.orderLookup.title, robots: { index: false, follow: false } };
}

const OUTCOMES = new Set(["accepted", "declined", "failed"] as const);

export default async function OrderTransferPage({ params, searchParams }: Props) {
  const [{ id, token }, query, page] = await Promise.all([params, searchParams, authPageContext()]);
  const { market, messages, context } = page;
  const orderId = decodeURIComponent(id);
  const shared = {
    variant: "default" as const,
    copy: orderLookupCopy(messages),
    locale: market.htmlLang,
    prefetch: SHELL_PREFETCH,
  };
  const done = param(query.done) as "accepted" | "declined" | "failed" | undefined;
  if (done !== undefined && OUTCOMES.has(done))
    return (
      <OrderLookupTemplate
        {...shared}
        screen={{ kind: "transfer-done", outcome: done, homeHref: context.url("/") }}
      />
    );
  const number = await getOrderNumber(orderId);
  if (number === null) notFound();
  return (
    <OrderLookupTemplate
      {...shared}
      screen={{ kind: "transfer", displayId: number }}
      action={answerTransfer.bind(null, market.key, orderId, decodeURIComponent(token))}
    />
  );
}
