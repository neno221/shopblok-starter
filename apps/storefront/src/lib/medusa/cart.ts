import "server-only";
import type { Money } from "./products";
import {
  getAnalyticsConsent,
  getAuthHeaders,
  getCartId,
  removeCartId,
  setCartId,
  type AnalyticsConsent,
} from "./cookies";
import { localeHeaders, medusaRequest, MedusaRequestError } from "./sdk";

// The visitor's cart (D60, D65), ported from dtc-starter's `lib/data/cart.ts` with SPEC §8.2's
// fixes: the cookie is always awaited, the auth headers are left out when nobody is signed in, a
// Medusa error stays a `MedusaRequestError` (no axios-shaped handler), the payment session is the
// one the provider answers with (not `payment_sessions[0]`), and nothing here redirects: the
// actions decide. Never cached across requests: a cart is one visitor's (T52 adds
// `"use cache: private"` where a page reads it twice). Every function returns the `CartDto`, never
// the SDK's cart.
//
// M6 D124 (T97): every write here (a new cart, a line, a code, the checkout's steps, the move to
// another market, and the order's placing) leaves the cart's `metadata` saying what this request's
// cookies say about analytics (`withConsent`): consent and PostHog's distinct id, or neither. Never
// what the cart held before: a visitor who withdrew on the review page places an order Medusa's
// analytics subscribers send nothing about.

export type CartLineDto = {
  id: string;
  productId: string;
  productHandle: string;
  variantId: string;
  /** The product's title in the cart's locale, as Medusa stored it on the line. */
  title: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: Money;
  /** The price before a sale, when the line has one and it is higher. */
  compareAtUnitPrice: Money | null;
  total: Money;
};

/** An address the cart holds (the shipping one), in the storefront's names. */
export type CartAddressDto = {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
};

export type CartDto = {
  id: string;
  regionId: string;
  /** The Medusa locale the cart was made in (D65), so e-mails come in the shopper's language. */
  locale: string | null;
  currencyCode: string;
  email: string | null;
  lines: CartLineDto[];
  /** The sum of the lines' quantities: the header's badge. */
  itemCount: number;
  /** The lines before discounts. */
  subtotal: Money;
  discountTotal: Money;
  /** Known once a shipping method is chosen. */
  shippingTotal: Money | null;
  taxTotal: Money;
  total: Money;
  /** The codes applied, with what each takes off the lines. */
  promoCodes: { code: string; discount: Money | null }[];
  shippingMethodIds: string[];
  hasShippingAddress: boolean;
  /** The shipping address, once the checkout's first step has set one with a name and a street. */
  shippingAddress: CartAddressDto | null;
  /** The shipping method chosen (the last one), with its name and price for this cart. */
  shippingMethod: { optionId: string; name: string; amount: Money } | null;
  /** The provider of the cart's pending payment session, once the delivery step started one. */
  paymentProviderId: string | null;
  completed: boolean;
};

/** The fields every read and write asks for, so a write answers with the whole cart. */
export const CART_FIELDS = [
  "id",
  "region_id",
  "locale",
  "currency_code",
  "email",
  "completed_at",
  "item_subtotal",
  "discount_total",
  "shipping_total",
  "tax_total",
  "total",
  "*items",
  "*items.adjustments",
  "*promotions",
  "*shipping_methods",
  "*shipping_address",
  "*payment_collection",
  "*payment_collection.payment_sessions",
  // M6 D124: what the cart says about analytics (`withConsent` compares it with the cookies).
  "metadata",
].join(",");

type WireLine = {
  id: string;
  product_id?: string | null;
  product_handle?: string | null;
  variant_id?: string | null;
  title?: string | null;
  product_title?: string | null;
  thumbnail?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  compare_at_unit_price?: number | null;
  total?: number | null;
  adjustments?: ({ code?: string | null; amount?: number | null } | null)[] | null;
};

export type WireCart = {
  id: string;
  metadata?: Record<string, unknown> | null;
  region_id?: string | null;
  locale?: string | null;
  currency_code: string;
  email?: string | null;
  completed_at?: string | null;
  item_subtotal?: number | null;
  discount_total?: number | null;
  shipping_total?: number | null;
  tax_total?: number | null;
  total?: number | null;
  items?: (WireLine | null)[] | null;
  promotions?: ({ code?: string | null } | null)[] | null;
  shipping_methods?:
    | ({
        id?: string | null;
        shipping_option_id?: string | null;
        name?: string | null;
        amount?: number | null;
      } | null)[]
    | null;
  shipping_address?: WireAddress | null;
  payment_collection?: {
    payment_sessions?: ({ provider_id?: string | null; status?: string | null } | null)[] | null;
  } | null;
};

/** An address as the Store API answers it (the cart's and the order's). */
export type WireAddress = {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  phone?: string | null;
};

/** An address with the fields a delivery needs, or `null` (Medusa keeps an empty one on a cart). */
export function toAddressDto(address: WireAddress | null | undefined): CartAddressDto | null {
  if (!address?.first_name || !address.last_name || !address.address_1 || !address.country_code)
    return null;
  const text = (value: string | null | undefined) => (value ? value : null);
  return {
    firstName: address.first_name,
    lastName: address.last_name,
    company: text(address.company),
    address1: address.address_1,
    address2: text(address.address_2),
    city: text(address.city),
    province: text(address.province),
    postalCode: text(address.postal_code),
    countryCode: address.country_code.toLowerCase(),
    phone: text(address.phone),
  };
}

/** The Store API's cart as the DTO. A line without a product or a variant (deleted since) is left out. */
export function toCartDto(cart: WireCart): CartDto {
  const currencyCode = cart.currency_code;
  const money = (amount: number | null | undefined): Money => ({
    amount: amount ?? 0,
    currencyCode,
  });
  const lines: CartLineDto[] = (cart.items ?? []).flatMap((line) => {
    if (!line?.product_id || !line.variant_id || !line.product_handle || !line.quantity) return [];
    const unit = line.unit_price ?? 0;
    const compareAt = line.compare_at_unit_price;
    return [
      {
        id: line.id,
        productId: line.product_id,
        productHandle: line.product_handle,
        variantId: line.variant_id,
        title: line.product_title || line.title || line.product_handle,
        thumbnail: line.thumbnail ?? null,
        quantity: line.quantity,
        unitPrice: money(unit),
        compareAtUnitPrice:
          typeof compareAt === "number" && compareAt > unit ? money(compareAt) : null,
        total: money(line.total ?? unit * line.quantity),
      },
    ];
  });
  const discounts = new Map<string, number>();
  for (const line of cart.items ?? [])
    for (const adjustment of line?.adjustments ?? [])
      if (adjustment?.code)
        discounts.set(
          adjustment.code,
          (discounts.get(adjustment.code) ?? 0) + (adjustment.amount ?? 0),
        );
  const shippingMethods = (cart.shipping_methods ?? []).flatMap((method) =>
    method?.shipping_option_id ? [method.shipping_option_id] : [],
  );
  const method = (cart.shipping_methods ?? []).findLast((each) => each?.shipping_option_id);
  const session = (cart.payment_collection?.payment_sessions ?? []).find(
    (each) => each?.status === "pending" && each.provider_id,
  );
  return {
    id: cart.id,
    regionId: cart.region_id ?? "",
    locale: cart.locale ?? null,
    currencyCode,
    email: cart.email ?? null,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: money(cart.item_subtotal),
    discountTotal: money(cart.discount_total),
    shippingTotal: shippingMethods.length === 0 ? null : money(cart.shipping_total),
    taxTotal: money(cart.tax_total),
    total: money(cart.total),
    promoCodes: (cart.promotions ?? []).flatMap((promotion) =>
      promotion?.code
        ? [
            {
              code: promotion.code,
              discount: discounts.has(promotion.code) ? money(discounts.get(promotion.code)) : null,
            },
          ]
        : [],
    ),
    shippingMethodIds: shippingMethods,
    hasShippingAddress: Boolean(cart.shipping_address?.id),
    shippingAddress: toAddressDto(cart.shipping_address),
    shippingMethod: method?.shipping_option_id
      ? {
          optionId: method.shipping_option_id,
          name: method.name || method.shipping_option_id,
          amount: money(method.amount),
        }
      : null,
    paymentProviderId: session?.provider_id ?? null,
    completed: Boolean(cart.completed_at),
  };
}

/** The locale header, and the customer's token when someone is signed in (none otherwise). */
async function headersFor(locale?: string | null): Promise<Record<string, string>> {
  return { ...(locale ? localeHeaders(locale) : {}), ...(await getAuthHeaders()) };
}

// --- Analytics consent in the cart's metadata (M6 D124, T97) --------------------------------------

/** The cart's (and so the order's) metadata keys that Medusa's analytics subscribers read. */
export const ANALYTICS_CONSENT_KEY = "analytics_consent";
export const DISTINCT_ID_KEY = "posthog_distinct_id";
/** The market's internal key (`el-cy`), the `market` of Medusa's analytics events, as the browser's. */
export const MARKET_KEY_KEY = "market_key";

/**
 * The keys that say what `consent` says: `analytics_consent: true` and the distinct id when there
 * is one, neither otherwise (a new cart's metadata).
 */
export function consentKeys(consent: AnalyticsConsent): Record<string, unknown> {
  if (!consent.consent) return {};
  return {
    [ANALYTICS_CONSENT_KEY]: true,
    ...(consent.distinctId === null ? {} : { [DISTINCT_ID_KEY]: consent.distinctId }),
  };
}

/**
 * The update that makes a cart's `metadata` say what `consent` says, or `null` when it says so
 * already, so a write that changes nothing is not made. Medusa merges an update's `metadata` into
 * the cart's and deletes a key sent as `""`, so the update holds the two keys only: each as wanted,
 * or `""` to remove it (a withdrawal). Checked against Medusa 2.22.6's store API.
 */
export function consentMetadata(
  metadata: Record<string, unknown>,
  consent: AnalyticsConsent,
): Record<string, unknown> | null {
  const wanted = consentKeys(consent);
  const keys = [ANALYTICS_CONSENT_KEY, DISTINCT_ID_KEY];
  if (keys.every((key) => metadata[key] === wanted[key])) return null;
  return Object.fromEntries(keys.map((key) => [key, wanted[key] ?? ""]));
}

/**
 * The cart a write answered, with this request's consent in its metadata: one more write when the
 * metadata says otherwise, none when it agrees.
 */
async function withConsent(answer: unknown, headers: Record<string, string>): Promise<CartDto> {
  const cart = answer as WireCart;
  const metadata = consentMetadata(cart.metadata ?? {}, await getAnalyticsConsent());
  if (metadata === null) return toCartDto(cart);
  const { cart: updated } = await medusaRequest((sdk) =>
    sdk.store.cart.update(cart.id, { metadata }, { fields: CART_FIELDS }, headers),
  );
  return toCartDto(updated as unknown as WireCart);
}

/**
 * The consent island's action (D124): the visitor's cart, if they have one, made to say what the
 * cookies now say (a withdrawal removes the consent and the id; a new yes, once PostHog runs, adds
 * them). `false` when there is no open cart.
 */
export async function syncCartConsent(): Promise<boolean> {
  const id = await getCartId();
  if (id === undefined) return false;
  try {
    return await syncConsentOf(id, await headersFor());
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/** Reads cart `id`'s metadata and writes the request's consent into it when it says otherwise. */
async function syncConsentOf(id: string, headers: Record<string, string>): Promise<boolean> {
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.retrieve(id, { fields: "id,completed_at,metadata" }, headers),
  );
  if ((cart as unknown as WireCart).completed_at) return false;
  const metadata = consentMetadata(
    (cart.metadata ?? {}) as Record<string, unknown>,
    await getAnalyticsConsent(),
  );
  if (metadata !== null)
    await medusaRequest((sdk) =>
      sdk.store.cart.update(id, { metadata }, { fields: "id" }, headers),
    );
  return true;
}

const isMissing = (error: unknown) =>
  error instanceof MedusaRequestError && error.kind === "rejected" && error.status === 404;

/**
 * The cart the cookie names, or `null`: no cookie, a cart Medusa no longer has, or one that is
 * completed (its order is placed; the next add starts a new cart). `locale` is the market's, for
 * the texts Medusa translates on the way.
 */
export async function getCart(locale?: string): Promise<CartDto | null> {
  const id = await getCartId();
  if (id === undefined) return null;
  try {
    const { cart } = await medusaRequest(async (sdk) =>
      sdk.store.cart.retrieve(id, { fields: CART_FIELDS }, await headersFor(locale)),
    );
    const dto = toCartDto(cart as unknown as WireCart);
    return dto.completed ? null : dto;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/**
 * Where a cart sells: the market's region and its Medusa locale, and the market's key, which a new
 * cart keeps in its `metadata` for Medusa's `cart.created` event (D124).
 */
export type CartContext = { regionId: string; locale: string; market?: string };

/**
 * The visitor's cart for this market, created on the first add (D61): with the market's region and
 * locale, in the publishable key's sales channel (Medusa takes the key's one channel when none is
 * sent). A cart from another region is moved to this one (a country change), and a cart in another
 * language keeps its lines and takes the new locale (D65; dtc-starter's `getOrSetCart` rule). Only
 * an action may call it: it sets the cookie.
 */
export async function getOrCreateCart(context: CartContext): Promise<CartDto> {
  const existing = await getCart(context.locale);
  const headers = await headersFor(context.locale);
  if (existing === null) {
    // Made with the consent and the market already in it (D124), so `cart.created` sees them.
    const base = context.market === undefined ? {} : { [MARKET_KEY_KEY]: context.market };
    const consented = { ...base, ...consentKeys(await getAnalyticsConsent()) };
    const metadata = Object.keys(consented).length === 0 ? null : consented;
    const { cart } = await medusaRequest((sdk) =>
      sdk.store.cart.create(
        {
          region_id: context.regionId,
          locale: context.locale,
          ...(metadata === null ? {} : { metadata }),
        },
        { fields: CART_FIELDS },
        headers,
      ),
    );
    await setCartId(cart.id);
    return toCartDto(cart as unknown as WireCart);
  }
  return moveCart(existing, context, headers);
}

/**
 * `existing` in the context's region and locale: itself when it is there, else moved (D65), with
 * its lines kept. Only an action may call it (a page's read stays a read, PR 82 review): the
 * checkout's actions and `getOrCreateCart` before a write, and `rememberMarket` when the visitor
 * switches market.
 */
export async function moveCart(
  existing: CartDto,
  context: CartContext,
  headers?: Record<string, string>,
): Promise<CartDto> {
  if (existing.regionId === context.regionId && existing.locale === context.locale) return existing;
  const sent = headers ?? (await headersFor(context.locale));
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.update(
      existing.id,
      { region_id: context.regionId, locale: context.locale },
      { fields: CART_FIELDS },
      sent,
    ),
  );
  return withConsent(cart, sent);
}

/** The cart the cookie names, for a write: an error when there is none (the action answers it). */
async function requireCartId(): Promise<string> {
  const id = await getCartId();
  if (id === undefined) throw new MedusaRequestError("There is no cart to change", "rejected", 404);
  return id;
}

export async function addLine(
  context: CartContext,
  variantId: string,
  quantity: number,
): Promise<CartDto> {
  const { id } = await getOrCreateCart(context);
  const headers = await headersFor(context.locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.createLineItem(
      id,
      { variant_id: variantId, quantity },
      { fields: CART_FIELDS },
      headers,
    ),
  );
  return withConsent(cart, headers);
}

/** A line as the actions check it: every line Medusa holds, those `toCartDto` leaves out too. */
export type CartItemRef = { id: string; variantId: string | null; quantity: number };

/**
 * The cart's lines by id, variant and quantity only (the actions' ownership and limit checks, one
 * small read), or `null` when the visitor has no open cart. Unlike `getCart` it keeps a line with
 * no variant, so such a line can still be removed (PR 73 review).
 */
export async function getCartItems(): Promise<CartItemRef[] | null> {
  const id = await getCartId();
  if (id === undefined) return null;
  try {
    const { cart } = await medusaRequest(async (sdk) =>
      sdk.store.cart.retrieve(
        id,
        { fields: "id,completed_at,items.id,items.variant_id,items.quantity" },
        await headersFor(),
      ),
    );
    const wire = cart as unknown as WireCart;
    if (wire.completed_at) return null;
    return (wire.items ?? []).flatMap((line) =>
      line
        ? [{ id: line.id, variantId: line.variant_id ?? null, quantity: line.quantity ?? 0 }]
        : [],
    );
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/** A new quantity for a line; 0 removes it. */
export async function updateLine(
  lineId: string,
  quantity: number,
  locale?: string,
): Promise<CartDto> {
  if (quantity === 0) return removeLine(lineId, locale);
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.updateLineItem(id, lineId, { quantity }, { fields: CART_FIELDS }, headers),
  );
  return withConsent(cart, headers);
}

export async function removeLine(lineId: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  // The delete answers with `parent`, the cart after the change.
  const { parent } = await medusaRequest((sdk) =>
    sdk.store.cart.deleteLineItem(id, lineId, { fields: CART_FIELDS }, headers),
  );
  if (parent === undefined) throw new MedusaRequestError("Medusa answered no cart", "rejected");
  return withConsent(parent, headers);
}

export async function applyPromoCode(code: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.addPromotions(id, { promo_codes: [code] }, { fields: CART_FIELDS }, headers),
  );
  return withConsent(cart, headers);
}

export async function removePromoCode(code: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.removePromotions(id, { promo_codes: [code] }, { fields: CART_FIELDS }, headers),
  );
  return withConsent(cart, headers);
}

// --- Checkout (T52 wires these four) --------------------------------------------------------------

/** An address as the Store API takes it; the actions build it from a zod-checked form. */
export type AddressInput = {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  /** Left out for the seven countries without a city (D65). */
  city?: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  phone?: string;
};

export async function setEmail(email: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.update(id, { email }, { fields: CART_FIELDS }, headers),
  );
  return withConsent(cart, headers);
}

export async function setAddresses(
  shipping: AddressInput,
  billing: AddressInput = shipping,
  locale?: string,
): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.update(
      id,
      { shipping_address: shipping, billing_address: billing },
      { fields: CART_FIELDS },
      headers,
    ),
  );
  return withConsent(cart, headers);
}

export async function setShippingMethod(optionId: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.addShippingMethod(id, { option_id: optionId }, { fields: CART_FIELDS }, headers),
  );
  return withConsent(cart, headers);
}

/**
 * Starts a payment session with `providerId` (`pp_system_default` in M3, D65) and answers with the
 * session the provider made, by provider id: dtc-starter read `payment_sessions[0]`, which is the
 * wrong one once a shopper has switched methods (SPEC §8.2).
 */
export async function initiatePayment(
  providerId: string,
  locale?: string,
): Promise<{ sessionId: string; providerId: string; status: string }> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { payment_collection: collection } = await medusaRequest(async (sdk) => {
    const { cart } = await sdk.store.cart.retrieve(
      id,
      { fields: "id,*payment_collection" },
      headers,
    );
    return sdk.store.payment.initiatePaymentSession(cart, { provider_id: providerId }, {}, headers);
  });
  const session = (collection.payment_sessions ?? []).find(
    (candidate) => candidate.provider_id === providerId && candidate.status === "pending",
  );
  if (session === undefined)
    throw new MedusaRequestError(`Medusa started no ${providerId} session`, "rejected");
  return { sessionId: session.id, providerId, status: session.status };
}

/**
 * Stores where the order's e-mails point (T99, D122): the market's public prefix and its language
 * in the cart's `metadata`, as `{ market, language }`, which Medusa copies to the order when it is
 * placed; and, with `key`, the market's key for the order's analytics events (D124, `market_key`).
 * Medusa merges an update's `metadata` into the cart's, so the update holds these keys only.
 */
export async function setMailTarget(
  target: { market: string; language: string; key?: string },
  locale?: string,
): Promise<void> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  await medusaRequest(async (sdk) => {
    const { cart } = await sdk.store.cart.retrieve(id, { fields: "id,metadata" }, headers);
    const metadata = (cart.metadata ?? {}) as Record<string, unknown>;
    const key = target.key ?? metadata[MARKET_KEY_KEY];
    if (
      metadata["market"] === target.market &&
      metadata["language"] === target.language &&
      metadata[MARKET_KEY_KEY] === key
    )
      return;
    await sdk.store.cart.update(
      id,
      {
        metadata: {
          market: target.market,
          language: target.language,
          ...(key === undefined ? {} : { [MARKET_KEY_KEY]: key }),
        },
      },
      { fields: "id" },
      headers,
    );
  });
}

export type CompletedCart =
  | { kind: "order"; orderId: string; countryCode: string | null }
  | { kind: "cart"; error: string; cart: CartDto };

/**
 * Places the order, after making the cart's analytics metadata the request's (D124). On success
 * the cart cookie is cleared (a new add starts a new cart) and the order's id comes back for the confirmation page; when Medusa refuses (a payment that needs more,
 * stock gone), the cart and Medusa's reason come back instead.
 */
export async function completeCart(locale?: string): Promise<CompletedCart> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  // D124: the order is made from the cart's metadata, so it says what the cookies say now (a
  // withdrawal on the review page counts), whatever the cart said before.
  await syncConsentOf(id, headers);
  const answer = await medusaRequest((sdk) => sdk.store.cart.complete(id, {}, headers));
  if (answer.type === "order") {
    await removeCartId();
    return {
      kind: "order",
      orderId: answer.order.id,
      countryCode: answer.order.shipping_address?.country_code?.toLowerCase() ?? null,
    };
  }
  return {
    kind: "cart",
    error: answer.error.message,
    cart: toCartDto(answer.cart as unknown as WireCart),
  };
}
