import "server-only";
import { notFound } from "next/navigation";
import { market } from "next/root-params";
import { withLocale, type CurrentMarket } from "./market-locale";
import { getRenderMarketMap } from "./markets/cached-market-map";
import { findMarket } from "./markets/market";

/**
 * The market of the current request, from the `[market]` root param. An unknown key is a 404:
 * the root layout calls this first, so nothing else renders. Next's built-in 404 page answers, not
 * `global-not-found`, because the URL matches `/[market]`. The proxy only rewrites to keys it chose
 * from the map, so a visitor reaches this case only through a path the proxy's matcher skips and
 * the map no longer has (SETUP.md, T08 item 2, T11).
 */
export async function getCurrentMarket(): Promise<CurrentMarket> {
  const key = await market();
  const current = findMarket(await getRenderMarketMap(), key);
  if (current === undefined) notFound();
  return withLocale(current);
}
