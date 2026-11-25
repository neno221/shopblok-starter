import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../config/modules";
import { stripeRegistered } from "./stripe-regions";

// M6 D119 (T101): a customer's saved payment methods with Stripe. Medusa keeps a customer's Stripe
// customer as an *account holder* (the payment module's), linked to the customer; the methods
// themselves live at Stripe and are read through the provider (`listPaymentMethods`), never stored
// here. Only what the shop draws leaves the backend: the method's id and type, a card's brand, last
// four digits, expiry and wallet (`toSavedMethod`), never Stripe's whole object (its fingerprint,
// the billing details).

/** The methods the shop saves and offers again: cards, and Revolut Pay (§0, 3a; T101 step 4). */
export const SAVED_TYPES = ["card", "revolut_pay"] as const;
export type SavedType = (typeof SAVED_TYPES)[number];

/** A saved method as the store routes answer it. */
export type SavedMethod = {
  id: string;
  type: SavedType;
  /** A card's brand as Stripe names it (`visa`, `mastercard`, `amex`…). */
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  /** A card kept by a wallet (`apple_pay`, `google_pay`). */
  wallet?: string;
};

const text = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === "string" && pattern.test(value) ? value : undefined;

const whole = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined;

/** A Stripe PaymentMethod as the shop keeps it, or `null` for a type it does not offer (pure). */
export function toSavedMethod(id: string, data: unknown): SavedMethod | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = data as {
    type?: unknown;
    card?: {
      brand?: unknown;
      last4?: unknown;
      exp_month?: unknown;
      exp_year?: unknown;
      wallet?: { type?: unknown } | null;
    } | null;
  };
  if (!/^pm_[A-Za-z0-9]{1,200}$/.test(id)) return null;
  if (raw.type === "revolut_pay") return { id, type: "revolut_pay" };
  if (raw.type !== "card") return null;
  const method: SavedMethod = { id, type: "card" };
  const brand = text(raw.card?.brand, /^[a-z_]{1,30}$/);
  const last4 = text(raw.card?.last4, /^\d{4}$/);
  const month = whole(raw.card?.exp_month, 1, 12);
  const year = whole(raw.card?.exp_year, 2000, 2100);
  const wallet = text(raw.card?.wallet?.type, /^[a-z_]{1,30}$/);
  if (brand !== undefined) method.brand = brand;
  if (last4 !== undefined) method.last4 = last4;
  if (month !== undefined) method.exp_month = month;
  if (year !== undefined) method.exp_year = year;
  if (wallet !== undefined) method.wallet = wallet;
  return method;
}

/** What the review shows for a saved method (the token's preview's shape, `stripe-token.ts`). */
export function previewOf(method: SavedMethod) {
  return {
    type: method.type,
    ...(method.brand === undefined ? {} : { brand: method.brand }),
    ...(method.last4 === undefined ? {} : { last4: method.last4 }),
    ...(method.wallet === undefined ? {} : { wallet: method.wallet }),
  };
}

export type AccountHolder = { id: string; provider_id: string; data?: Record<string, unknown> };

/** The customer's account holder with Stripe, or `null` when they have none yet. */
export async function stripeHolderOf(
  scope: MedusaContainer,
  customerId: string,
): Promise<AccountHolder | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "customer",
    fields: ["id", "account_holders.*"],
    filters: { id: customerId },
  })) as { data: { account_holders?: (AccountHolder | null)[] | null }[] };
  return (
    (data[0]?.account_holders ?? []).find((holder) => holder?.provider_id === STRIPE_PROVIDER_ID) ??
    null
  );
}

/**
 * The customer's saved methods with Stripe, of the types the shop offers, newest first as Stripe
 * lists them. None without Stripe (no request goes out) or without an account holder.
 */
export async function listSavedMethods(
  scope: MedusaContainer,
  customerId: string,
): Promise<SavedMethod[]> {
  if (!(await stripeRegistered(scope))) return [];
  const holder = await stripeHolderOf(scope, customerId);
  if (holder === null) return [];
  const payment = scope.resolve(Modules.PAYMENT);
  const methods = await payment.listPaymentMethods({
    provider_id: STRIPE_PROVIDER_ID,
    context: { account_holder: holder as never },
  });
  return methods.flatMap((method) => {
    const saved = toSavedMethod(method.id, method.data);
    return saved === null ? [] : [saved];
  });
}

/**
 * The customer's account holder with Stripe, made (a Stripe customer, linked to the customer) when
 * they have none yet: what a checkout session makes for a signed-in customer, for the account's
 * "Add a payment method". Stripe's idempotency key is the customer's id, so two requests at once
 * make one Stripe customer.
 */
export async function ensureStripeHolder(
  scope: MedusaContainer,
  customerId: string,
): Promise<AccountHolder> {
  const existing = await stripeHolderOf(scope, customerId);
  if (existing !== null) return existing;
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "customer",
    fields: ["id", "email", "company_name", "first_name", "last_name", "phone", "addresses.*"],
    filters: { id: customerId },
  })) as {
    data: (Record<string, unknown> & {
      addresses?: ({ is_default_billing?: boolean } & Record<string, unknown>)[] | null;
    })[];
  };
  const customer = data[0];
  if (customer === undefined)
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "The customer was not found");
  const addresses = customer.addresses ?? [];
  const payment = scope.resolve(Modules.PAYMENT);
  const holder = (await payment.createAccountHolder({
    provider_id: STRIPE_PROVIDER_ID,
    context: {
      customer: {
        ...customer,
        billing_address: addresses.find((a) => a.is_default_billing) ?? addresses[0],
      } as never,
    },
  })) as AccountHolder | undefined;
  if (holder?.id === undefined)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Stripe made no customer");
  const link = scope.resolve(ContainerRegistrationKeys.LINK);
  await link.create({
    [Modules.CUSTOMER]: { customer_id: customerId },
    [Modules.PAYMENT]: { account_holder_id: holder.id },
  });
  return holder;
}
