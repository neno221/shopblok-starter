// The names of the visitor's cookies (D60), in a module of their own so that `proxy.ts`, which
// reads `_shopblok_market` and imports nothing `server-only`, shares them with the data layer
// (`medusa/cookies.ts`, which sets them). dtc-starter's names, so a shop moving from it keeps its
// visitors' carts; the `_shopblok_` ones are the storefront's own.
export const COOKIE = {
  jwt: "_medusa_jwt",
  cartId: "_medusa_cart_id",
  pendingCustomer: "_medusa_pending_customer",
  market: "_shopblok_market",
  receipt: "_shopblok_receipt",
  flash: "_shopblok_flash",
} as const;

export type CookieName = (typeof COOKIE)[keyof typeof COOKIE];

/**
 * M6 D123 (T97): the visitor's cookie choice. Not one of `COOKIE`, which the server sets httpOnly:
 * the browser writes and reads this one itself (`lib/visitor/consent-cookie.ts`), and the server
 * only reads it, in the cart's writes (D124).
 */
export const CONSENT_COOKIE = "_shopblok_consent";

/**
 * M6 D124 (T97): "this browser has just registered", for the `signed_up` event. The register action
 * sets it (only with a PostHog key and analytics consent) and the next page's consent island reads
 * and removes it (`lib/analytics/events.ts`); five minutes at most.
 */
export const SIGNED_UP_COOKIE = "_shopblok_signed_up";

/**
 * M6 D124 (T97, PR 138 review): "the visitor has just signed in, signed up or signed out". The auth
 * actions set it (only with a PostHog key) and end in a redirect, a soft navigation inside the same
 * layout, so the page asks `/next/visitor` only once; `VisitorSource` sees it on the next page,
 * removes it and asks again, so PostHog identifies the customer, starts a new visitor after a
 * sign-out, and sends `signed_up`. Five minutes at most.
 */
export const VISITOR_CHANGED_COOKIE = "_shopblok_visitor_changed";
