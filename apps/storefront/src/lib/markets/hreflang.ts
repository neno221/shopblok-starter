import { fallbackMarketOf, listMarkets } from "./market";
import type { Market, MarketMap } from "./types";
import { buildPublicUrl } from "./url";

/**
 * The open markets and the fallback of a map, worked out once per map object: `listMarkets` takes
 * about 0.3 ms, which a page pays once, but a sitemap of 50,000 addresses would pay 50,000 times
 * (14 s measured, M7 T110). A map is never changed after it is read, so its object is its identity.
 */
const marketsOfMap = new WeakMap<MarketMap, { markets: Market[]; fallback: Market | undefined }>();

function marketsOf(map: MarketMap) {
  let found = marketsOfMap.get(map);
  if (found === undefined) {
    const markets = listMarkets(map);
    found = { markets, fallback: fallbackMarketOf(map, markets) };
    marketsOfMap.set(map, found);
  }
  return found;
}

/**
 * The hreflang alternates of a page (SPEC §12): every market's URL under its `<html lang>` value,
 * then `x-default` for the fallback market. It has the shape of `alternates.languages` in Next's
 * metadata, in the map's order. With a single market there is nothing to alternate, so it is empty
 * (SPEC §12: "with a single market, no hreflang is emitted"). A market on its own domain is listed
 * with its absolute URL (SPEC §12: "per-country domains are included"). Next resolves the others
 * against `metadataBase`.
 *
 * `path` is the page's path in every market, or, for a page whose address is in the market's
 * language (a CMS page, D80), a function that gives it per market; a market where it gives `null`
 * (the page has no address there) is left out.
 */
export function hreflangAlternates(
  path: string | ((market: Market) => string | null),
  map: MarketMap,
): Record<string, string> {
  const { markets, fallback } = marketsOf(map);
  if (markets.length < 2) return {};
  const pathIn = typeof path === "string" ? () => path : path;
  const urlIn = (market: Market) => {
    const each = pathIn(market);
    return each === null ? undefined : buildPublicUrl(market, each, map);
  };
  const alternates: Record<string, string> = {};
  // Two markets can share a lang value (a language override applies to every country using it);
  // hreflang values are unique, so the first market in the map's order keeps it.
  for (const market of markets) {
    if (market.htmlLang in alternates) continue;
    const url = urlIn(market);
    if (url !== undefined) alternates[market.htmlLang] = url;
  }
  const fallbackUrl = fallback === undefined ? undefined : urlIn(fallback);
  if (fallbackUrl !== undefined) alternates["x-default"] = fallbackUrl;
  return alternates;
}
