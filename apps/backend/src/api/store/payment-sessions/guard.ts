import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";

import { STRIPE_PROVIDER_ID } from "../../../config/modules";
import { stripeRegistered, SYSTEM_PROVIDER_ID } from "../../../lib/stripe-regions";

// M6 D117 (T100): two checks on Medusa's store routes that create and update a payment session
// (`POST /store/payment-collections/:id/payment-sessions[/:session_id]`), which anyone with a cart's
// payment collection id can call, not only the storefront.
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
//    is refused, and the system provider takes no `data` at all.

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
export function refusesSystemSession(providerId: string, amount: number, stripe: boolean): boolean {
  return providerId === SYSTEM_PROVIDER_ID && stripe && amount > 0;
}

type CollectionRow = {
  id: string;
  amount: unknown;
  cart?: { id: string; customer_id?: string | null } | null;
  payment_sessions?: ({ id: string; provider_id: string } | null)[] | null;
};

async function readCollection(req: MedusaRequest, id: string): Promise<CollectionRow> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "payment_collection",
    fields: [
      "id",
      "amount",
      "cart.id",
      "cart.customer_id",
      "payment_sessions.id",
      "payment_sessions.provider_id",
    ],
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

/** The ids of the caller's saved methods with Stripe; none without an account holder there. */
async function savedMethodsOf(req: MedusaRequest, customerId: string): Promise<string[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = (await query.graph({
    entity: "customer",
    fields: ["id", "account_holders.*"],
    filters: { id: customerId },
  })) as {
    data: { account_holders?: (({ provider_id: string } & Record<string, unknown>) | null)[] }[];
  };
  const holder = (data[0]?.account_holders ?? []).find(
    (h) => h?.provider_id === STRIPE_PROVIDER_ID,
  );
  if (!holder) return [];
  const payment = req.scope.resolve(Modules.PAYMENT);
  const methods = await payment.listPaymentMethods({
    provider_id: STRIPE_PROVIDER_ID,
    context: { account_holder: holder as never },
  });
  return methods.map((method) => method.id);
}

const amountOf = (value: unknown): number => {
  const n =
    typeof value === "object" && value !== null && "numeric" in value
      ? Number((value as { numeric: unknown }).numeric)
      : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Before `POST /store/payment-collections/:id/payment-sessions` and
 * `…/payment-sessions/:session_id`: the guard and the `data` check above.
 */
export async function guardPaymentSession(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const body = (req.body ?? {}) as { provider_id?: unknown; data?: unknown };
  const collection = await readCollection(req, req.params.id);
  // The update route names a session, not a provider: the session's own provider is the one.
  const sessionId = req.params.session_id;
  const providerId =
    sessionId === undefined
      ? typeof body.provider_id === "string"
        ? body.provider_id
        : ""
      : ((collection.payment_sessions ?? []).find((s) => s?.id === sessionId)?.provider_id ?? "");

  if (
    sessionId === undefined &&
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
    savedMethods: wantsSaved && caller !== undefined ? await savedMethodsOf(req, caller) : [],
  });
  if (!verdict.ok)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payment session data refused: ${verdict.reason}.`,
    );
  next();
}
