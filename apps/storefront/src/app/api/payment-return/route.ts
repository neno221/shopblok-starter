import { leaveFlash } from "../../../lib/flash";
import { getMarketContext } from "../../../lib/market-context";
import { mailTarget } from "../../../lib/markets";
import { completeCart, readCartPayment } from "../../../lib/medusa/cart";
import { setReceipt } from "../../../lib/medusa/cookies";
import { STRIPE_PAYMENT_PROVIDER, stripePublishableKey } from "../../../lib/medusa/payment";
import { PAID_STATUSES, readIntent, secretFits } from "../../../lib/stripe/intent";

// D65, M6 D117 (T100): where the review's payment lands, whether Stripe sent the shopper away (a
// wallet such as Revolut Pay, a 3-D Secure check) or the island comes here itself:
// `?market=<key>&payment_intent=pi_…&payment_intent_client_secret=…` (Stripe adds the last two to
// its `return_url`; the island adds `reason`, Stripe.js's sentence in the market's language). Only the visitor's own cart is completed, and only for its own PaymentIntent:
// the intent must be the one of the cart's Stripe session, and its status is read from Stripe (the
// publishable key and the client secret), never taken from the URL. Authorised (or paid, or
// settling later): the cart is completed (Medusa answers the same order when the webhook placed it
// already), the receipt cookie names it, and the confirmation page follows. Refused: back to the
// delivery step with Stripe's reason, at the payment's error (focus lands there, WCAG 2.4.3).
// Every answer is a 303 a browser without scripts follows, never cached.

const NO_STORE = { "cache-control": "private, no-store" };

const see = (location: string) =>
  new Response(null, { status: 303, headers: { location, ...NO_STORE } });

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const context = await getMarketContext(query.get("market") ?? "");
  const key = stripePublishableKey();
  if (context === null || key === null)
    return new Response(null, { status: 404, headers: NO_STORE });
  const delivery = context.url("/checkout/delivery");
  const refused = async (errors: Record<string, string>, values?: Record<string, string>) => {
    const flash = await leaveFlash(delivery, { errors, ...(values ? { values } : {}) });
    return see(`${delivery}?f=${flash}#main-payment-error`);
  };

  const intent = query.get("payment_intent") ?? "";
  const secret = query.get("payment_intent_client_secret") ?? "";
  if (!secretFits(intent, secret)) return refused({ paymentMethod: "unpaid" });

  const payment = await readCartPayment(STRIPE_PAYMENT_PROVIDER);
  // No cart (the cookie is gone: placed in another tab): the cart page says what there is.
  if (payment === null) return see(context.url("/cart"));
  // Another cart's intent, or one this cart no longer has: nothing of this cart is paid.
  if (payment.intentId !== intent) return refused({ paymentMethod: "unpaid" });

  const state = await readIntent(key, intent, secret, context.market.htmlLang);
  const target = { ...mailTarget(context.market, context.map), key: context.market.key };
  // Stripe could not be read (unreachable, a timeout, a 5xx): Medusa reads the intent itself with the
  // secret key when it completes, and refuses one that is not paid, so a paid shopper is not told
  // otherwise while the webhook places the order (PR 140's review, item 6).
  if (state === null) {
    const answer = await completeCart(context.market.medusaLocale, target);
    if (answer.kind === "cart") return refused({ paymentMethod: "unpaid" });
    await setReceipt(answer.orderId);
    return see(context.url(`/order/${encodeURIComponent(answer.orderId)}/confirmed`));
  }
  if (!PAID_STATUSES.has(state.status)) {
    // Stripe's API says why in English; Stripe.js said it in the market's language, and the island
    // passes that on (`reason`), shown only for an attempt Stripe says failed.
    const said = (query.get("reason") ?? "").trim().slice(0, 200);
    const reason = state.reason ? said || state.reason : null;
    return reason
      ? refused({ paymentMethod: "declined" }, { paymentReason: reason })
      : refused({ paymentMethod: "unpaid" });
  }

  const answer = await completeCart(context.market.medusaLocale, target);
  if (answer.kind === "cart") {
    const review = context.url("/checkout/review");
    const flash = await leaveFlash(review, { form: "rejected", errors: {} });
    return see(`${review}?f=${flash}`);
  }
  await setReceipt(answer.orderId);
  return see(context.url(`/order/${encodeURIComponent(answer.orderId)}/confirmed`));
}
