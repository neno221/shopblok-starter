// M7 D147 (T110): every page under `app/(storefront)/[market]`, by its folder inside `[market]`
// (`""` is the market's home), as indexable or not (SPEC §12: "hreflang on every indexable page").
// `routes.test.ts` fails on a page in neither list, so a new route is classified when it is added;
// `e2e/seo.spec.ts` opens one address of each indexable route and fails on one without its
// alternates (`hreflangAlternates`), and one of each other route and fails on one without
// `noindex`. Pure data, no imports.

/**
 * An indexable route and where `seo.spec.ts` finds an address of it: `fixed`, the same path in
 * every market; `sitemap`, the first address of that kind in the market's sitemap (`/products/`);
 * `samePageAs`, a later page of a listing, whose metadata is its first page's function with the
 * page's number (`listingMetadata`, `journalMetadata`), which the demo's catalog is too small to
 * reach (24 a page).
 */
export type IndexableRoute =
  | { route: string; fixed: string }
  | { route: string; sitemap: string }
  | { route: string; samePageAs: string; metadata: string };

export const INDEXABLE_ROUTES: readonly IndexableRoute[] = [
  { route: "", fixed: "/" },
  { route: "store", fixed: "/store" },
  { route: "store/page/[n]", samePageAs: "store", metadata: "listingMetadata" },
  { route: "categories/[...handle]", sitemap: "/categories/" },
  { route: "collections/[handle]", sitemap: "/collections/" },
  { route: "collections/[handle]/page/[n]", samePageAs: "collections/[handle]", metadata: "listingMetadata" },
  { route: "products/[handle]", sitemap: "/products/" },
  { route: "journal", fixed: "/journal" },
  { route: "journal/page/[n]", samePageAs: "journal", metadata: "journalMetadata" },
  { route: "journal/[slug]", sitemap: "/journal/" },
  // A CMS page: the sitemap's first address that is none of the above (`/privacy` in the demo).
  { route: "[...slug]", sitemap: "" },
];

/**
 * The pages no crawler may index (`robots: { index: false }`), each with an address `seo.spec.ts`
 * opens: the nine nonce routes' pages (`lib/security/nonce-routes.ts`), the search, the newsletter's
 * confirmation. An address that needs an id (an order, an address) is one that does not exist: the
 * page answers it with its not-found state, `noindex` too.
 */
export const NOINDEX_ROUTES: Readonly<Record<string, string>> = {
  search: "/search?q=tee",
  cart: "/cart",
  "checkout/[step]": "/checkout/address",
  account: "/account",
  "account/addresses": "/account/addresses",
  "account/addresses/[id]": "/account/addresses/none",
  "account/addresses/new": "/account/addresses/new",
  "account/orders": "/account/orders",
  "account/orders/[id]": "/account/orders/none",
  "account/payment-methods": "/account/payment-methods",
  "account/payment-methods/new": "/account/payment-methods/new",
  "account/payment-methods/remove": "/account/payment-methods/remove",
  "account/profile": "/account/profile",
  "account/returns": "/account/returns",
  "account/returns/[orderId]": "/account/returns/none",
  "order/lookup": "/order/lookup",
  "order/[id]/confirmed": "/order/none/confirmed",
  "order/[id]/transfer/[token]": "/order/none/transfer/none",
  login: "/login",
  register: "/register",
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",
  verify: "/verify",
  "newsletter/confirm": "/newsletter/confirm",
};

/** Pages that exist for the end-to-end suites only (404 unless `E2E_TEST_ROUTES=true`, T59). */
export const TEST_ROUTES: readonly string[] = ["e2e-cms/[slug]"];
