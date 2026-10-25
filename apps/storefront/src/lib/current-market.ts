import "server-only";
import { notFound } from "next/navigation";
import { market } from "next/root-params";
import { withLocale, type CurrentMarket } from "./market-locale";
import { getRenderMarketMap } from "./markets/cached-market-map";
import { findMarket } from "./markets/market";

/**
 * The market of the current request, from the `[market]` root param. An unknown key is a 404:
 * the root layout calls this first, so nothing else renders. Next's built-in 404 page answers, not
 * `global-not-found`, because the URL matches `/[market]`. The proxy and this read the map from
 * different caches (`/next/markets`; `use cache`), so for a while after an owner changes a market
 * a key the proxy knows can be a 404 here; so can a path the proxy's matcher skips (SETUP.md, T08
 * item 2, T11).
 *
 * next-intl reads this for every request (`src/i18n/request.ts`, D62), so a page's translations,
 * its `<html lang>` and its prices all come from the same market, with `withLocale`'s English
 * fallback and time zone applied once.
 */
export async function getCurrentMarket(): Promise<CurrentMarket> {
  const key = await market();
  const current = findMarket(await getRenderMarketMap(), key);
  if (current === undefined) notFound();
  return withLocale(current);
}
