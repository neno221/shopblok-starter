import type { NextRequest } from "next/server";
import { getProxyMarketMap } from "./lib/markets/proxy-market-map";
import { respondToMarketRequest } from "./lib/markets/proxy-response";

// Public URLs carry no market key (SPEC §8.1): `/us/store` is served from `/en-us/store`, and the
// internal `/en-us/store` is a 404. `resolve` (lib/markets) decides all of that; this file reads
// the map and runs it. The map comes from `/next/markets` through a 30 s in-process cache (D10),
// not from Payload's Local API: loading Payload here cost 550 ms on the first request of a process,
// and the plan allows 150 ms (T11, SETUP.md). CMS redirects (M4) and the CSP split (M7) plug in
// here later.
export async function proxy(req: NextRequest) {
  return respondToMarketRequest(req, await getProxyMarketMap());
}

export const config = {
  // Not for Payload (`/admin`, `/api`), the draft-mode routes and the map route (`/next`), Next's
  // own paths, Vercel's, `/.well-known/`, or a file: a last segment that ends in `.` and a letter
  // and then letters and digits (`logo.png`, `robots.txt`). A dot before a digit is a slug
  // (`size-8.5`, `1.5l-bottle`) and stays a storefront path. The segment must end after a name, so
  // `/administrator` is still a storefront path. A path the matcher skips also skips server
  // function calls: Payload's routes don't use any. The value has to be a literal.
  matcher: [
    "/((?!(?:admin|api|next)(?:/|$)|_next/|_vercel/|\\.well-known/|.*\\.[A-Za-z][A-Za-z0-9]*$).*)",
  ],
};
