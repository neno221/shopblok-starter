import "server-only";

// Ours (M6 T100, D117). A PaymentIntent as the shopper's browser may read it: with the shop's
// publishable key and the intent's client secret (Stripe's `GET /v1/payment_intents/:id` with
// `client_secret`), so the storefront needs no secret key. `/api/payment-return` reads its status.

export type IntentState = {
  /** Stripe's status: `requires_capture` once authorised (D117's manual capture). */
  status: string;
  /** Why the last attempt failed (a declined card, a failed 3-D Secure check), when it did. */
  reason: string | null;
};

/** The statuses a cart completes on: authorised, paid, or a method that settles later. */
export const PAID_STATUSES: ReadonlySet<string> = new Set([
  "requires_capture",
  "succeeded",
  "processing",
]);

/** Whether `secret` is `intent`'s client secret by its shape (`pi_…_secret_…`). */
export function secretFits(intent: string, secret: string): boolean {
  return /^pi_[A-Za-z0-9]{1,100}$/.test(intent) && /^[A-Za-z0-9_]{1,200}$/.test(secret)
    ? secret.startsWith(`${intent}_secret_`)
    : false;
}

/**
 * The intent's status and last error; `null` when Stripe does not know it or refuses (a secret
 * that is not its). `language` asks for the error in the market's language.
 */
export async function readIntent(
  publishableKey: string,
  intent: string,
  secret: string,
  language: string,
): Promise<IntentState | null> {
  const url = new URL(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(intent)}`);
  url.searchParams.set("client_secret", secret);
  const answer = await fetch(url, {
    headers: { authorization: `Bearer ${publishableKey}`, "accept-language": language },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!answer.ok) return null;
  const body = (await answer.json()) as {
    id?: unknown;
    status?: unknown;
    last_payment_error?: { message?: unknown } | null;
  };
  if (body.id !== intent || typeof body.status !== "string") return null;
  const message = body.last_payment_error?.message;
  return { status: body.status, reason: typeof message === "string" ? message : null };
}
