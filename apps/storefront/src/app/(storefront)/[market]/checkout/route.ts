import { getMarketContext } from "../../../../lib/market-context";
import { marketCart } from "../../../../lib/cart-view";
import { firstOpenStep } from "../../../../lib/view-models/checkout";

// D65 (T52): `/checkout` is a redirect to the step the visitor's cart has reached (contact and
// address first, then delivery and payment, then the review), or to the cart page for an empty
// cart. A route handler, so the answer is a real 307 that a browser without scripts follows: a
// page's `redirect()` under Cache Components comes after the static shell, in the RSC payload.

type Context = { params: Promise<{ market: string }> };

export async function GET(_request: Request, { params }: Context): Promise<Response> {
  const { market } = await params;
  const context = await getMarketContext(market);
  if (context === null) return new Response(null, { status: 404 });
  const cart = await marketCart(context);
  const path =
    cart === null || cart.lines.length === 0 ? "/cart" : `/checkout/${firstOpenStep(cart)}`;
  return new Response(null, {
    status: 307,
    headers: { location: context.url(path), "cache-control": "private, no-store" },
  });
}
