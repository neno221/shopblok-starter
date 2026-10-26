import { NextResponse, type NextRequest } from "next/server";
import { findMarket } from "./market";
import { resolve } from "./resolve";
import type { MarketMap, Resolution } from "./types";
import { buildPublicUrl } from "./url";

/**
 * The one path no route can ever match, so Next renders `global-not-found` for it (404, English).
 * Every route sits under a `[market]` segment and there is no `app/page.tsx`, so `/` is a page of
 * nothing, whatever pages are added below `[market]`. Other choices stop working: `/_not-found` is
 * one segment and `[market]` takes it as a market key (then the layout's `notFound()` renders
 * Next's default page), and a two-segment path of our own would match `[market]/[...slug]` once
 * that catch-all exists.
 */
export const NOT_FOUND_PATH = "/";

/** A permanent redirect that keeps the method for anything but a read (a form post, a server action). */
export function redirectStatus(method: string): 301 | 308 {
  return method === "GET" || method === "HEAD" ? 301 : 308;
}

/**
 * Where `/` sends a visitor who chose another market (D66, SPEC §8.5: "an explicit choice is
 * remembered in a cookie, and only then can `/` redirect to it"): the root of the chosen market,
 * when the cookie names an open market other than the one `/` shows on this host. Only `/` itself,
 * and only for a read: every other URL is the market it names, whatever the cookie says, so a
 * shared link is never redirected. `undefined` when nothing should change.
 */
export function chosenMarketRedirect(
  req: Pick<NextRequest, "method" | "nextUrl">,
  resolution: Resolution,
  map: MarketMap,
  chosen: string | undefined,
): URL | undefined {
  const { nextUrl } = req;
  if (chosen === undefined || nextUrl.pathname !== "/") return undefined;
  if (req.method !== "GET" && req.method !== "HEAD") return undefined;
  if (resolution.kind !== "rewrite" || resolution.market.key === chosen) return undefined;
  const target = findMarket(map, chosen);
  if (target === undefined) return undefined;
  const location = new URL(buildPublicUrl(target, "/", map), nextUrl.origin);
  location.search = nextUrl.search;
  // A target that is this very page would loop.
  if (location.origin === nextUrl.origin && location.pathname === "/") return undefined;
  return location;
}

/**
 * What the proxy answers for a public URL (SPEC §8.5), given the market map. `resolve` decides;
 * this only turns its answer into a response:
 * - a rewrite serves `/{market.key}{internalPath}` and keeps the query string, so the URL in the
 *   browser stays the public one;
 * - a redirect goes to the path `resolve` chose, on the same origin, with 301 (308 for a method
 *   other than GET and HEAD);
 * - not found is a rewrite to Next's `global-not-found` route, which answers 404 in the default
 *   language, as for any URL that matches no route;
 * - `/` with `chosenMarket` (the `_shopblok_market` cookie) naming another open market answers 307
 *   to that market's root (`chosenMarketRedirect`).
 *
 * Pure apart from reading the request: no I/O, so a test feeds it any map.
 */
export function respondToMarketRequest(
  req: NextRequest,
  map: MarketMap,
  chosenMarket?: string,
): NextResponse {
  const { nextUrl } = req;
  const resolution = resolve(nextUrl, req.headers.get("host") ?? "", map);

  // 307: the choice can change, so no browser may remember the redirect.
  const chosen = chosenMarketRedirect(req, resolution, map, chosenMarket);
  if (chosen !== undefined) return NextResponse.redirect(chosen, 307);

  if (resolution.kind === "rewrite") {
    const url = nextUrl.clone();
    url.pathname = `/${resolution.market.key}${resolution.internalPath}`;
    return NextResponse.rewrite(url);
  }

  if (resolution.kind === "redirect") {
    const target = new URL(resolution.location, nextUrl.origin);
    // `resolve` never leaves the host. If a bug there ever did, an open redirect is worse than a 404.
    if (target.origin === nextUrl.origin) {
      return NextResponse.redirect(target, redirectStatus(req.method));
    }
  }

  const url = nextUrl.clone();
  url.pathname = NOT_FOUND_PATH;
  url.search = "";
  return NextResponse.rewrite(url);
}
