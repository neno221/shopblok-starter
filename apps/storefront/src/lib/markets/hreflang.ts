import { fallbackMarketOf, listMarkets } from "./market";
import type { MarketMap } from "./types";
import { buildPublicUrl } from "./url";

/**
 * The hreflang alternates of a page (SPEC §12): every market's URL under its `<html lang>` value,
 * then `x-default` for the fallback market. It has the shape of `alternates.languages` in Next's
 * metadata, in the map's order. With a single market there is nothing to alternate, so it is empty
 * (SPEC §12: "with a single market, no hreflang is emitted"). A market on its own domain is listed
 * with its absolute URL (SPEC §12: "per-country domains are included"). Next resolves the others
 * against `metadataBase`.
 */
export function hreflangAlternates(path: string, map: MarketMap): Record<string, string> {
  const markets = listMarkets(map);
  if (markets.length < 2) return {};
  const alternates: Record<string, string> = {};
  // Two markets can share a lang value (a language override applies to every country using it);
  // hreflang values are unique, so the first market in the map's order keeps it.
  for (const market of markets) alternates[market.htmlLang] ??= buildPublicUrl(market, path, map);
  const fallback = fallbackMarketOf(map);
  if (fallback !== undefined) alternates["x-default"] = buildPublicUrl(fallback, path, map);
  return alternates;
}
