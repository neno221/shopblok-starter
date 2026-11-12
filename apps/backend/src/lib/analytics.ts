import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { amountOf } from "./order-email";

/**
 * Medusa's analytics events (M6 D124, T97): `cart_created`, `order_placed` and `order_canceled`,
 * through the Analytics Module (`config/modules.ts`: PostHog with `POSTHOG_EVENTS_API_KEY`, else
 * `analytics-local`, which only logs at debug level). **Sent only for a cart or order that carries
 * the visitor's consent**: the storefront writes `analytics_consent: true` and PostHog's distinct id
 * into the cart's `metadata` from the request's consent cookie in every cart action and right
 * before placing the order, and removes them when consent is withdrawn; Medusa copies the cart's
 * `metadata` to the order. No consent, no event (GDPR Art. 7(3)).
 *
 * The event's person is the visitor's PostHog distinct id, so it joins the visitor's own events;
 * else the customer's Medusa id (the browser identifies a signed-in customer by it); else the
 * cart's or order's id, with no person profile made for it. The properties are what the shop's
 * own browser events carry (`market`, `locale`) and the sums, never a name or an address.
 */

/** The keys the storefront writes (`apps/storefront/src/lib/medusa/cart.ts`). */
export const ANALYTICS_CONSENT_KEY = "analytics_consent";
export const DISTINCT_ID_KEY = "posthog_distinct_id";
export const MARKET_KEY_KEY = "market_key";

/** What the events read of a cart or an order. */
export type AnalyticsSubject = {
  id: string;
  metadata?: Record<string, unknown> | null;
  customer_id?: string | null;
  locale?: string | null;
};

/** A distinct id as PostHog's cookie holds it (the storefront checks the same). */
const DISTINCT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** Who the event is about, or `null` when the cart or order carries no consent. */
export function analyticsActor(
  subject: AnalyticsSubject,
): { actorId: string; person: boolean } | null {
  const metadata = subject.metadata ?? {};
  if (metadata[ANALYTICS_CONSENT_KEY] !== true) return null;
  const distinctId = metadata[DISTINCT_ID_KEY];
  if (typeof distinctId === "string" && DISTINCT_ID.test(distinctId))
    return { actorId: distinctId, person: true };
  if (subject.customer_id) return { actorId: subject.customer_id, person: true };
  return { actorId: subject.id, person: false };
}

/** `market` (the market's key, as `el-cy`) and `locale` (Medusa's, as `el-GR`), as the browser's. */
export function analyticsContext(subject: AnalyticsSubject): {
  market: string | null;
  locale: string | null;
} {
  const market = subject.metadata?.[MARKET_KEY_KEY];
  return {
    market: typeof market === "string" && market !== "" ? market : null,
    locale: subject.locale ?? null,
  };
}

type AnalyticsService = {
  track(data: {
    event: string;
    actor_id: string;
    properties?: Record<string, unknown>;
  }): Promise<void>;
};

/**
 * Sends `event` about `subject` when it carries consent; `false` when it does not. A failure is
 * logged and swallowed: an order is placed or canceled whatever PostHog says.
 */
export async function sendAnalytics(
  container: MedusaContainer,
  event: string,
  subject: AnalyticsSubject,
  properties: Record<string, unknown>,
): Promise<boolean> {
  const actor = analyticsActor(subject);
  if (actor === null) return false;
  try {
    const analytics = container.resolve<AnalyticsService>(Modules.ANALYTICS);
    await analytics.track({
      event,
      actor_id: actor.actorId,
      properties: {
        ...analyticsContext(subject),
        ...properties,
        ...(actor.person ? {} : { $process_person_profile: false }),
      },
    });
    return true;
  } catch (error) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`${event}: the analytics event was not sent (${(error as Error).message}).`);
    return false;
  }
}

/** The order's fields the events read. */
const ORDER_FIELDS = [
  "id",
  "display_id",
  "currency_code",
  "total",
  "customer_id",
  "locale",
  "metadata",
  "items.quantity",
];

type OrderSubject = AnalyticsSubject & {
  display_id?: number | null;
  currency_code?: string | null;
  total?: unknown;
  items?: { quantity?: unknown }[] | null;
};

/** The order's event: `order_placed` or `order_canceled`, with its sums. */
export async function sendOrderEvent(
  container: MedusaContainer,
  event: "order_placed" | "order_canceled",
  orderId: string,
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })) as { data: OrderSubject[] };
  const order = data[0];
  if (order === undefined) return false;
  return sendAnalytics(container, event, order, {
    order_id: order.id,
    order_number: order.display_id ?? null,
    currency: order.currency_code ?? null,
    total: amountOf(order.total),
    items: (order.items ?? []).reduce((sum, item) => sum + amountOf(item.quantity), 0),
  });
}

/** The cart's event: `cart_created`. */
export async function sendCartCreated(
  container: MedusaContainer,
  cartId: string,
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "cart",
    fields: ["id", "currency_code", "customer_id", "locale", "metadata"],
    filters: { id: cartId },
  })) as { data: (AnalyticsSubject & { currency_code?: string | null })[] };
  const cart = data[0];
  if (cart === undefined) return false;
  return sendAnalytics(container, "cart_created", cart, {
    cart_id: cart.id,
    currency: cart.currency_code ?? null,
  });
}
