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
  // own paths, Vercel's, or anything with a dot (files). The segment must end after the name, so
  // `/administrator` is still a storefront path. A path the matcher skips also skips server
  // function calls: Payload's routes don't use any. The value has to be a literal, and
  // `proxy.test.ts` reads it from here.
  matcher: ["/((?!(?:admin|api|next)(?:/|$)|_next/|_vercel/|.*\\..*).*)"],
};
