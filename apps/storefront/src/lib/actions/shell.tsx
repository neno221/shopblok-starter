"use server";

import { MarketSuggestionBanner } from "@shopblok/ui/organisms/market-suggestion-banner";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { messagesFor } from "../../i18n/market-messages";
import { getMarketContext } from "../market-context";
import { pathInMarket, suggestionForKey } from "../markets/suggest";
import { currencyForCountry, listRegions } from "../medusa/regions";

// The shell's server-rendered islands (D66, T48). MarketSuggestionBanner is a server component on
// purpose (D49: no flag and no formatter in a client chunk), but what it shows is per visitor, and a
// catalog page is prerendered for everyone (ADR 0004). So the page's island asks this action once
// the visitor store has a suggestion, and the action renders the banner on the server, in the
// market's language, and answers it as React's payload. `/next/visitor` has matched the request's
// country and languages and the visitor's choice already; the action takes the key of the market it
// suggested and checks only that it is an open market in another country (PR 75 review, item 8).
// What the banner shows comes from the market map and the regions, never from the browser, so a
// forged call can show its caller a banner for another open market, and nothing else.

const MAX_PATH = 2048;
const MAX_KEY = 64;

/**
 * The banner offering the market `suggested` to a visitor on `market`'s page at `path` (its public
 * path), or `null` when there is nothing to offer.
 */
export async function renderSuggestionBanner(
  market: unknown,
  suggested: unknown,
  path: unknown,
): Promise<ReactNode> {
  if (
    typeof market !== "string" ||
    typeof suggested !== "string" ||
    suggested.length > MAX_KEY ||
    typeof path !== "string" ||
    path.length > MAX_PATH
  )
    return null;
  const context = await getMarketContext(market);
  if (context === null) return null;
  const [request, regions] = await Promise.all([headers(), listRegions()]);
  const suggestion = suggestionForKey(
    {
      map: context.map,
      current: context.market,
      path: pathInMarket(path, request.get("host") ?? "", context.map),
      currencyOf: currencyForCountry(regions),
    },
    suggested,
  );
  if (suggestion === null) return null;
  const { market: _key, ...shown } = suggestion;
  return (
    <MarketSuggestionBanner
      suggestion={shown}
      copy={(await messagesFor(context.market)).organisms.marketSuggestionBanner}
      locale={context.market.htmlLang}
    />
  );
}
