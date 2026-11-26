import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "./lib/cookie-names";
import { firstUserClosed } from "./lib/env";
import { getProxyMarketMap } from "./lib/markets/proxy-market-map";
import { respondToMarketRequest } from "./lib/markets/proxy-response";
import { compiledFor } from "./lib/redirects/match";
import { getProxyRedirects } from "./lib/redirects/proxy-redirects";
import { newNonce } from "./lib/security/csp";
import { isNonceRoute } from "./lib/security/nonce-routes";
import { nonceCsp, withStaticCsp } from "./lib/security/static-csp";

// Public URLs carry no market key (SPEC §8.1): `/us/store` is served from `/en-us/store`, and the
// internal `/en-us/store` is a 404. `resolve` (lib/markets) decides all of that; this file reads
// the map and runs it. The map comes from `/next/markets` through a 30 s in-process cache (D10),
// not from Payload's Local API: loading Payload here cost 550 ms on the first request of a process,
// and the plan allows 150 ms (T11, SETUP.md). The CMS redirects (D82, T68) come the same way, from
// `/next/redirects`, and are answered before the rewrite; `proxy-imports.test.ts` fails if anything
// this file imports reaches Payload. `/` alone redirects to the market the visitor chose
// (`_shopblok_market`, D66).
//
// M7 D138 (T106): every answer from here carries the static policy (`lib/security/static-csp.ts`),
// the redirects and the 404 too; `next.config.ts`'s `headers()` sets it only on the paths this
// matcher skips, so no response has two.
//
// M7 D139 (T107): on the nine routes of `lib/security/nonce-routes.ts`, in every market, the page's
// request goes on with the nonce policy (a fresh nonce per request) for Next to read and stamp on
// every script it writes, and the response carries that policy in place of the static one, with
// `Cache-Control: private, no-store` (a page with a nonce must never be cached).
//
// A path with a broken escape (`/us/collections/%ZZ`) is a plain 404 here: Next decodes a dynamic
// route's params and answers a `URIError` with a 500 before any page runs (PR 78 review, item 2).
export async function proxy(req: NextRequest) {
  // M7 D136 (6): Payload's first-user form and endpoint, closed on every deployment (the matcher's
  // third entry brings only these two paths here; the staging seed makes the first admin). They
  // are Payload's admin, so they keep its headers (T107's policy, not the shop's static one).
  if (FIRST_USER_PATHS.has(req.nextUrl.pathname)) {
    return firstUserClosed()
      ? new NextResponse("Forbidden", {
          status: 403,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        })
      : NextResponse.next();
  }
  let nonce: { header: string; policy: string } | undefined;
  const response = await respond(req, (internalPath) => {
    if (!isNonceRoute(internalPath)) return undefined;
    nonce = nonceCsp(newNonce());
    const headers = new Headers(req.headers);
    // Next reads the nonce from the request's own policy header (`getScriptNonceFromHeaders`, the
    // enforced one or the report-only one), and nothing else of it.
    for (const name of CSP_REQUEST_HEADERS) headers.delete(name);
    headers.set(nonce.header, nonce.policy);
    return headers;
  });
  if (nonce === undefined) return withStaticCsp(response);
  response.headers.set(nonce.header, nonce.policy);
  response.headers.set("Cache-Control", NONCE_CACHE_CONTROL);
  return response;
}

/** The two policy headers a visitor's request might carry, removed before the proxy sets its own. */
const CSP_REQUEST_HEADERS = ["content-security-policy", "content-security-policy-report-only"];

/** A nonce response's caching (D139): never stored, by a browser or any cache between. */
export const NONCE_CACHE_CONTROL = "private, no-store";

async function respond(
  req: NextRequest,
  rewriteRequestHeaders: (internalPath: string) => Headers | undefined,
): Promise<NextResponse> {
  const slashless = withoutTrailingSlash(req.nextUrl.pathname);
  if (slashless !== null) {
    // A plain URL: `nextUrl` keeps a trailing slash it was parsed with.
    return NextResponse.redirect(
      new URL(`${slashless}${req.nextUrl.search}`, req.nextUrl.origin),
      308,
    );
  }
  if (!decodes(req.nextUrl.pathname))
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  const [map, redirects] = await Promise.all([getProxyMarketMap(), getProxyRedirects()]);
  return respondToMarketRequest(
    req,
    map,
    req.cookies.get(COOKIE.market)?.value || undefined,
    compiledFor(redirects, map),
    rewriteRequestHeaders,
  );
}

/** Payload's first-user form and the endpoint it posts to (M7 D136, 6). */
export const FIRST_USER_PATHS: ReadonlySet<string> = new Set([
  "/admin/create-first-user",
  "/api/users/first-register",
]);

/**
 * T97 (M6 D124): the redirect Next makes when `skipTrailingSlashRedirect` is off, made here instead,
 * for every path but PostHog's `/ingest/…` (whose `/e/` must reach PostHog as it is): `/us/` is
 * `/us`, `/admin/collections/` is `/admin/collections`, with the query kept, as a 308. `null` for a
 * path without one, `/` itself, and `/ingest/…`.
 */
export function withoutTrailingSlash(pathname: string): string | null {
  if (pathname === "/" || !pathname.endsWith("/")) return null;
  if (pathname === "/ingest/" || pathname.startsWith("/ingest/")) return null;
  // Leading slashes and backslashes collapse to one: `//evil.example/` would otherwise be a
  // protocol-relative target on another host (PR 138 review), which Next's own redirect never made.
  return `/${pathname.replace(/\/+$/, "").replace(/^[/\\]+/, "")}`;
}

function decodes(path: string): boolean {
  try {
    decodeURIComponent(path);
    return true;
  } catch {
    return false;
  }
}

export const config = {
  // Not for Payload (`/admin`, `/api`), the design-system pages (`/design-system`, D33), the
  // draft-mode routes and the map route (`/next`), Sentry's tunnel (`/monitoring`, T96), PostHog's (`/ingest`, rewritten by
  // `next.config.ts` before any page, T97), Next's and Vercel's paths, `/.well-known/`, or a
  // file: a last segment ending in `.` and a letter (`logo.png`). A dot before a digit is a slug (`size-8.5`) and stays a storefront path, and
  // `/administrator` is not `/admin`. A skipped path also skips server function calls: Payload's
  // routes use none. The value has to be a literal.
  //
  // The second entry (T97): every path that ends in a slash, but PostHog's `/ingest/…`, for the
  // trailing-slash redirect Next no longer makes (`skipTrailingSlashRedirect`, next.config.ts).
  //
  // The third (M7 D136, 6): Payload's first-user form and endpoint, which answer 403 on a
  // deployment (`FIRST_USER_PATHS`) and pass through untouched anywhere else.
  matcher: [
    "/((?!(?:admin|api|design-system|ingest|monitoring|next)(?:/|$)|_next/|_vercel/|\\.well-known/|.*\\.[A-Za-z][A-Za-z0-9]*$).*)",
    "/((?!ingest/).*/)",
    "/(admin/create-first-user|api/users/first-register)",
  ],
};
