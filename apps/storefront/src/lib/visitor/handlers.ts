import "server-only";
import type { Cart, MarketSuggestion } from "@shopblok/registry/contracts";
import { cartView } from "../cart-view";
import { getMarketContext, type MarketContext } from "../market-context";
import { findMarket } from "../markets/market";
import { pathInMarket, suggestMarket } from "../markets/suggest";
import { getCart } from "../medusa/cart";
import { getChosenMarket } from "../medusa/cookies";
import { getCustomer } from "../medusa/customer";
import { currencyForCountry, listRegions } from "../medusa/regions";
import { MedusaRequestError } from "../medusa/sdk";

// The browser's reads of what only the httpOnly cookies know (D60, ADR 0004 reading 2): a catalog
// page is prerendered for everyone, so its per-visitor parts ask these after hydration. Both are
// per visitor, so every answer is `private, no-store`: no shared cache, CDN or browser cache may
// keep one. A route handler has no `next/root-params`: the market's key comes in the query.

/** No cache may keep an answer: it is one visitor's. */
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: PRIVATE_HEADERS });

/** What `GET /next/visitor` answers (D60). */
export type VisitorAnswer = {
  cartCount: number;
  customer: { firstName: string | null } | null;
  suggestion: (MarketSuggestion & { market: string }) | null;
};

const unavailable = (error: unknown) =>
  error instanceof MedusaRequestError && error.kind === "unreachable";

/**
 * What the banner suggests to this request (D66, SPEC §8.5): `null` once the visitor chose an open
 * market (`chosen`, the `_shopblok_market` cookie; a cookie naming a market that has closed since
 * is no choice), or when there is nothing to suggest. `path` is the page's public path, so the
 * suggestion links to the same page in the other market. `/next/visitor` and the banner's action
 * both ask it.
 */
export async function suggestionFor(
  context: MarketContext,
  chosen: string | undefined,
  headers: Pick<Headers, "get">,
  path: string,
): Promise<VisitorAnswer["suggestion"]> {
  if (chosen !== undefined && findMarket(context.map, chosen) !== undefined) return null;
  const regions = await listRegions();
  const host = headers.get("host") ?? "";
  return suggestMarket({
    map: context.map,
    current: context.market,
    country: headers.get("x-vercel-ip-country"),
    acceptLanguage: headers.get("accept-language"),
    path: pathInMarket(path, host, context.map),
    currencyOf: currencyForCountry(regions),
  });
}

/**
 * `GET /next/visitor?market=<key>&path=<public path>`: the cart's count, the signed-in customer's
 * first name, and the market suggestion (`null` once the visitor chose a market, or when there is
 * nothing to suggest). An unknown market answers the count and the customer with no suggestion,
 * so a page during a change of the market map still learns its cart. 503 when Medusa is down.
 */
export async function visitorResponse(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const key = params.get("market") ?? "";
  try {
    const context = key === "" ? null : await getMarketContext(key);
    const locale = context?.market.medusaLocale;
    const [cart, customer, chosen] = await Promise.all([
      getCart(locale),
      getCustomer(),
      getChosenMarket(),
    ]);
    const suggestion =
      context === null
        ? null
        : await suggestionFor(context, chosen, request.headers, params.get("path") ?? "/");
    const answer: VisitorAnswer = {
      cartCount: cart?.itemCount ?? 0,
      customer: customer === null ? null : { firstName: customer.firstName },
      suggestion,
    };
    return json(answer);
  } catch (error) {
    if (unavailable(error)) return json({ error: "unavailable" }, 503);
    throw error;
  }
}

/**
 * `GET /next/cart?market=<key>`: the cart as the drawer and the quick cart draw it, or `null` when
 * the visitor has none. 404 for a key that names no open market (a cart cannot be priced there).
 */
export async function cartResponse(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("market") ?? "";
  try {
    const context = key === "" ? null : await getMarketContext(key);
    if (context === null) return json({ error: "unknown market" }, 404);
    const cart = await getCart(context.market.medusaLocale);
    const body: Cart | null = cart === null ? null : await cartView(cart, context);
    return json(body);
  } catch (error) {
    if (unavailable(error)) return json({ error: "unavailable" }, 503);
    throw error;
  }
}
