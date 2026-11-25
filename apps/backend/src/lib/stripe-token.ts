import { MedusaError } from "@medusajs/framework/utils";

/**
 * What the shop keeps of a ConfirmationToken (M6 D117): the method's type and, for a card, its brand,
 * last four digits and wallet. Never a card's number or anything else of the token.
 */
export type PaymentPreview = {
  type: string;
  brand?: string;
  last4?: string;
  wallet?: string;
};

/** The cart metadata keys the token and its preview live under. */
export const TOKEN_KEY = "stripe_confirmation_token";
export const PREVIEW_KEY = "payment_preview";
/**
 * M6 D119 (T101): `"off_session"` when the kept token saves its method for later (the shopper ticked
 * "Save this card for next time"), so the session asks for `setup_future_usage` too: Stripe refuses
 * a token whose `setup_future_usage` differs from its PaymentIntent's.
 */
export const SAVE_KEY = "stripe_setup_future_usage";
/** M6 D119 (T101): the saved method (`pm_…`) a signed-in customer pays with instead of a token. */
export const METHOD_KEY = "stripe_payment_method";

type TokenObject = {
  id?: unknown;
  object?: unknown;
  expires_at?: unknown;
  payment_intent?: unknown;
  setup_intent?: unknown;
  setup_future_usage?: unknown;
  payment_method_preview?: {
    type?: unknown;
    card?: { brand?: unknown; last4?: unknown; wallet?: { type?: unknown } | null } | null;
  } | null;
};

const text = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === "string" && pattern.test(value) ? value : undefined;

/**
 * The token's verdict, pure (`now` in seconds): usable when it is a ConfirmationToken that no
 * PaymentIntent or SetupIntent has used yet and that has not expired, with its preview, and whether
 * it saves its method for later (`save`: Stripe's `setup_future_usage` is `off_session`; any other
 * value is refused, since the shop asks for no other, D119).
 */
export function judgeToken(
  token: TokenObject,
  now: number,
): { ok: true; preview: PaymentPreview; save: boolean } | { ok: false; reason: string } {
  if (token.object !== "confirmation_token")
    return { ok: false, reason: "not a confirmation token" };
  if (token.payment_intent || token.setup_intent)
    return { ok: false, reason: "the token was used already" };
  if (typeof token.expires_at === "number" && token.expires_at <= now)
    return { ok: false, reason: "the token has expired" };
  const usage = token.setup_future_usage ?? null;
  if (usage !== null && usage !== "off_session")
    return { ok: false, reason: "the token saves its method in a way the shop does not ask for" };
  const raw = token.payment_method_preview;
  const type = text(raw?.type, /^[a-z_]{1,40}$/);
  if (type === undefined) return { ok: false, reason: "the token has no payment method" };
  const preview: PaymentPreview = { type };
  const brand = text(raw?.card?.brand, /^[a-z_]{1,30}$/);
  const last4 = text(raw?.card?.last4, /^\d{4}$/);
  const wallet = text(raw?.card?.wallet?.type, /^[a-z_]{1,30}$/);
  if (brand !== undefined) preview.brand = brand;
  if (last4 !== undefined) preview.last4 = last4;
  if (wallet !== undefined) preview.wallet = wallet;
  return { ok: true, preview, save: usage === "off_session" };
}

/** A preview as metadata holds it, checked again (metadata is writable elsewhere); `null` when it is none. */
export function sanitizePreview(value: unknown): PaymentPreview | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const type = text(raw.type, /^[a-z_]{1,40}$/);
  if (type === undefined) return null;
  const preview: PaymentPreview = { type };
  const brand = text(raw.brand, /^[a-z_]{1,30}$/);
  const last4 = text(raw.last4, /^\d{4}$/);
  const wallet = text(raw.wallet, /^[a-z_]{1,30}$/);
  if (brand !== undefined) preview.brand = brand;
  if (last4 !== undefined) preview.last4 = last4;
  if (wallet !== undefined) preview.wallet = wallet;
  return preview;
}

/** A ConfirmationToken read with the secret key (`GET /v1/confirmation_tokens/:id`); `null` when Stripe says it does not exist. */
export async function retrieveToken(apiKey: string, id: string): Promise<TokenObject | null> {
  const response = await fetch(
    `https://api.stripe.com/v1/confirmation_tokens/${encodeURIComponent(id)}`,
    {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Stripe answered ${response.status} for the confirmation token`,
    );
  return (await response.json()) as TokenObject;
}
