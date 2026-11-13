import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "./lib/cookie-names";
import { getProxyMarketMap } from "./lib/markets/proxy-market-map";
import { respondToMarketRequest } from "./lib/markets/proxy-response";
import { compiledFor } from "./lib/redirects/match";
import { getProxyRedirects } from "./lib/redirects/proxy-redirects";

// Public URLs carry no market key (SPEC §8.1): `/us/store` is served from `/en-us/store`, and the
// internal `/en-us/store` is a 404. `resolve` (lib/markets) decides all of that; this file reads
// the map and runs it. The map comes from `/next/markets` through a 30 s in-process cache (D10),
// not from Payload's Local API: loading Payload here cost 550 ms on the first request of a process,
// and the plan allows 150 ms (T11, SETUP.md). The CMS redirects (D82, T68) come the same way, from
// `/next/redirects`, and are answered before the rewrite; `proxy-imports.test.ts` fails if anything
// this file imports reaches Payload. The CSP split (M7) plugs in here later. `/` alone redirects to
// the market the visitor chose (`_shopblok_market`, D66).
//
// A path with a broken escape (`/us/collections/%ZZ`) is a plain 404 here: Next decodes a dynamic
// route's params and answers a `URIError` with a 500 before any page runs (PR 78 review, item 2).
export async function proxy(req: NextRequest) {
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
  );
}

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
  matcher: [
    "/((?!(?:admin|api|design-system|ingest|monitoring|next)(?:/|$)|_next/|_vercel/|\\.well-known/|.*\\.[A-Za-z][A-Za-z0-9]*$).*)",
    "/((?!ingest/).*/)",
  ],
};
