import { OrderLookupTemplate, orderLookupCopy } from "@shopblok/ui/templates/order-lookup";
import type { Metadata } from "next";
import { accountPageContext } from "../../../../../lib/account-page";
import { claimGuestOrder } from "../../../../../lib/actions/account";
import { noindexMetadata, param } from "../../../../../lib/auth-page";
import { readFlash, type Flash } from "../../../../../lib/flash";
import { SHELL_PREFETCH } from "../../../../../lib/site";

// D64 (T53): the claim of an order placed as a guest, by its number and its e-mail. A signed-in
// customer (verified: a customer exists only once verified) sends the claim (`claimGuestOrder`),
// which e-mails the order's address a link to accept; the answer is "sent" whether or not the
// details match an order, so the form tells nobody which orders exist. Anyone else is asked to
// sign in or register. Dynamic and blocking; `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  return noindexMetadata((templates) => templates.orderLookup.title);
}

const FORM_ERRORS = new Set(["mine", "rejected", "unavailable"]);

function errorsOf(flash: Flash | null) {
  if (flash === null) return {};
  const fields = flash.errors ?? {};
  return {
    ...(flash.form === undefined
      ? {}
      : {
          form: (FORM_ERRORS.has(flash.form) ? flash.form : "rejected") as
            "mine" | "rejected" | "unavailable",
        }),
    ...(fields.number === undefined
      ? {}
      : {
          number:
            (flash.values?.number ?? "").trim() === ""
              ? ("required" as const)
              : ("invalid" as const),
        }),
    ...(fields.email === undefined
      ? {}
      : {
          email:
            (flash.values?.email ?? "").trim() === ""
              ? ("required" as const)
              : ("pattern" as const),
        }),
  };
}

export default async function OrderLookupPage({ searchParams }: Props) {
  const [query, page] = await Promise.all([searchParams, accountPageContext()]);
  const { customer, context, market, messages, hrefs } = page;
  const shared = {
    variant: "default" as const,
    copy: orderLookupCopy(messages),
    locale: market.htmlLang,
    prefetch: SHELL_PREFETCH,
  };
  if (customer === null)
    return (
      <OrderLookupTemplate
        {...shared}
        screen={{ kind: "sign-in", loginHref: hrefs.login, registerHref: hrefs.register }}
      />
    );
  const flash = await readFlash(context.url("/order/lookup"), param(query.f));
  return (
    <OrderLookupTemplate
      {...shared}
      screen={{
        kind: "lookup",
        values: { number: flash?.values?.number ?? "", email: flash?.values?.email ?? "" },
        sent: flash === null && param(query.sent) === "1",
        accountHref: hrefs.account,
      }}
      action={claimGuestOrder.bind(null, market.key)}
      errors={errorsOf(flash)}
    />
  );
}
