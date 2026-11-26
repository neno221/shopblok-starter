// M7 D139 (T107): the routes that get the nonce policy. SPEC §11.1's four (the cart, the checkout,
// the account and the order pages) and the five sign-in pages, where card fields, saved methods,
// passwords and one-time codes are. A path here is a page's path inside its market (`/cart`,
// `/account/orders/…`), so every market's prefix (`/us/cart`, `/ch/fr/cart`) and an own-domain
// market's bare path (`/cart` on its host) match alike: the proxy asks with the path `resolve`
// (lib/markets) found, after the prefix.
//
// `NONCE_ROUTES` (the nine first segments) is the list T110's `robots.ts` reads for its `Disallow`
// lines (plans/M7.md, D147), so a route added here is closed to crawlers there too.
//
// `NONCE_PAGES` is every page under those nine, as `app/(storefront)/[market]/…` has them
// (`nonce-routes.test.ts` holds the two together). Only those get the nonce: a path under the nine
// that is no page (`/cart/x`, `/account/x`) is the CMS catch-all's 404, whose shell Next prerenders
// at build, without a request and so without the nonce, and whose bootstrap script would be blocked
// under `'strict-dynamic'` (T107's spike, SETUP.md). It keeps the static policy.
//
// Pure, no imports: the proxy's bundle takes it.

export const NONCE_ROUTES = [
  "cart",
  "checkout",
  "account",
  "order",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify",
] as const;

export type NonceRoute = (typeof NONCE_ROUTES)[number];

/** Any one segment: a dynamic segment of the route (`[id]`, `[step]`, `[token]`). */
const ANY = "*";

/** Every page (and the checkout's redirect handler) under the nine routes, segment by segment. */
export const NONCE_PAGES: readonly (readonly string[])[] = [
  ["cart"],
  ["checkout"],
  ["checkout", ANY],
  ["account"],
  ["account", "addresses"],
  ["account", "addresses", ANY],
  ["account", "addresses", "new"],
  ["account", "orders"],
  ["account", "orders", ANY],
  ["account", "payment-methods"],
  ["account", "payment-methods", "new"],
  ["account", "payment-methods", "remove"],
  ["account", "profile"],
  ["account", "returns"],
  ["account", "returns", ANY],
  ["order", "lookup"],
  ["order", ANY, "confirmed"],
  ["order", ANY, "transfer", ANY],
  ["login"],
  ["register"],
  ["forgot-password"],
  ["reset-password"],
  ["verify"],
];

/**
 * Whether a page's path inside its market (`/cart`, `/checkout/delivery`, `/order/x/confirmed`) is
 * one of the nonce pages. Segment by segment, exactly: `/cartography` is not `/cart`, and
 * `/cart/x` is no page.
 */
export function isNonceRoute(internalPath: string): boolean {
  const segments = internalPath.split("/").filter((segment) => segment !== "");
  return NONCE_PAGES.some(
    (page) =>
      page.length === segments.length &&
      page.every((part, index) => part === ANY || part === segments[index]),
  );
}
