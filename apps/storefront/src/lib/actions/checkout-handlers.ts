import "server-only";
import { addressFormat, type AddressFieldName } from "@shopblok/i18n";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { MarketContext } from "../market-context";
import {
  completeCart,
  ensurePaymentSession,
  forgetKeptPayment,
  getCart,
  initiatePayment,
  keepPaymentToken,
  keepSavedMethod,
  moveCart,
  prepareCompletion,
  sessionDataOf,
  setAddresses,
  setEmail,
  setShippingMethod,
  type CartDto,
} from "../medusa/cart";
import { setReceipt } from "../medusa/cookies";
import { getCustomer } from "../medusa/customer";
import { mailTarget } from "../markets";
import { listShippingOptions } from "../medusa/fulfillment";
import {
  listPaymentProviders,
  paysWithStripe,
  STRIPE_PAYMENT_PROVIDER,
  SYSTEM_PAYMENT_PROVIDER,
} from "../medusa/payment";
import { toAddressInput } from "../view-models/address";
import { ownsKeptPayment } from "../view-models/checkout";
import { action, ActionError, FieldsError, type FieldError } from "./action";
import { contextFor, formText as text, marketKey } from "./inputs";

// The checkout's actions (D65, T52): one per step, each on the visitor's own cart (the cookie's,
// never an id from the form) in the market's region and language. Each checks what Medusa would
// take anyway, so the shopper reads why in their language: the address against its country's
// format (`addressFormat`: the required fields, `city` only where the country has one, the postal
// code's pattern), the country against the region's, the shipping option against the cart's own
// options and the payment against the region's providers. `updateTag("cart")` after each change.

const id = z.string().min(1).max(128);
/**
 * The visitor's open cart with at least one line, in this market's region and language (D65: a
 * cart from another country moves to this region, one in another language keeps its lines and
 * takes this locale; `moveCart`'s rule). The checkout has nothing to do without one.
 */
export async function requireCart(context: MarketContext): Promise<CartDto> {
  const existing = await getCart(context.market.medusaLocale);
  if (existing === null || existing.lines.length === 0)
    throw new ActionError("not-found", "the visitor has no cart to check out");
  return moveCart(existing, {
    regionId: context.region.id,
    locale: context.market.medusaLocale,
  });
}

const addressFields = {
  firstName: text(100),
  lastName: text(100),
  company: text(100),
  address1: text(200),
  address2: text(200),
  city: text(100),
  province: text(100),
  postalCode: text(20),
  phone: text(40),
};

export const contactSchema = z.object({
  market: marketKey,
  // Medusa keeps an e-mail in lower case (checked on the stack: `Probe@Example.com` is stored
  // `probe@example.com`), so the cart's is written as Medusa will keep it (T53's verification
  // compares exactly, PR 76 review).
  email: z.string().trim().toLowerCase().pipe(z.email()),
  countryCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}$/),
  ...addressFields,
});

type AddressValues = Omit<z.output<typeof contactSchema>, "market" | "email">;

/**
 * What the country's format refuses in an address (D65, T34): a required field left empty (`city`
 * only where the country's format has a city: not in AE, GI, JP, KY, MO, NR or SG), a postal code
 * that does not match its pattern, a country outside the region. Fields the format does not draw are
 * dropped by the caller, not refused.
 */
export function addressErrors(
  address: AddressValues,
  countries: readonly string[],
  locale: string,
): Partial<Record<string, FieldError>> {
  if (!countries.includes(address.countryCode)) return { countryCode: "invalid" };
  const format = addressFormat(address.countryCode, locale);
  const errors: Partial<Record<string, FieldError>> = {};
  for (const field of format.required) if (address[field] === undefined) errors[field] = "required";
  const pattern = format.postalCode?.pattern;
  if (
    address.postalCode !== undefined &&
    pattern !== undefined &&
    !new RegExp(`^(?:${pattern})$`, "iu").test(address.postalCode)
  )
    errors.postalCode = "pattern";
  return errors;
}

/** The address with only the fields its country's format has (and the phone), the postal code upper-cased. */
export function keepFormatFields(address: AddressValues, locale: string): AddressValues {
  const drawn = new Set<AddressFieldName>(addressFormat(address.countryCode, locale).rows.flat());
  const kept: AddressValues = { countryCode: address.countryCode, phone: address.phone };
  for (const field of Object.keys(addressFields) as (keyof typeof addressFields)[])
    if (field !== "phone" && drawn.has(field)) kept[field] = address[field];
  // Matched case-insensitively, kept as a postal service writes it: `ec1y 8sy` is `EC1Y 8SY`
  // (address-format.ts: "the server normalises it"; PR 80 review, item 2).
  if (kept.postalCode !== undefined) kept.postalCode = kept.postalCode.toUpperCase();
  return kept;
}

/** Step 1: the e-mail and the shipping address (the billing one is the same in M3). */
export const contactAction = action(contactSchema, async ({ market, email, ...address }) => {
  const context = await contextFor(market);
  const locale = context.market.htmlLang;
  const errors = addressErrors(address, context.region.countries, locale);
  if (Object.keys(errors).length > 0) throw new FieldsError(errors);
  await requireCart(context);
  const kept = keepFormatFields(address, locale);
  const medusaLocale = context.market.medusaLocale;
  await setEmail(email, medusaLocale);
  await setAddresses(
    toAddressInput({
      ...kept,
      firstName: kept.firstName ?? "",
      lastName: kept.lastName ?? "",
      address1: kept.address1 ?? "",
    }),
    undefined,
    medusaLocale,
  );
  updateTag("cart");
  return { step: "delivery" as const };
});

export const deliverySchema = z.object({
  market: marketKey,
  shippingOption: id,
  paymentMethod: id,
  // M6 D117: the ConfirmationToken the Payment Element made, when Stripe takes the payment. Empty
  // when a saved method was chosen (D119): the island leaves its hidden field as it is.
  confirmationToken: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^ctoken_[A-Za-z0-9]{1,200}$/)
      .optional(),
  ),
});

/** A signed-in customer's saved method, as PaymentStep's radio sends it (M6 D119). */
const SAVED_METHOD = /^pm_[A-Za-z0-9]{1,200}$/;

/**
 * Step 2: the shipping option first, then the payment, last, after every change to the total (M6
 * D117): with Stripe, the ConfirmationToken is handed to the backend (which reads it from Stripe,
 * refuses one that an intent used, and keeps it and its preview on the cart) and the Stripe session
 * (the PaymentIntent) is initiated for the total the shipping made; with nothing to pay, or without
 * Stripe, the system payment ("Pay later"). M6 D119 (T101): a signed-in customer's saved method
 * (`pm_…`) instead of a token, handed to the same route, which takes it only from the cart's own
 * customer and only one of theirs; and a token that saves its method ("Save this card for next
 * time", which the Element puts in the token) makes a session that saves it. The backend's guard
 * checks both again when the session is made.
 */
export const deliveryAction = action(
  deliverySchema,
  async ({ market, shippingOption, paymentMethod, confirmationToken }) => {
    const context = await contextFor(market);
    const cart = await requireCart(context);
    if (cart.email === null || cart.shippingAddress === null)
      throw new ActionError("incomplete", "the cart has no e-mail or address yet");
    const medusaLocale = context.market.medusaLocale;
    const [options, providers] = await Promise.all([
      listShippingOptions(cart.id, cart.currencyCode, medusaLocale),
      listPaymentProviders(context.region.id),
    ]);
    const option = options.find((each) => each.id === shippingOption);
    if (option === undefined) throw new FieldsError({ shippingOption: "invalid" });
    const saved = SAVED_METHOD.test(paymentMethod);
    const provider = saved ? STRIPE_PAYMENT_PROVIDER : paymentMethod;
    if (provider !== SYSTEM_PAYMENT_PROVIDER && provider !== STRIPE_PAYMENT_PROVIDER)
      throw new FieldsError({ paymentMethod: "invalid" });
    if (!providers.includes(provider)) throw new FieldsError({ paymentMethod: "invalid" });
    const shipped = await setShippingMethod(shippingOption, medusaLocale);
    // The total now holds the shipping: what is offered follows it (Stripe takes no zero amount).
    const wanted = paysWithStripe(providers, shipped.total.amount)
      ? STRIPE_PAYMENT_PROVIDER
      : SYSTEM_PAYMENT_PROVIDER;
    if (provider !== wanted) throw new FieldsError({ paymentMethod: "invalid" });
    if (saved) {
      await keepSavedMethod(paymentMethod, medusaLocale);
      await initiatePayment(wanted, medusaLocale, { payment_method: paymentMethod });
    } else if (wanted === STRIPE_PAYMENT_PROVIDER) {
      if (confirmationToken === undefined) throw new FieldsError({ paymentMethod: "required" });
      const { save } = await keepPaymentToken(confirmationToken, medusaLocale);
      await initiatePayment(
        wanted,
        medusaLocale,
        save ? { setup_future_usage: "off_session" } : {},
      );
    } else await initiatePayment(wanted, medusaLocale);
    updateTag("cart");
    return { step: "review" as const };
  },
);

/**
 * Stripe takes the payment (M6 D117): the region offers it and there is a total to pay. The review's
 * "Place order" and the express rail's payment (T102) check it before anything is written.
 */
export async function requireStripe(context: MarketContext, total: number): Promise<void> {
  const providers = await listPaymentProviders(context.region.id);
  if (!paysWithStripe(providers, total))
    throw new ActionError("incomplete", "the cart does not pay with Stripe");
}

export const preparePaymentSchema = z.object({ market: marketKey });

/**
 * Step 3's "Place order", before Stripe confirms (M6 D117): the cart's Stripe session for its
 * current total, and its client secret. Medusa deletes a cart's sessions when its total moves (a
 * promotion on the review page, the cart changed in another tab), so a new one is initiated when
 * there is none for this total, asking for what the kept payment asks (D119: its saved method, or
 * saving). Answers the ConfirmationToken the delivery step kept, which the browser confirms the
 * PaymentIntent with; `null` for a saved method, which the PaymentIntent holds already. A saved
 * method, or saving, only for the cart's own signed-in customer (PR 142 review, item 2): otherwise
 * (signed out, or the session lapsed on a shared computer) the kept payment is forgotten and the
 * shopper goes back to the payment, before any session is reused.
 */
export const preparePaymentAction = action(preparePaymentSchema, async ({ market }) => {
  const context = await contextFor(market);
  const cart = await requireCart(context);
  if (cart.shippingMethod === null || (cart.paymentToken === null && cart.savedMethod === null))
    throw new ActionError("incomplete", "the delivery step kept no payment");
  const locale = context.market.medusaLocale;
  const caller = cart.savedMethod === null && !cart.paymentSave ? null : await getCustomer();
  if (!ownsKeptPayment(cart, caller?.id ?? null)) {
    await forgetKeptPayment(locale);
    updateTag("cart");
    throw new ActionError("incomplete", "the kept payment is not the caller's");
  }
  await requireStripe(context, cart.total.amount);
  // Stripe's webhook may place the order before the shopper is back: the order's e-mails and the
  // consent are on the cart first, as `placeOrderAction` writes them (T99, D124).
  await prepareCompletion(locale, {
    ...mailTarget(context.market, context.map),
    key: context.market.key,
  });
  const session = await ensurePaymentSession(STRIPE_PAYMENT_PROVIDER, locale, sessionDataOf(cart));
  updateTag("cart");
  return {
    clientSecret: session.clientSecret,
    intentId: session.intentId,
    confirmationToken: cart.savedMethod === null ? cart.paymentToken : null,
  };
});

export const placeOrderSchema = z.object({ market: marketKey });

/**
 * Step 3: places the order. Every step must be done; Medusa's refusal (stock gone, a payment that
 * needs more) comes back as `rejected` with the cart kept. On success the cart cookie is gone
 * (`completeCart`) and the receipt cookie names the order, for the confirmation page (D65).
 */
export const placeOrderAction = action(placeOrderSchema, async ({ market }) => {
  const context = await contextFor(market);
  const cart = await requireCart(context);
  if (
    cart.email === null ||
    cart.shippingAddress === null ||
    cart.shippingMethod === null ||
    cart.paymentProviderId === null
  )
    throw new ActionError("incomplete", "a step before the review is not done");
  // The order's e-mails link to this market, in its language (T99, D122); the market's key goes
  // with it, for the order's analytics events (D124).
  const answer = await completeCart(context.market.medusaLocale, {
    ...mailTarget(context.market, context.map),
    key: context.market.key,
  });
  if (answer.kind === "cart") throw new ActionError("rejected", answer.error);
  await setReceipt(answer.orderId);
  updateTag("cart");
  return { orderId: answer.orderId };
});
