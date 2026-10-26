// The names of the visitor's cookies (D60), in a module of their own so that `proxy.ts`, which
// reads `_shopblok_market` and imports nothing `server-only`, shares them with the data layer
// (`medusa/cookies.ts`, which sets them). dtc-starter's names, so a shop moving from it keeps its
// visitors' carts.
export const COOKIE = {
  jwt: "_medusa_jwt",
  cartId: "_medusa_cart_id",
  pendingCustomer: "_medusa_pending_customer",
  market: "_shopblok_market",
} as const;

export type CookieName = (typeof COOKIE)[keyof typeof COOKIE];
