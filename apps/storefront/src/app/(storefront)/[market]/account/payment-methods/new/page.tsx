import { AccountTemplate } from "@shopblok/ui/templates/account";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetupElementIsland } from "../../../../../../components/account/setup-element-island";
import {
  accountMetadata,
  accountPageContext,
  accountProps,
  SignInFirst,
} from "../../../../../../lib/account-page";
import { regionStripeKey } from "../../../../../../lib/medusa/payment";

// M6 D119 (T101): "Add a payment method": Stripe's Payment Element for a SetupIntent of the
// customer's (`SetupElementIsland`), only where the market takes Stripe (a 404 elsewhere, and the
// list has no link here). Without scripts the template's notice says adding needs them. Dynamic and
// blocking; `noindex`; the sign-in in its place for anyone not signed in.

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return accountMetadata((account) => account.paymentMethods.title);
}

export default async function NewPaymentMethodPage() {
  const page = await accountPageContext();
  const { customer, context, market, messages } = page;
  if (customer === null) return <SignInFirst page={page} path="/account/payment-methods/new" />;
  const [{ signOut, ...common }, stripe] = await Promise.all([
    accountProps(page, "payment-methods"),
    regionStripeKey(context.region.id),
  ]);
  if (stripe === null) notFound();
  const words = messages.templates.account.paymentMethods;
  return (
    <AccountTemplate
      {...common}
      screen={{ kind: "payment-method-new", backHref: context.url("/account/payment-methods") }}
      actions={{ signOut }}
      slots={{
        setupElement: (
          <SetupElementIsland
            market={market.key}
            publishableKey={stripe}
            locale={market.htmlLang}
            returnTo={context.url("/account/payment-methods")}
            words={{
              noScript: words.noScript,
              submit: words.submit,
              saving: words.saving,
              failed: words.failed,
            }}
          />
        ),
      }}
    />
  );
}
