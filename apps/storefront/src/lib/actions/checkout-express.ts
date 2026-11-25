import "server-only";
import { updateTag } from "next/cache";
import { z } from "zod";
import {
  ensurePaymentSession,
  keepExpressBefore,
  keepPaymentToken,
  prepareCompletion,
  restoreExpressBefore,
  setAddresses,
  setEmail,
  setShippingMethod,
} from "../medusa/cart";
import { listShippingOptions } from "../medusa/fulfillment";
import { mailTarget } from "../markets";
import { STRIPE_PAYMENT_PROVIDER } from "../medusa/payment";
import { toAddressInput } from "../view-models/address";
import {
  expressDeliverable as deliverable,
  toExpressRates as expressRates,
} from "../view-models/checkout";
import { smallestUnit } from "../../components/checkout/stripe/stripe-options";
import { action, ActionError, FieldsError } from "./action";
import { addressErrors, keepFormatFields, requireCart, requireStripe } from "./checkout-handlers";
import { contextFor, formText as text, marketKey } from "./inputs";

// Ours (M6 T102, SETUP.md "Express checkout (T102)"; D120). The express rail's actions: Stripe's
// Express Checkout Element on the contact step asks the wallet for the e-mail and the address, and
// each of the wallet's events goes through the visitor's own cart (the cookie's, never an id from
// the browser) in the market's region and language, as the checkout's steps do:
// - the address the wallet shows (only the town, the postal code, the state and the country: the
//   wallet keeps the rest until the shopper pays) is checked against the region's countries, kept on
//   the cart without a name or a street (so the contact step is not done by it), and answers the
//   cart's own shipping options for it, the one the cart had first, with the total for it;
// - a shipping option picked in the wallet is set on the cart, if it is one of the cart's;
// - the sheet closed without a payment: the cart's address and option from before the sheet
//   opened are written back (kept in its `metadata` on the first address event, `keepExpressBefore`),
//   so a shopper who only looked keeps their contact step and their pickup point;
// - the payment: the whole address and the e-mail, checked as the contact step checks them, the
//   option, then the ConfirmationToken the wallet made, kept by the backend as the delivery step's
//   is, and the Stripe session for the cart's total, whose client secret the browser confirms. The
//   order is placed by `/api/payment-return`, as for every Stripe payment (D117).

/** The wallet's country, as Stripe gives it: two letters, any case. */
const country = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}$/);

export const expressAddressSchema = z.object({
  market: marketKey,
  /** The sheet's first address event: what the cart had is kept before it is replaced. */
  fresh: z.boolean().optional(),
  countryCode: country,
  postalCode: text(20),
  city: text(100),
  province: text(100),
});

/**
 * The wallet's address changed (`shippingaddresschange`): a country outside the region is refused
 * (the wallet says it cannot ship there), else the partial address is kept on the cart and the
 * cart's shipping options for it are answered, with the first set on the cart and the total for it.
 * No option to deliver there is a refusal too.
 */
export const expressAddressAction = action(
  expressAddressSchema,
  async ({ market, fresh, countryCode, postalCode, city, province }) => {
    const context = await contextFor(market);
    if (!context.region.countries.includes(countryCode))
      throw new FieldsError({ countryCode: "invalid" });
    const cart = await requireCart(context);
    const locale = context.market.medusaLocale;
    await keepExpressBefore(fresh === true, locale);
    // No name and no street: the wallet shows them only when the shopper pays, and the contact step
    // is done only with them (`toAddressDto`).
    await setAddresses(
      toAddressInput({
        countryCode,
        firstName: "",
        lastName: "",
        address1: "",
        ...(postalCode === undefined ? {} : { postalCode: postalCode.toUpperCase() }),
        ...(city === undefined ? {} : { city }),
        ...(province === undefined ? {} : { province }),
      }),
      undefined,
      locale,
    );
    const options = await listShippingOptions(cart.id, cart.currencyCode, locale);
    const rates = expressRates(options, cart.shippingMethod?.optionId);
    const first = rates[0];
    if (first === undefined) throw new FieldsError({ shippingOption: "invalid" });
    const shipped = await setShippingMethod(first.id, locale);
    updateTag("cart");
    return { rates, total: shipped.total.amount, currency: shipped.currencyCode };
  },
);

export const expressRateSchema = z.object({
  market: marketKey,
  shippingOption: z.string().min(1).max(128),
});

/** The wallet's shipping option changed (`shippingratechange`): one of the cart's, set on it. */
export const expressRateAction = action(expressRateSchema, async ({ market, shippingOption }) => {
  const context = await contextFor(market);
  const cart = await requireCart(context);
  const locale = context.market.medusaLocale;
  const options = await listShippingOptions(cart.id, cart.currencyCode, locale);
  if (!options.some((option) => option.id === shippingOption && deliverable(option)))
    throw new FieldsError({ shippingOption: "invalid" });
  const shipped = await setShippingMethod(shippingOption, locale);
  updateTag("cart");
  return { total: shipped.total.amount, currency: shipped.currencyCode };
});

/**
 * A wallet's name as the address's two: the last word is the last name, the rest the first. A name
 * of one word is both, since the address form needs both and a wallet holds one field.
 */
export function splitName(name: string): { firstName: string; lastName: string } {
  const words = name
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== "");
  if (words.length === 0) return { firstName: "", lastName: "" };
  if (words.length === 1) return { firstName: words[0] as string, lastName: words[0] as string };
  return { firstName: words.slice(0, -1).join(" "), lastName: words.at(-1) as string };
}

export const expressConfirmSchema = z.object({
  market: marketKey,
  // As the contact step keeps it: Medusa stores it in lower case (T53, PR 76 review).
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(1).max(200),
  phone: text(40),
  countryCode: country,
  address1: text(200),
  address2: text(200),
  city: text(100),
  province: text(100),
  postalCode: text(20),
  shippingOption: z.string().min(1).max(128),
  confirmationToken: z.string().regex(/^ctoken_[A-Za-z0-9]{1,200}$/),
  /** What the wallet showed, in the currency's smallest unit: the cart's total must be it. */
  amount: z.number().int().nonnegative(),
});

/**
 * The wallet's payment (`confirm`): the address and the e-mail as the contact step checks them,
 * the shipping option as the delivery step does, the total the wallet showed, then the token kept
 * and the session for the total, whose client secret the browser confirms the PaymentIntent with.
 * A refused address answers its fields; a total that is not the wallet's answers `changed` with the
 * cart's, so the browser shows it and the shopper pays again.
 */
export const expressConfirmAction = action(
  expressConfirmSchema,
  async ({ market, email, name, shippingOption, confirmationToken, amount, ...rest }) => {
    const context = await contextFor(market);
    const cart = await requireCart(context);
    // A region without Stripe gets nothing written (the page draws no rail there).
    await requireStripe(context, cart.total.amount);
    const htmlLang = context.market.htmlLang;
    const locale = context.market.medusaLocale;
    const address = { ...rest, ...splitName(name) };
    const errors = addressErrors(address, context.region.countries, htmlLang);
    if (Object.keys(errors).length > 0) throw new FieldsError(errors);
    const kept = keepFormatFields(address, htmlLang);
    const options = await listShippingOptions(cart.id, cart.currencyCode, locale);
    if (!options.some((option) => option.id === shippingOption && deliverable(option)))
      throw new FieldsError({ shippingOption: "invalid" });
    await setEmail(email, locale);
    await setAddresses(
      toAddressInput({
        ...kept,
        firstName: kept.firstName ?? "",
        lastName: kept.lastName ?? "",
        address1: kept.address1 ?? "",
      }),
      undefined,
      locale,
    );
    const shipped = await setShippingMethod(shippingOption, locale);
    if (shipped.total.amount <= 0)
      throw new ActionError("incomplete", "the cart has no total for Stripe to take");
    if (smallestUnit(shipped.total.amount, shipped.currencyCode) !== amount)
      throw new ActionError("rejected", "the wallet showed another total", "changed");
    await keepPaymentToken(confirmationToken, locale);
    // Stripe's webhook may place the order before the shopper is back: the order's e-mails and the
    // consent are on the cart first, as the review's "Place order" writes them (D117, T99, D124).
    await prepareCompletion(locale, {
      ...mailTarget(context.market, context.map),
      key: context.market.key,
    });
    const session = await ensurePaymentSession(STRIPE_PAYMENT_PROVIDER, locale);
    updateTag("cart");
    return { clientSecret: session.clientSecret, intentId: session.intentId };
  },
);

/** The cart's total, for the wallet once an answer said `changed`. */
export const expressTotalSchema = z.object({ market: marketKey });

export const expressTotalAction = action(expressTotalSchema, async ({ market }) => {
  const context = await contextFor(market);
  const cart = await requireCart(context);
  return { total: cart.total.amount, currency: cart.currencyCode };
});

export const expressRestoreSchema = z.object({ market: marketKey });

/**
 * The wallet's sheet closed without a payment (`cancel`): the cart's address and option from before
 * it opened, written back (`restoreExpressBefore`), and the cart's total then, for the Element.
 */
export const expressRestoreAction = action(expressRestoreSchema, async ({ market }) => {
  const context = await contextFor(market);
  const cart = await requireCart(context);
  const locale = context.market.medusaLocale;
  const restored = await restoreExpressBefore(async (optionId) => {
    const options = await listShippingOptions(cart.id, cart.currencyCode, locale);
    return options.some((option) => option.id === optionId);
  }, locale);
  updateTag("cart");
  return { total: restored.total.amount, currency: restored.currencyCode };
});
