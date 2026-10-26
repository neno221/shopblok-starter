import "server-only";
import type { Money } from "./products";
import { getAuthHeaders, getCartId, removeCartId, setCartId } from "./cookies";
import { localeHeaders, medusaRequest, MedusaRequestError } from "./sdk";

// The visitor's cart (D60, D65), ported from dtc-starter's `lib/data/cart.ts` with SPEC §8.2's
// fixes: the cookie is always awaited, the auth headers are left out when nobody is signed in, a
// Medusa error stays a `MedusaRequestError` (no axios-shaped handler), the payment session is the
// one the provider answers with (not `payment_sessions[0]`), and nothing here redirects: the
// actions decide. Never cached across requests: a cart is one visitor's (T52 adds
// `"use cache: private"` where a page reads it twice). Every function returns the `CartDto`, never
// the SDK's cart.

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
  shipping_methods?: ({ id?: string | null; shipping_option_id?: string | null } | null)[] | null;
  shipping_address?: { id?: string | null } | null;
};

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
    completed: Boolean(cart.completed_at),
  };
}

/** The locale header, and the customer's token when someone is signed in (none otherwise). */
async function headersFor(locale?: string | null): Promise<Record<string, string>> {
  return { ...(locale ? localeHeaders(locale) : {}), ...(await getAuthHeaders()) };
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

/** Where a cart sells: the market's region and its Medusa locale. */
export type CartContext = { regionId: string; locale: string };

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
    const { cart } = await medusaRequest((sdk) =>
      sdk.store.cart.create(
        { region_id: context.regionId, locale: context.locale },
        { fields: CART_FIELDS },
        headers,
      ),
    );
    await setCartId(cart.id);
    return toCartDto(cart as unknown as WireCart);
  }
  if (existing.regionId === context.regionId && existing.locale === context.locale) return existing;
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.update(
      existing.id,
      { region_id: context.regionId, locale: context.locale },
      { fields: CART_FIELDS },
      headers,
    ),
  );
  return toCartDto(cart as unknown as WireCart);
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
  return toCartDto(cart as unknown as WireCart);
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
  return toCartDto(cart as unknown as WireCart);
}

export async function removeLine(lineId: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  // The delete answers with `parent`, the cart after the change.
  const { parent } = await medusaRequest((sdk) =>
    sdk.store.cart.deleteLineItem(id, lineId, { fields: CART_FIELDS }, headers),
  );
  if (parent === undefined) throw new MedusaRequestError("Medusa answered no cart", "rejected");
  return toCartDto(parent as unknown as WireCart);
}

export async function applyPromoCode(code: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.addPromotions(id, { promo_codes: [code] }, { fields: CART_FIELDS }, headers),
  );
  return toCartDto(cart as unknown as WireCart);
}

export async function removePromoCode(code: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.removePromotions(id, { promo_codes: [code] }, { fields: CART_FIELDS }, headers),
  );
  return toCartDto(cart as unknown as WireCart);
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
  return toCartDto(cart as unknown as WireCart);
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
  return toCartDto(cart as unknown as WireCart);
}

export async function setShippingMethod(optionId: string, locale?: string): Promise<CartDto> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
  const { cart } = await medusaRequest((sdk) =>
    sdk.store.cart.addShippingMethod(id, { option_id: optionId }, { fields: CART_FIELDS }, headers),
  );
  return toCartDto(cart as unknown as WireCart);
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

export type CompletedCart =
  | { kind: "order"; orderId: string; countryCode: string | null }
  | { kind: "cart"; error: string; cart: CartDto };

/**
 * Places the order. On success the cart cookie is cleared (a new add starts a new cart) and the
 * order's id comes back for the confirmation page; when Medusa refuses (a payment that needs more,
 * stock gone), the cart and Medusa's reason come back instead.
 */
export async function completeCart(locale?: string): Promise<CompletedCart> {
  const id = await requireCartId();
  const headers = await headersFor(locale);
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
