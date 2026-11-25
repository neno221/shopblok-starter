// Ours (M6 T100, T102; D117). `/api/payment-return` for a market, absolute, as Stripe's `return_url`
// must be; with the intent, the address the islands go to themselves once Stripe has answered
// (Stripe.js's reason in the market's language, shown only when Stripe says the intent failed).
export function paymentReturnUrl(
  market: string,
  intent?: { id: string; secret: string; reason?: string | undefined },
): string {
  const url = new URL("/api/payment-return", window.location.origin);
  url.searchParams.set("market", market);
  if (intent !== undefined) {
    url.searchParams.set("payment_intent", intent.id);
    url.searchParams.set("payment_intent_client_secret", intent.secret);
    if (intent.reason) url.searchParams.set("reason", intent.reason.slice(0, 200));
  }
  return url.toString();
}
