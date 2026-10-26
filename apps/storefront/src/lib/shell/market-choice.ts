import type { MarketChoice, MarketOption } from "@shopblok/registry/contracts";
import { listMarkets } from "../markets/market";
import type { Market, MarketMap } from "../markets/types";
import { buildPublicUrl } from "../markets/url";

// MarketSwitcher's countries (D66, SPEC §8.4): the open markets of the map, a country per row with
// its languages in the map's order (its default first), each language a link. The layout draws the
// switcher once for every page under it and knows no page's path, so each link is the market's
// home; `market-choice-island.tsx` sends a click to the same page in that market (the path inside
// a market is the same in every market) and records the choice. A country Medusa has no region for
// sells nothing yet, so it is left out (it has no currency to show either).

export function toMarketChoice(
  map: MarketMap,
  current: Pick<Market, "key">,
  currencyOf: (country: string) => string | undefined,
): MarketChoice | undefined {
  const byCountry = new Map<string, Market[]>();
  for (const market of listMarkets(map))
    byCountry.set(market.country, [...(byCountry.get(market.country) ?? []), market]);
  const markets = [...byCountry].flatMap(([country, languages]): MarketOption[] => {
    const currencyCode = currencyOf(country);
    if (currencyCode === undefined) return [];
    return [
      {
        country,
        flagCode: country.toUpperCase(),
        currencyCode: currencyCode.toUpperCase(),
        languages: languages.map((market) => ({
          language: market.language,
          htmlLang: market.htmlLang,
          href: buildPublicUrl(market, "/", map),
          current: market.key === current.key,
        })),
      },
    ];
  });
  // The contract wants the current market among them: one with no region has no switcher at all.
  const hasCurrent = markets.some((option) =>
    option.languages.some((language) => language.current),
  );
  return hasCurrent ? { markets } : undefined;
}
