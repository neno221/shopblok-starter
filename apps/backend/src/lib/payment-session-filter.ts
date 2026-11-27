import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import { clientOf } from "./rate-limit/middleware";
import { requestPath } from "./rate-limit/signature";

// M7 D144 (T109): a cart's payment secrets go only to the cart's owner.
//
// A Stripe payment session's `data` is the PaymentIntent, and with its `client_secret` anyone can
// confirm it in a browser, with the saved card its `payment_method` names (T101). Medusa's store
// API answers a cart, its payment collection and its order to whoever has the id (the id is the
// cart's only secret, SETUP "Saved payment methods (T101)", "For M7's security pass"). So:
//
// - **The filter.** Every `/store/*` answer that holds a payment session's or a payment's `data`
//   (the list is `SESSION_ROUTES` below, each read by `payment-session-filter.spec.ts`) has
//   `client_secret` and `payment_method` taken out of it, at any depth, unless the caller may see
//   them: **on a customer's cart** (a customer with an account, `has_account`) only that customer,
//   signed in (Medusa's `auth_context`, signed or not); **on a guest's cart** (no customer, or the
//   guest customer Medusa makes from the e-mail) only a call the shop's server signed (T108's
//   `x-shopblok-client`), since the cart's id is a guest's only secret.
// - **The owner check.** Every write to a customer's cart (the cart, its lines, promotions,
//   shipping, taxes, transfer to a customer, completion, its payment collection and sessions, and
//   our `payment-token` route) answers 403 to anyone but that customer, signed in.
// - **The cart's `shopblok_access`.** Every answer with a `cart` says what the caller is to it
//   (`owner`, `guest` or `other`), so the storefront can offer sign-in to a visitor whose cookie
//   names a customer's cart they are not signed in as (an expired session), with no second call.
//
// The owner is read again when the answer is sent, so a write that changes it (a transfer to a
// customer, an e-mail that names an account) is judged as the cart now is. The answer is never
// changed in place: Medusa's caching module may hand the same object to the next request.

/** The keys a session's or a payment's `data` keeps only for the cart's owner. */
export const SECRET_KEYS = ["client_secret", "payment_method"] as const;

/** What the caller is to a cart: its customer, anyone on a guest's cart, or someone else. */
export type Access = "owner" | "guest" | "other";

/** The response field that carries `Access` on a cart (`lib/medusa/cart.ts` reads it). */
export const ACCESS_FIELD = "shopblok_access";

/**
 * Every store route whose answer can hold a payment session's or a payment's `data`, as Medusa
 * 2.23 serves it, and ours that answer a cart. The spec reads each one; a route Medusa adds that
 * answers a cart is under `/store/carts/:id` and so filtered too.
 */
export const SESSION_ROUTES = [
  "GET /store/carts/:id",
  "POST /store/carts",
  "POST /store/carts/:id",
  "POST /store/carts/:id/line-items",
  "POST /store/carts/:id/line-items/:line_id",
  "DELETE /store/carts/:id/line-items/:line_id",
  "POST /store/carts/:id/promotions",
  "DELETE /store/carts/:id/promotions",
  "POST /store/carts/:id/shipping-methods",
  "POST /store/carts/:id/taxes",
  "POST /store/carts/:id/customer",
  "POST /store/carts/:id/complete",
  "POST /store/carts/:id/payment-token",
  "POST /store/payment-collections",
  "POST /store/payment-collections/:id/payment-sessions",
  "POST /store/payment-collections/:id/payment-sessions/:session_id",
  "GET /store/orders/:id",
  "GET /store/orders",
] as const;

/** Who may see the secrets, pure: `owner` is the cart's customer with an account, if any. */
export function accessOf(who: {
  owner: string | null;
  caller: string | undefined;
  signed: boolean;
}): { access: Access; reveal: boolean } {
  if (who.owner === null) return { access: "guest", reveal: who.signed };
  return who.caller !== undefined && who.caller !== "" && who.caller === who.owner
    ? { access: "owner", reveal: true }
    : { access: "other", reveal: false };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Where a session's or a payment's `data` sits: these keys hold one, or a list of them. */
const HOLDERS = new Set(["payment_sessions", "payment_session", "payments", "payment"]);

/** `data` without the secret keys, at any depth; the same object when there were none. */
function withoutSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    const mapped = value.map(withoutSecrets);
    return mapped.some((each, i) => each !== value[i]) ? mapped : value;
  }
  if (!isRecord(value)) return value;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if ((SECRET_KEYS as readonly string[]).includes(key)) {
      changed = true;
      continue;
    }
    const next = withoutSecrets(inner);
    if (next !== inner) changed = true;
    out[key] = next;
  }
  return changed ? out : value;
}

/** A session or a payment with its `data` filtered. */
function filterHeld(value: unknown): unknown {
  if (Array.isArray(value)) {
    const mapped = value.map(filterHeld);
    return mapped.some((each, i) => each !== value[i]) ? mapped : value;
  }
  if (!isRecord(value)) return value;
  const filtered = filterBody(value);
  if (!isRecord(filtered) || !("data" in filtered)) return filtered;
  const data = withoutSecrets(filtered.data);
  return data === filtered.data ? filtered : { ...filtered, data };
}

/**
 * The answer with every session's and payment's `data` filtered (pure, never in place): the
 * secret keys are left out of the `data` of anything under `payment_sessions`, `payment_session`,
 * `payments` or `payment`, wherever that sits in the answer.
 */
export function filterBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    const mapped = body.map(filterBody);
    return mapped.some((each, i) => each !== body[i]) ? mapped : body;
  }
  if (!isRecord(body)) return body;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(body)) {
    const next = HOLDERS.has(key) ? filterHeld(inner) : filterBody(inner);
    if (next !== inner) changed = true;
    out[key] = next;
  }
  return changed ? out : body;
}

/** Whether the answer holds a secret key in a session's or a payment's `data` (the fast path). */
export function holdsSecrets(body: unknown): boolean {
  return filterBody(body) !== body;
}

/** What the request is about, read from its path (and a new collection's body). */
export type Target =
  { kind: "cart"; id: string } | { kind: "collection"; id: string } | { kind: "order"; id: string };

const decode = (segment: string): string | undefined => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
};

/**
 * The cart, payment collection or order a store request names, if any (pure). The fixed segments
 * match in any case, as Medusa's Express router matches its routes (`/store/Carts/:id/line-items`
 * reaches the same handler); the id is kept as written, as the route's `:id` keeps it.
 */
export function targetOf(method: string, path: string, body: unknown): Target | undefined {
  const match = /^\/store\/(carts|payment-collections|orders)(?:\/([^/]+))?/i.exec(path);
  if (match === null) return undefined;
  const kind = match[1]!.toLowerCase();
  const segment = match[2];
  if (segment === undefined) {
    // `POST /store/payment-collections` names its cart in the body.
    if (kind === "payment-collections" && method === "POST" && isRecord(body)) {
      const cartId = body.cart_id;
      return typeof cartId === "string" && cartId !== "" ? { kind: "cart", id: cartId } : undefined;
    }
    return undefined;
  }
  const id = decode(segment);
  if (id === undefined || id === "") return undefined;
  if (kind === "carts") return { kind: "cart", id };
  if (kind === "payment-collections") return { kind: "collection", id };
  return { kind: "order", id };
}

type CustomerRef = { id?: string | null; has_account?: boolean | null } | null | undefined;
type Row = { customer_id?: string | null; customer?: CustomerRef };

/** The customer with an account a row belongs to, or `null` (a guest, or a guest customer). */
const ownerOfRow = (row: Row | undefined): string | null =>
  row?.customer_id && row.customer?.has_account === true ? row.customer_id : null;

/** The cart's (or order's) owner, read from the database: `undefined` when there is no such row. */
export async function ownerOf(
  scope: MedusaContainer,
  target: Target,
): Promise<{ owner: string | null } | undefined> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  if (target.kind === "collection") {
    const { data } = (await query.graph({
      entity: "payment_collection",
      fields: ["id", "cart.id", "cart.customer_id", "cart.customer.has_account"],
      filters: { id: target.id },
    })) as { data: { cart?: Row | null }[] };
    if (data[0] === undefined) return undefined;
    return { owner: ownerOfRow(data[0].cart ?? undefined) };
  }
  const { data } = (await query.graph({
    entity: target.kind,
    fields: ["id", "customer_id", "customer.has_account"],
    filters: { id: target.id },
  })) as { data: Row[] };
  if (data[0] === undefined) return undefined;
  return { owner: ownerOfRow(data[0]) };
}

const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** The signed-in customer's id, if the caller is one (Medusa authenticates every `/store` route). */
const callerOf = (req: MedusaRequest): string | undefined => {
  const context = (req as AuthenticatedMedusaRequest).auth_context;
  return context?.actor_type === "customer" && context.actor_id ? context.actor_id : undefined;
};

/** The answer's cart, as a target, when the path named none (`POST /store/carts`). */
function cartOfBody(body: unknown): Target | undefined {
  if (!isRecord(body) || !isRecord(body.cart)) return undefined;
  const id = body.cart.id;
  return typeof id === "string" && id !== "" ? { kind: "cart", id } : undefined;
}

/** The answer as the caller may see it: filtered unless `reveal`, and its cart's access said. */
export function shapeBody(body: unknown, verdict: { access: Access; reveal: boolean }): unknown {
  const shown = verdict.reveal ? body : filterBody(body);
  if (!isRecord(shown) || !isRecord(shown.cart)) return shown;
  return { ...shown, cart: { ...shown.cart, [ACCESS_FIELD]: verdict.access } };
}

/**
 * The middleware, on every `/store/*` route (`api/middlewares.ts`): the owner check before a write,
 * and the filter on the answer.
 */
export async function paymentSessionFilter(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> {
  const path = requestPath(req.originalUrl ?? req.url);
  const target = targetOf(req.method, path, req.body);
  const caller = callerOf(req);
  const signed = clientOf(req).signed;

  if (WRITES.has(req.method) && target !== undefined && target.kind !== "order") {
    const found = await ownerOf(req.scope, target);
    if (found !== undefined && accessOf({ ...found, caller, signed }).access === "other")
      throw new MedusaError(
        MedusaError.Types.FORBIDDEN,
        "This cart belongs to a customer account: only that customer, signed in, can change it.",
      );
  }

  const send = res.json.bind(res);
  res.json = ((body: unknown) => {
    const about = target ?? cartOfBody(body);
    const hasCart = isRecord(body) && isRecord(body.cart);
    if (about === undefined || (!hasCart && !holdsSecrets(body)))
      return send(about === undefined ? filterBody(body) : body);
    // No owner found (the row is gone, or the lookup failed): the secrets stay out, and the cart
    // says no access, which the storefront reads as a guest's. `other` would show a guest the
    // held cart over one failed read, and their next add would start a new cart.
    ownerOf(req.scope, about)
      .then((found) =>
        send(
          found === undefined
            ? filterBody(body)
            : shapeBody(body, accessOf({ ...found, caller, signed })),
        ),
      )
      .catch(() => send(filterBody(body)));
    return res;
  }) as typeof res.json;
  next();
}
