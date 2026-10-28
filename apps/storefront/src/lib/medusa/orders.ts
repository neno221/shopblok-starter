import "server-only";
import type { MailTarget } from "../markets/url";
import type { Money } from "./products";
import { toAddressDto, type CartAddressDto, type WireAddress } from "./cart";
import { getAuthHeaders, getReceiptOrderId } from "./cookies";
import { getCustomer } from "./customer";
import { localeHeaders, medusaRequest, MedusaRequestError } from "./sdk";

// A customer's orders (D64), from dtc-starter's `lib/data/orders.ts`. T53 draws them; T52's
// confirmation page reads one by id. Medusa's `/store/orders` answers the token's own orders only,
// and `getOrder` checks the owner again here (SPEC §11.1: ownership for anything by id), so a
// guessed id never shows another shopper's order even if the backend's scoping changed.

export type OrderLineDto = {
  id: string;
  productHandle: string | null;
  variantId: string | null;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: Money;
  total: Money;
  /** How many were packed, shipped, delivered, asked back and received back (Medusa's detail). */
  fulfilled: number;
  shipped: number;
  delivered: number;
  returnRequested: number;
  returnReceived: number;
};

export type OrderDto = {
  id: string;
  displayId: number;
  email: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  currencyCode: string;
  lines: OrderLineDto[];
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
  shippingAddress: CartAddressDto | null;
  /** The shipping method (the first; M3 has one per order), its name and price. */
  shippingMethod: { name: string; amount: Money } | null;
  /** The provider of the order's first payment (`pp_system_default` in M3). */
  paymentProviderId: string | null;
};

type WireOrder = {
  id: string;
  display_id?: number | null;
  email?: string | null;
  customer_id?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  status?: string | null;
  currency_code: string;
  item_subtotal?: number | null;
  discount_total?: number | null;
  shipping_total?: number | null;
  tax_total?: number | null;
  total?: number | null;
  shipping_address?: WireAddress | null;
  shipping_methods?: ({ name?: string | null; amount?: number | null } | null)[] | null;
  payment_collections?:
    ({ payments?: ({ provider_id?: string | null } | null)[] | null } | null)[] | null;
  items?:
    | ({
        id: string;
        product_handle?: string | null;
        variant_id?: string | null;
        product_title?: string | null;
        title?: string | null;
        thumbnail?: string | null;
        quantity?: number | null;
        unit_price?: number | null;
        total?: number | null;
        detail?: {
          fulfilled_quantity?: number | null;
          shipped_quantity?: number | null;
          delivered_quantity?: number | null;
          return_requested_quantity?: number | null;
          return_received_quantity?: number | null;
        } | null;
      } | null)[]
    | null;
};

export function toOrderDto(order: WireOrder): OrderDto {
  const money = (amount: number | null | undefined): Money => ({
    amount: amount ?? 0,
    currencyCode: order.currency_code,
  });
  return {
    id: order.id,
    displayId: order.display_id ?? 0,
    email: order.email ?? null,
    customerId: order.customer_id ?? null,
    createdAt: new Date(order.created_at ?? 0).toISOString(),
    updatedAt: new Date(order.updated_at ?? order.created_at ?? 0).toISOString(),
    status: order.status ?? "pending",
    currencyCode: order.currency_code,
    lines: (order.items ?? []).flatMap((item) =>
      item === null
        ? []
        : [
            {
              id: item.id,
              productHandle: item.product_handle ?? null,
              variantId: item.variant_id ?? null,
              title: item.product_title || item.title || "",
              thumbnail: item.thumbnail ?? null,
              quantity: item.quantity ?? 0,
              unitPrice: money(item.unit_price),
              total: money(item.total),
              fulfilled: item.detail?.fulfilled_quantity ?? 0,
              shipped: item.detail?.shipped_quantity ?? 0,
              delivered: item.detail?.delivered_quantity ?? 0,
              returnRequested: item.detail?.return_requested_quantity ?? 0,
              returnReceived: item.detail?.return_received_quantity ?? 0,
            },
          ],
    ),
    subtotal: money(order.item_subtotal),
    discountTotal: money(order.discount_total),
    shippingTotal: money(order.shipping_total),
    taxTotal: money(order.tax_total),
    total: money(order.total),
    shippingAddress: toAddressDto(order.shipping_address),
    shippingMethod: (() => {
      const method = order.shipping_methods?.find((each) => each !== null);
      return method ? { name: method.name || "", amount: money(method.amount) } : null;
    })(),
    paymentProviderId:
      order.payment_collections
        ?.flatMap((collection) => collection?.payments ?? [])
        .find((payment) => payment?.provider_id)?.provider_id ?? null,
  };
}

const ORDER_FIELDS = [
  "id,display_id,email,customer_id,created_at,updated_at,status,currency_code",
  "item_subtotal,discount_total,shipping_total,tax_total,total,*items,*items.detail",
  "*shipping_address,*shipping_methods,*payment_collections,*payment_collections.payments",
].join(",");

export type OrderPage = { orders: OrderDto[]; page: number; pageCount: number; count: number };

/** One page of the signed-in customer's orders, newest first; `null` when nobody is signed in. */
export async function listOrders(
  page: number,
  pageSize = 10,
  locale?: string,
): Promise<OrderPage | null> {
  const headers = await getAuthHeaders();
  if (headers === undefined) return null;
  const answer = await medusaRequest((sdk) =>
    sdk.store.order.list(
      {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order: "-created_at",
        fields: ORDER_FIELDS,
      },
      { ...(locale ? localeHeaders(locale) : {}), ...headers },
    ),
  );
  return {
    orders: (answer.orders as unknown as WireOrder[]).map(toOrderDto),
    page,
    pageCount: Math.max(1, Math.ceil(answer.count / pageSize)),
    count: answer.count,
  };
}

/**
 * An order by id, for its owner only: the signed-in customer whose order it is, or `null`. A guest's
 * receipt does not come through here but through `getReceiptOrder` (D65), and a guest claims an
 * order through the transfer (T53).
 */
export async function getOrder(id: string, locale?: string): Promise<OrderDto | null> {
  const customer = await getCustomer();
  const headers = await getAuthHeaders();
  if (customer === null || headers === undefined) return null;
  try {
    const { order } = await medusaRequest((sdk) =>
      sdk.store.order.retrieve(
        id,
        { fields: ORDER_FIELDS },
        { ...(locale ? localeHeaders(locale) : {}), ...headers },
      ),
    );
    const dto = toOrderDto(order as unknown as WireOrder);
    return dto.customerId === customer.id ? dto : null;
  } catch (error) {
    if (error instanceof MedusaRequestError && error.status === 404) return null;
    throw error;
  }
}

/**
 * The receipt's order (D65): the signed-in customer's own, or the one this browser placed (the
 * signed receipt cookie, `setReceipt`); `null` for any other id. The Store API answers any order by
 * id to anyone with the publishable key (checked on the stack: a guest's order, no token), so this
 * check is the only thing between a guessed id and someone's address.
 */
export async function getReceiptOrder(id: string, locale?: string): Promise<OrderDto | null> {
  const [receipt, customer, headers] = await Promise.all([
    getReceiptOrderId(),
    getCustomer(),
    getAuthHeaders(),
  ]);
  if (receipt !== id && customer === null) return null;
  try {
    const { order } = await medusaRequest((sdk) =>
      sdk.store.order.retrieve(
        id,
        { fields: ORDER_FIELDS },
        { ...(locale ? localeHeaders(locale) : {}), ...(headers ?? {}) },
      ),
    );
    const dto = toOrderDto(order as unknown as WireOrder);
    if (receipt === dto.id) return dto;
    return customer !== null && dto.customerId === customer.id ? dto : null;
  } catch (error) {
    if (error instanceof MedusaRequestError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Starts the claim of a guest order (D64, `{m}/order/lookup`): Medusa e-mails the order's address a
 * link to accept it. The caller checks first that the customer is verified and that the e-mail
 * they typed is the order's.
 */
export async function requestOrderTransfer(orderId: string): Promise<void> {
  const headers = await getAuthHeaders();
  if (headers === undefined) throw new MedusaRequestError("Nobody is signed in", "rejected", 401);
  await medusaRequest((sdk) =>
    sdk.store.order.requestTransfer(orderId, {}, { fields: "id" }, headers),
  );
}

export async function acceptOrderTransfer(orderId: string, token: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  return medusaRequest((sdk) => sdk.store.order.acceptTransfer(orderId, { token }, {}, headers))
    .then(() => true)
    .catch(() => false);
}

export async function declineOrderTransfer(orderId: string, token: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  return medusaRequest((sdk) => sdk.store.order.declineTransfer(orderId, { token }, {}, headers))
    .then(() => true)
    .catch(() => false);
}

/**
 * How many of a line may still be sent back: what was packed for it and has not been asked back
 * or received back already. Nothing before it is fulfilled (a return is of what the shopper has).
 */
export function returnableOf(line: OrderLineDto): number {
  return Math.max(0, line.fulfilled - line.returnRequested - line.returnReceived);
}

export type ReturnReasonDto = { id: string; label: string };

/** The store's return reasons (T53, the seed's four), as the shop wrote them. */
export async function listReturnReasons(): Promise<ReturnReasonDto[]> {
  const { return_reasons } = await medusaRequest((sdk) =>
    sdk.client.fetch<{ return_reasons: { id: string; label?: string | null }[] }>(
      "/store/return-reasons",
      { query: { fields: "id,label" } },
    ),
  );
  return return_reasons.map((reason) => ({
    id: reason.id,
    label: reason.label || reason.id,
  }));
}

/**
 * A return of the customer's own order (T53): the backend's `/store/customers/me/returns`, which
 * checks the order is the token's customer's and ships it back with the zone's free return option.
 */
export async function createCustomerReturn(input: {
  orderId: string;
  items: { id: string; quantity: number }[];
  reasonId: string;
  note?: string;
}): Promise<void> {
  const headers = await getAuthHeaders();
  if (headers === undefined) throw new MedusaRequestError("Nobody is signed in", "rejected", 401);
  await medusaRequest((sdk) =>
    sdk.client.fetch("/store/customers/me/returns", {
      method: "POST",
      headers,
      body: {
        order_id: input.orderId,
        items: input.items,
        reason_id: input.reasonId,
        ...(input.note === undefined ? {} : { note: input.note }),
      },
    }),
  );
}

/**
 * Claims a guest order by its number and e-mail (T53, D64): the backend's
 * `/store/customers/me/order-transfers`, which e-mails the order's address a link to accept it
 * (in the market's prefix and language, T70). A number and an e-mail that match no order are a
 * 404.
 */
export async function claimOrder(
  displayId: number,
  email: string,
  mail: MailTarget,
): Promise<void> {
  const headers = await getAuthHeaders();
  if (headers === undefined) throw new MedusaRequestError("Nobody is signed in", "rejected", 401);
  await medusaRequest((sdk) =>
    sdk.client.fetch("/store/customers/me/order-transfers", {
      method: "POST",
      headers,
      body: { display_id: displayId, email, market: mail.market, language: mail.language },
    }),
  );
}

/** An order's number by its id, for the transfer link's page (the Store API answers anyone). */
export async function getOrderNumber(id: string): Promise<number | null> {
  try {
    const { order } = await medusaRequest((sdk) =>
      sdk.store.order.retrieve(id, { fields: "id,display_id" }),
    );
    const number = (order as { display_id?: number | null }).display_id;
    return typeof number === "number" && number > 0 ? number : null;
  } catch (error) {
    if (error instanceof MedusaRequestError && error.status === 404) return null;
    throw error;
  }
}
