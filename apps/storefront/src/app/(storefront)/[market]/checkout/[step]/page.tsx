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
import { ShoppingBagIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMessages } from "next-intl/server";
import { placeOrder, submitContact, submitDelivery } from "../../../../../lib/actions/checkout";
import { readCheckoutCart } from "../../../../../lib/checkout-cart";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { readFlash, type Flash } from "../../../../../lib/flash";
import { getMarketContext, type MarketContext } from "../../../../../lib/market-context";
import type { CartDto } from "../../../../../lib/medusa/cart";
import { getCustomer } from "../../../../../lib/medusa/customer";
import { listShippingOptions } from "../../../../../lib/medusa/fulfillment";
import { SHELL_PREFETCH } from "../../../../../lib/site";
import {
  canOpen,
  firstOpenStep,
  formCountries,
  toAddressFormState,
  toCheckoutSteps,
  toPaymentStep,
  toReviewStep,
  toShippingOption,
  type CheckoutStepId,
} from "../../../../../lib/view-models/checkout";

// D65 (T52): one checkout step per page (`contact`, `delivery`, `review`), each a plain form that
// posts to a server action bound to the market (`lib/actions/forms.ts`), which goes on to the next
// step or comes back here with a flash under `?f=`. Dynamic and blocking (`instant = false`, no
// `Suspense`): the step is in the HTML, which a browser without scripts needs (a streamed hole is
// swapped in by a script). The three steps are the static params, so another is a real 404 before
// anything is read. Nothing here redirects (under Cache Components a page's `redirect()` reaches
// the browser in the RSC payload, which needs scripts): a step whose steps before it are not done
// draws the first one that is not, saying so, and an empty cart draws the way back to the shop.
// `noindex`.

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
  if (fields.paymentMethod !== undefined) errors.payment = "required";
  return errors;
}

export default async function CheckoutStepPage({ params, searchParams }: Props) {
  const [{ step: requested }, query, market, messages] = await Promise.all([
    params,
    searchParams,
    getCurrentMarket(),
    getMessages(),
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
  const { cart, view } = read;
  const shown = canOpen(cart, requested) ? requested : firstOpenStep(cart);
  const stepHref = (id: CheckoutStepId) => context.url(`/checkout/${id}`);
  const key = typeof query.f === "string" ? query.f : undefined;
  const flash = shown === requested ? await readFlash(stepHref(shown), key) : null;
  const content = await stepOf(shown, cart, context, messages, flash);
  if (content === null) notFound();
  const checkout = toCheckoutSteps(view, cart, shown, words.steps, stepHref);
  const action =
    shown === "contact" ? submitContact : shown === "delivery" ? submitDelivery : placeOrder;
  const errors: CheckoutErrors = shown === requested ? errorsOf(flash) : { form: "incomplete" };
  // The delivery estimates count from now: this request's, never the prerender's.
  await connection();
  const now = new Date().toISOString();
  return (
    <CheckoutTemplate
      variant="default"
      checkout={checkout}
      step={content}
      copy={checkoutCopy(messages)}
      locale={market.htmlLang}
      now={now}
      action={action.bind(null, market.key)}
      errors={errors}
      prefetch={SHELL_PREFETCH}
    />
  );
}

/** The step's content from the cart, and what a failed submit typed. */
async function stepOf(
  step: CheckoutStepId,
  cart: CartDto,
  context: MarketContext,
  messages: Messages,
  flash: Flash | null,
): Promise<CheckoutPage["step"] | null> {
  const { market, region } = context;
  if (step === "contact") {
    // A signed-in customer's e-mail and default shipping address fill a cart that has none yet (T53).
    const customer =
      cart.email === null || cart.shippingAddress === null ? await getCustomer() : null;
    const saved =
      customer?.addresses.find((address) => address.isDefaultShipping) ??
      customer?.addresses[0] ??
      null;
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
      payment: toPaymentStep(),
      addressHref: context.url("/checkout/contact"),
    };
  }
  return toReviewStep(cart, messages.organisms.paymentStep.systemName, {
    contact: context.url("/checkout/contact"),
    delivery: context.url("/checkout/delivery"),
  });
}
