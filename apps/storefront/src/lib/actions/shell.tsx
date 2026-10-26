"use server";

import { catalogs } from "@shopblok/i18n";
import { MarketSuggestionBanner } from "@shopblok/ui/organisms/market-suggestion-banner";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { getMarketContext } from "../market-context";
import { getChosenMarket } from "../medusa/cookies";
import { suggestionFor } from "../visitor/handlers";

// The shell's server-rendered islands (D66, T48). MarketSuggestionBanner is a server component on
// purpose (D49: no flag and no formatter in a client chunk), but what it shows is per visitor, and a
// catalog page is prerendered for everyone (ADR 0004). So the page's island asks this action once
// the visitor store has a suggestion, and the action renders the banner on the server, in the
// market's language, and answers it as React's payload. The suggestion is worked out again here from
// the request (the cookie, the country and the languages), not taken from the browser, so a page
// can only ever show the banner the server would give it.

const MAX_PATH = 2048;

/** The banner for `market` and the page at `path`, or `null` when there is nothing to suggest. */
export async function renderSuggestionBanner(market: unknown, path: unknown): Promise<ReactNode> {
  if (typeof market !== "string" || typeof path !== "string" || path.length > MAX_PATH) return null;
  const context = await getMarketContext(market);
  if (context === null) return null;
  const [request, chosen] = await Promise.all([headers(), getChosenMarket()]);
  const suggestion = await suggestionFor(context, chosen, request, path);
  if (suggestion === null) return null;
  const { market: _key, ...shown } = suggestion;
  return (
    <MarketSuggestionBanner
      suggestion={shown}
      copy={catalogs[context.market.locale].organisms.marketSuggestionBanner}
      locale={context.market.htmlLang}
    />
  );
}
