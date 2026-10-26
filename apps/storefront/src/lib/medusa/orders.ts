import "server-only";
import type { Money } from "./products";
import { getAuthHeaders } from "./cookies";
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
};

export type OrderDto = {
  id: string;
  displayId: number;
  email: string | null;
  customerId: string | null;
  createdAt: string;
  status: string;
  currencyCode: string;
  lines: OrderLineDto[];
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
};

type WireOrder = {
  id: string;
  display_id?: number | null;
  email?: string | null;
  customer_id?: string | null;
  created_at?: string | Date | null;
  status?: string | null;
  currency_code: string;
  item_subtotal?: number | null;
  discount_total?: number | null;
  shipping_total?: number | null;
  tax_total?: number | null;
  total?: number | null;
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
            },
          ],
    ),
    subtotal: money(order.item_subtotal),
    discountTotal: money(order.discount_total),
    shippingTotal: money(order.shipping_total),
    taxTotal: money(order.tax_total),
    total: money(order.total),
  };
}

const ORDER_FIELDS =
  "id,display_id,email,customer_id,created_at,status,currency_code,item_subtotal,discount_total,shipping_total,tax_total,total,*items";

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
 * receipt does not come through here: the confirmation page has the order the completed cart
 * answered with (D65), and a guest claims an order through the transfer (T53).
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
