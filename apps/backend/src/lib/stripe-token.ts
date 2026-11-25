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

type TokenObject = {
  id?: unknown;
  object?: unknown;
  expires_at?: unknown;
  payment_intent?: unknown;
  setup_intent?: unknown;
  payment_method_preview?: {
    type?: unknown;
    card?: { brand?: unknown; last4?: unknown; wallet?: { type?: unknown } | null } | null;
  } | null;
};

const text = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === "string" && pattern.test(value) ? value : undefined;

/**
 * The token's verdict, pure (`now` in seconds): usable when it is a ConfirmationToken that no
 * PaymentIntent or SetupIntent has used yet and that has not expired, with its preview.
 */
export function judgeToken(
  token: TokenObject,
  now: number,
): { ok: true; preview: PaymentPreview } | { ok: false; reason: string } {
  if (token.object !== "confirmation_token")
    return { ok: false, reason: "not a confirmation token" };
  if (token.payment_intent || token.setup_intent)
    return { ok: false, reason: "the token was used already" };
  if (typeof token.expires_at === "number" && token.expires_at <= now)
    return { ok: false, reason: "the token has expired" };
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
  return { ok: true, preview };
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
    throw new Error(`Stripe answered ${response.status} for the confirmation token`);
  return (await response.json()) as TokenObject;
}
