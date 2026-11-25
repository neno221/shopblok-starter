import type { Messages } from "@shopblok/i18n";
import { CHECKOUT_STEP_IDS, type CheckoutPage } from "@shopblok/registry/contracts";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import {
  CheckoutTemplate,
  checkoutCopy,
  type CheckoutError,
  type CheckoutErrors,
} from "@shopblok/ui/templates/checkout";
import type { AddressFormErrors } from "@shopblok/ui/molecules/address-form";
import { checkoutIds } from "@shopblok/ui/templates/checkout/ids";
import { ShoppingBagIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMessages } from "next-intl/server";
import { placeOrder, submitContact, submitDelivery } from "../../../../../lib/actions/checkout";
import { readCheckoutCart } from "../../../../../lib/checkout-cart";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { readFlash, type Flash } from "../../../../../lib/flash";
import { getShellData } from "../../../../../components/shell/shell-data";
import { getMarketContext, type MarketContext } from "../../../../../lib/market-context";
import type { CartDto } from "../../../../../lib/medusa/cart";
import { getCustomer } from "../../../../../lib/medusa/customer";
import { listShippingOptions } from "../../../../../lib/medusa/fulfillment";
import {
  listPaymentProviders,
  paysWithStripe,
  stripePublishableKey,
} from "../../../../../lib/medusa/payment";
import { listSavedMethods } from "../../../../../lib/medusa/payment-methods";
import { PaymentElementIsland } from "../../../../../components/checkout/stripe/payment-element-island";
import { PlaceOrderIsland } from "../../../../../components/checkout/stripe/place-order-island";
import { ExpressCheckoutIsland } from "../../../../../components/checkout/stripe/express";
import { SHELL_PREFETCH } from "../../../../../lib/site";
import {
  canOpen,
  firstOpenStep,
  formCountries,
  ownsKeptPayment,
  savedAddressFor,
  toAddressFormState,
  toCheckoutDone,
  toCheckoutSteps,
  toPaymentStep,
  toReviewStep,
  toSavedPaymentMethods,
  type SavedChoice,
  paymentNames,
  toExpressRates,
  toShippingOption,
  withoutKeptPayment,
  type CheckoutStepId,
} from "../../../../../lib/view-models/checkout";
import { TrackOnView } from "../../../../../lib/analytics/track-on-view";

// D65 (T52): one checkout step per page (`contact`, `delivery`, `review`), each a plain form that
// posts to a server action bound to the market (`lib/actions/forms.ts`), which goes on to the next
// step or comes back here with a flash under `?f=`. Dynamic and blocking (`instant = false`, no
// `Suspense`): the step is in the HTML, which a browser without scripts needs (a streamed hole is
// swapped in by a script). The three steps are the static params, so another is a real 404 before
// anything is read. Nothing here redirects (under Cache Components a page's `redirect()` reaches
// the browser in the RSC payload, which needs scripts): a step whose steps before it are not done
// draws the first one that is not, saying so, and an empty cart draws the way back to the shop.
// `noindex`. The layout is the `templates` global's (D101, T86): `one-page` draws the three steps
// here, the step in the path open and the ones before it summed up (`done`), each with its "Edit"
// link to its step's anchor; each action comes back at the next step's anchor (`stepAnchor`).

export const instant = false;

export function generateStaticParams(): { step: CheckoutStepId }[] {
  return CHECKOUT_STEP_IDS.map((step) => ({ step }));
}

type Props = {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.organisms.checkoutSteps.title, robots: { index: false, follow: false } };
}

const isStep = (value: string): value is CheckoutStepId =>
  (CHECKOUT_STEP_IDS as readonly string[]).includes(value);

const FORM_ERRORS = new Set<CheckoutError>(["not-found", "rejected", "unavailable", "incomplete"]);

/** A failed step's answer as the template's errors. */
function errorsOf(flash: Flash | null): CheckoutErrors {
  if (flash === null) return {};
  const fields = flash.errors ?? {};
  const errors: CheckoutErrors = {};
  if (flash.form !== undefined)
    errors.form = FORM_ERRORS.has(flash.form as CheckoutError)
      ? (flash.form as CheckoutError)
      : "rejected";
  const email = fields.email;
  if (email !== undefined)
    errors.email = (flash.values?.email ?? "").trim() === "" ? "required" : "pattern";
  const address: AddressFormErrors = {};
  for (const [name, kind] of Object.entries(fields))
    if (name !== "email" && name !== "shippingOption" && name !== "paymentMethod")
      address[name as keyof AddressFormErrors] =
        kind === "required" || kind === "pattern" ? kind : "invalid";
  if (Object.keys(address).length > 0) errors.address = address;
  if (fields.shippingOption !== undefined) errors.shipping = "required";
  // M6 D117: the return from a payment Stripe refused (`/api/payment-return`), with its reason.
  const payment = fields.paymentMethod;
  if (payment !== undefined)
    errors.payment = payment === "declined" || payment === "unpaid" ? payment : "required";
  const reason = flash.values?.paymentReason;
  if (payment === "declined" && reason !== undefined && reason !== "")
    errors.paymentReason = reason;
  return errors;
}

export default async function CheckoutStepPage({ params, searchParams }: Props) {
  const [{ step: requested }, query, market, messages, { templates }] = await Promise.all([
    params,
    searchParams,
    getCurrentMarket(),
    getMessages(),
    getShellData(),
  ]);
  if (!isStep(requested)) notFound();
  const context = await getMarketContext(market.key);
  if (context === null) notFound();
  const read = await readCheckoutCart(market.key);
  const words = messages.templates.checkout;
  if (read === null || read.cart === null || read.cart.lines.length === 0)
    return (
      <main
        id="main"
        className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:px-6 md:py-12 lg:px-8"
      >
        <EmptyState
          icon={ShoppingBagIcon}
          title={words.empty.title}
          text={words.empty.text}
          action={{ label: words.empty.continue, href: context.url("/store") }}
          headingLevel={2}
          prefetch={SHELL_PREFETCH}
        />
      </main>
    );
  const { view } = read;
  // M6 D119: a saved method, or saving, only for the cart's own signed-in customer (PR 142 review,
  // item 2). For anyone else (signed out, or the session lapsed) the page draws the cart as if no
  // payment was kept, so the review goes back to the payment; "Place order" forgets it on the cart.
  const kept = read.cart;
  const caller = kept.savedMethod === null && !kept.paymentSave ? null : await getCustomer();
  const cart = ownsKeptPayment(kept, caller?.id ?? null) ? kept : withoutKeptPayment(kept);
  const shown = canOpen(cart, requested) ? requested : firstOpenStep(cart);
  const stepHref = (id: CheckoutStepId) => context.url(`/checkout/${id}`);
  const key = typeof query.f === "string" ? query.f : undefined;
  const flash = shown === requested ? await readFlash(stepHref(shown), key) : null;
  // M6 D117: Stripe takes the payment when the region offers it and there is a total to pay.
  const providers = await listPaymentProviders(context.region.id);
  const publishableKey = stripePublishableKey();
  const stripe =
    publishableKey !== null && paysWithStripe(providers, cart.total.amount) ? publishableKey : null;
  const content = await stepOf(shown, cart, context, messages, flash, stripe !== null);
  if (content === null) notFound();
  const unpaid = messages.organisms.paymentStep.errors.unpaid;
  const variant = templates.checkout;
  // M6 T102 (D120): the express rail's wallets, with Stripe on, on the contact step of the
  // `express-rail` layout, for a cart with a shipping option a wallet can offer.
  const rates =
    stripe !== null && variant === "express-rail" && content.kind === "contact"
      ? toExpressRates(
          await listShippingOptions(cart.id, cart.currencyCode, market.medusaLocale),
          cart.shippingMethod?.optionId,
        )
      : [];
  const slots =
    stripe === null
      ? undefined
      : content.kind === "contact"
        ? rates.length === 0
          ? undefined
          : {
              express: (
                <ExpressCheckoutIsland
                  market={market.key}
                  publishableKey={stripe}
                  locale={market.htmlLang}
                  currency={cart.currencyCode}
                  amount={cart.total.amount}
                  countries={[...context.region.countries]}
                  rates={rates}
                  words={{
                    address: words.express.address,
                    changed: words.express.changed,
                    failed: words.express.failed,
                  }}
                />
              ),
            }
        : content.kind === "delivery"
          ? {
              paymentElement: (
                <PaymentElementIsland
                  publishableKey={stripe}
                  locale={market.htmlLang}
                  currency={cart.currencyCode}
                  base={cart.total.amount - (cart.shippingMethod?.amount.amount ?? 0)}
                  shipping={Object.fromEntries(
                    content.options.map((option) => [option.id, option.price.amount]),
                  )}
                  {...(content.selected === undefined ? {} : { selected: content.selected })}
                  saving={content.payment.saveForLater}
                  words={{ noScript: messages.organisms.paymentStep.noScript, failed: unpaid }}
                />
              ),
            }
          : content.kind === "review" && (cart.paymentToken !== null || cart.savedMethod !== null)
            ? {
                placeOrder: (
                  <PlaceOrderIsland
                    market={market.key}
                    publishableKey={stripe}
                    locale={market.htmlLang}
                    words={{ failed: unpaid }}
                  />
                ),
              }
            : undefined;
  // T86: `one-page` sums up the steps done, each "Edit" opening its step at its anchor.
  const anchor = (id: CheckoutStepId) => `${stepHref(id)}#${checkoutIds("main").step(id)}`;
  const done =
    variant === "one-page"
      ? toCheckoutDone(cart, shown, paymentNames(messages), {
          contact: anchor("contact"),
          delivery: anchor("delivery"),
        })
      : undefined;
  const checkout = toCheckoutSteps(view, cart, shown, words.steps, stepHref);
  const action =
    shown === "contact" ? submitContact : shown === "delivery" ? submitDelivery : placeOrder;
  const errors: CheckoutErrors = shown === requested ? errorsOf(flash) : { form: "incomplete" };
  // The delivery estimates count from now: this request's, never the prerender's.
  await connection();
  const now = new Date().toISOString();
  return (
    <>
      {/* D124: `checkout_started`, once per cart in a tab, only with a key and consent. */}
      <TrackOnView
        event="checkout_started"
        once={view.id}
        properties={{
          items: view.itemCount,
          total: view.total.amount,
          currency: view.currencyCode,
        }}
      />
      <CheckoutTemplate
        variant={variant}
        checkout={checkout}
        step={content}
        {...(done === undefined ? {} : { done })}
        copy={checkoutCopy(messages)}
        locale={market.htmlLang}
        now={now}
        action={action.bind(null, market.key)}
        errors={errors}
        {...(slots === undefined ? {} : { slots })}
        prefetch={SHELL_PREFETCH}
      />
    </>
  );
}

/**
 * M6 D119 (T101): a signed-in customer's saved methods and "Save this card for next time", only on
 * their own cart (a guest's, or a cart that is not theirs, gets neither: the backend refuses both
 * there too); the method the cart pays with, or a failed submit's choice, chosen.
 */
async function savedChoiceFor(
  cart: CartDto,
  flash: Flash | null,
): Promise<SavedChoice | undefined> {
  if (cart.customerId === null) return undefined;
  const customer = await getCustomer();
  if (customer === null || customer.id !== cart.customerId) return undefined;
  const saved = toSavedPaymentMethods(await listSavedMethods());
  const chosen = flash?.values?.paymentMethod ?? cart.savedMethod ?? undefined;
  return {
    saved,
    canSave: true,
    saveForLater: cart.paymentSave,
    ...(chosen === undefined ? {} : { selected: chosen }),
  };
}

/** The step's content from the cart, and what a failed submit typed. */
async function stepOf(
  step: CheckoutStepId,
  cart: CartDto,
  context: MarketContext,
  messages: Messages,
  flash: Flash | null,
  stripe: boolean,
): Promise<CheckoutPage["step"] | null> {
  const { market, region } = context;
  if (step === "contact") {
    // A signed-in customer's e-mail and default shipping address fill a cart that has none yet (T53).
    const customer =
      cart.email === null || cart.shippingAddress === null ? await getCustomer() : null;
    const saved = customer === null ? null : savedAddressFor(customer, region.countries);
    return {
      kind: "contact",
      email: flash?.values?.email ?? cart.email ?? customer?.email ?? "",
      address: toAddressFormState(
        formCountries(market.country, region.countries),
        cart.shippingAddress ?? saved,
        flash?.values,
      ),
    };
  }
  if (step === "delivery") {
    const options = await listShippingOptions(cart.id, cart.currencyCode, market.medusaLocale);
    const offered = options.map((option) => toShippingOption(option, cart.currencyCode));
    const chosen = flash?.values?.shippingOption ?? cart.shippingMethod?.optionId;
    return {
      kind: "delivery",
      options: offered,
      ...(offered.some((option) => option.id === chosen) ? { selected: chosen } : {}),
      payment: stripe
        ? toPaymentStep(
            messages.organisms.paymentStep.stripeName,
            await savedChoiceFor(cart, flash),
          )
        : toPaymentStep(),
      addressHref: context.url("/checkout/contact"),
    };
  }
  return toReviewStep(cart, paymentNames(messages), {
    contact: context.url("/checkout/contact"),
    delivery: context.url("/checkout/delivery"),
  });
}
