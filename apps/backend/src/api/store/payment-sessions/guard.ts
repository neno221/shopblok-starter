import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../../../config/modules";
import { listSavedMethods } from "../../../lib/saved-methods";
import { stripeRegistered, SYSTEM_PROVIDER_ID } from "../../../lib/stripe-regions";

// M6 D117 (T100): two checks on Medusa's store route that creates a payment session
// (`POST /store/payment-collections/:id/payment-sessions`), which anyone with a cart's payment
// collection id can call, not only the storefront. (Medusa's update route,
// `…/payment-sessions/:session_id`, takes only `client_data`, which it keeps as `data.client` and the
// Stripe provider never reads, so it needs no check.) The first check runs again when the cart is
// completed (`workflows/hooks/complete-cart-payment.ts`), since a session can outlive it.
//
// 1. **"Pay later" only for a zero total while Stripe is on.** The system provider authorises
//    anything, so a shopper could otherwise call the store API with `pp_system_default` and place an
//    unpaid order. Medusa deletes a cart's sessions whenever a change moves its total
//    (`refreshPaymentCollectionForCartWorkflow`), so a session made at zero does not outlive a total
//    that rises.
// 2. **The session's `data`.** Medusa's Stripe provider passes a fixed list of `data` keys into the
//    PaymentIntent (`capture_method`, `confirm`, `payment_method`, `off_session`,
//    `payment_method_options` and more). Only what the shop sends is taken: `setup_future_usage:
//    "off_session"` (saving a card, D119) and `payment_method` (a saved one, D119), each only from
//    the signed-in customer whose cart it is, and a saved method only if it is theirs. Anything else
//    is refused, and the system provider takes no `data` at all. The caller is the request's
//    `auth_context`: Medusa authenticates every `/store` route for a customer's session or bearer
//    token before the project's middlewares, with `allowUnauthenticated` (its `ApiLoader`), so a
//    signed-in customer is known here and a guest is not (T101's `payment-methods.spec.ts` checks
//    both; PR 140's review, item 5).

/** What a session's `data` may hold, and from whom (D117, D119). */
export type DataVerdict = { ok: true } | { ok: false; reason: string };

/**
 * The `data` check, pure: `caller` is the signed-in customer's id (none for a guest), `owner` the
 * cart's customer, `savedMethods` the caller's own saved methods with Stripe.
 */
export function checkSessionData(
  providerId: string,
  data: unknown,
  who: { caller?: string; owner?: string | null; savedMethods?: readonly string[] },
): DataVerdict {
  if (data === undefined || data === null) return { ok: true };
  if (typeof data !== "object" || Array.isArray(data))
    return { ok: false, reason: "data must be an object" };
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return { ok: true };
  if (providerId !== STRIPE_PROVIDER_ID)
    return { ok: false, reason: `${providerId} takes no data` };
  const signedIn = who.caller !== undefined && who.caller !== "" && who.caller === who.owner;
  for (const [key, value] of entries) {
    if (key === "setup_future_usage") {
      if (value !== "off_session")
        return { ok: false, reason: "setup_future_usage must be off_session" };
      if (!signedIn)
        return { ok: false, reason: "only the cart's signed-in customer saves a method" };
      continue;
    }
    if (key === "payment_method") {
      if (typeof value !== "string" || value === "")
        return { ok: false, reason: "payment_method must be a saved method's id" };
      if (!signedIn)
        return { ok: false, reason: "only the cart's signed-in customer uses a saved method" };
      if (!(who.savedMethods ?? []).includes(value))
        return { ok: false, reason: "payment_method is not one of the customer's saved methods" };
      continue;
    }
    return { ok: false, reason: `${key} is not a key the shop sends` };
  }
  return { ok: true };
}

/** The guard, pure: the system provider on a total above zero while Stripe is registered. */
/** Medusa's statuses of a session it will process at completion (`validateCartPaymentsStep`). */
const PROCESSABLE = new Set([
  "pending",
  "requires_more",
  "authorized",
  "captured",
  "pending_authorization",
]);

/** The providers of the sessions Medusa would process when the cart is completed. */
export function sessionsToProcess(
  sessions: readonly ({ provider_id?: string; status?: string } | null)[],
): string[] {
  return sessions.flatMap((session) =>
    session?.provider_id && session.status && PROCESSABLE.has(session.status)
      ? [session.provider_id]
      : [],
  );
}

export function refusesSystemSession(providerId: string, amount: number, stripe: boolean): boolean {
  return providerId === SYSTEM_PROVIDER_ID && stripe && amount > 0;
}

type CollectionRow = {
  id: string;
  amount: unknown;
  cart?: { id: string; customer_id?: string | null } | null;
};

async function readCollection(req: MedusaRequest, id: string): Promise<CollectionRow> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "cart.id", "cart.customer_id"],
    filters: { id },
  })) as { data: CollectionRow[] };
  const collection = data[0];
  if (collection === undefined)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Payment collection with id: ${id} was not found`,
    );
  return collection;
}

const amountOf = (value: unknown): number => {
  const n =
    typeof value === "object" && value !== null && "numeric" in value
      ? Number((value as { numeric: unknown }).numeric)
      : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Before `POST /store/payment-collections/:id/payment-sessions`: the guard and the `data` check above. */
export async function guardPaymentSession(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const body = (req.body ?? {}) as { provider_id?: unknown; data?: unknown };
  const collection = await readCollection(req, req.params.id);
  const providerId = typeof body.provider_id === "string" ? body.provider_id : "";

  if (
    refusesSystemSession(providerId, amountOf(collection.amount), await stripeRegistered(req.scope))
  )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Pay later is offered only for a zero total while Stripe takes payments.",
    );

  const caller =
    req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : undefined;
  const wantsSaved =
    typeof body.data === "object" && body.data !== null && "payment_method" in body.data;
  const verdict = checkSessionData(providerId, body.data, {
    ...(caller === undefined ? {} : { caller }),
    owner: collection.cart?.customer_id ?? null,
    savedMethods:
      wantsSaved && caller !== undefined
        ? (await listSavedMethods(req.scope, caller)).map((method) => method.id)
        : [],
  });
  if (!verdict.ok)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payment session data refused: ${verdict.reason}.`,
    );
  next();
}
