import "server-only";
import { getMarketContext } from "../market-context";
import { addLine } from "../medusa/cart";
import { medusaRequest } from "../medusa/sdk";
import { e2eGate } from "./gate";

// T48's hook for `shell.spec.ts`: a cart with `quantity` of the catalog's first variant, made for the
// visitor who asks (the cart cookie is set on this answer), so the spec can check the header's
// count before any page can add to a cart (T49's product page). Off, it is a 404, like every route
// under `/next/e2e`.

const MARKET = /^[a-z]{2,3}-[a-z]{2}$/;

/** `POST ?market=en-us&quantity=2`: the visitor's cart with that many of one variant. */
export async function respondWithCart(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const market = params.get("market") ?? "";
  const quantity = Number(params.get("quantity") ?? "1");
  if (!MARKET.test(market) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    return Response.json({ error: "bad market or quantity" }, { status: 400 });
  const context = await getMarketContext(market);
  if (context === null) return Response.json({ error: "no such market" }, { status: 404 });
  const { products } = await medusaRequest((sdk) =>
    sdk.store.product.list({ limit: 1, fields: "id,*variants", region_id: context.region.id }),
  );
  const variantId = products[0]?.variants?.[0]?.id;
  if (variantId === undefined)
    return Response.json({ error: "the catalog has no variant" }, { status: 409 });
  const cart = await addLine(
    { regionId: context.region.id, locale: context.market.medusaLocale },
    variantId,
    quantity,
  );
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  return Response.json({ count }, { headers: { "cache-control": "private, no-store" } });
}
