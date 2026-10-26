import "server-only";
import { addressFormat, type AddressFieldName } from "@shopblok/i18n";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getMarketContext, type MarketContext } from "../market-context";
import {
  completeCart,
  getCart,
  getOrCreateCart,
  initiatePayment,
  setAddresses,
  setEmail,
  setShippingMethod,
  type CartDto,
} from "../medusa/cart";
import { setReceipt } from "../medusa/cookies";
import { listShippingOptions } from "../medusa/fulfillment";
import { listPaymentProviders, SYSTEM_PAYMENT_PROVIDER } from "../medusa/payment";
import { toAddressInput } from "../view-models/address";
import { action, ActionError, FieldsError, type FieldError } from "./action";

// The checkout's actions (D65, T52): one per step, each on the visitor's own cart (the cookie's,
// never an id from the form) in the market's region and language. Each checks what Medusa would
// take anyway, so the shopper reads why in their language: the address against its country's
// format (`addressFormat`: the required fields, `city` only where the country has one, the postal
// code's pattern), the country against the region's, the shipping option against the cart's own
// options and the payment against the region's providers. `updateTag("cart")` after each change.

const marketKey = z.string().min(1).max(64);
const id = z.string().min(1).max(128);
/** A field as a form sends it: trimmed, empty is absent. */
const text = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

async function contextFor(key: string): Promise<MarketContext> {
  const context = await getMarketContext(key);
  if (context === null) throw new ActionError("not-found", `no open market ${key}`);
  return context;
}

/**
 * The visitor's open cart with at least one line, in this market's region and language (D65: a
 * cart from another country moves to this region, one in another language keeps its lines and
 * takes this locale; `getOrCreateCart`'s rule). The checkout has nothing to do without one.
 */
async function requireCart(context: MarketContext): Promise<CartDto> {
  const existing = await getCart(context.market.medusaLocale);
  if (existing === null || existing.lines.length === 0)
    throw new ActionError("not-found", "the visitor has no cart to check out");
  return getOrCreateCart({
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

/** The address with only the fields its country's format has (and the phone). */
function keepFormatFields(address: AddressValues, locale: string): AddressValues {
  const drawn = new Set<AddressFieldName>(addressFormat(address.countryCode, locale).rows.flat());
  const kept: AddressValues = { countryCode: address.countryCode, phone: address.phone };
  for (const field of Object.keys(addressFields) as (keyof typeof addressFields)[])
    if (field !== "phone" && drawn.has(field)) kept[field] = address[field];
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
});

/** Step 2: the shipping option, then a payment session with the chosen provider. */
export const deliveryAction = action(
  deliverySchema,
  async ({ market, shippingOption, paymentMethod }) => {
    const context = await contextFor(market);
    const cart = await requireCart(context);
    if (cart.email === null || cart.shippingAddress === null)
      throw new ActionError("incomplete", "the cart has no e-mail or address yet");
    const medusaLocale = context.market.medusaLocale;
    const [options, providers] = await Promise.all([
      listShippingOptions(cart.id, cart.currencyCode, medusaLocale),
      listPaymentProviders(context.region.id),
    ]);
    const errors: Partial<Record<string, FieldError>> = {};
    if (!options.some((option) => option.id === shippingOption)) errors.shippingOption = "invalid";
    // M3 offers the system payment only (D65); M6 adds the region's others.
    if (paymentMethod !== SYSTEM_PAYMENT_PROVIDER || !providers.includes(paymentMethod))
      errors.paymentMethod = "invalid";
    if (Object.keys(errors).length > 0) throw new FieldsError(errors);
    await setShippingMethod(shippingOption, medusaLocale);
    await initiatePayment(paymentMethod, medusaLocale);
    updateTag("cart");
    return { step: "review" as const };
  },
);

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
  const answer = await completeCart(context.market.medusaLocale);
  if (answer.kind === "cart") throw new ActionError("rejected", answer.error);
  await setReceipt(answer.orderId);
  updateTag("cart");
  return { orderId: answer.orderId };
});
