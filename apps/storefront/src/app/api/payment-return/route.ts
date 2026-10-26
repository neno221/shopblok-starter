// dtc-starter's `src/app/api/payment-return/route.ts` (D65, T52): where a payment provider that
// sends the shopper away (a redirect method) sends them back, to complete the cart. M3 pays with
// the system payment only (`pp_system_default`), which never leaves the shop, so the route answers
// 404 until M6 brings a provider that needs it; the path is kept so a provider's settings can name it.

export function GET(): Response {
  return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
}
