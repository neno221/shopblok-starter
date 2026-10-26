import "server-only";
import { withLocale, type CurrentMarket } from "./market-locale";
import { getRenderMarketMap } from "./markets/cached-market-map";
import { findMarket } from "./markets/market";
import type { MarketMap } from "./markets/types";
import { buildPublicUrl } from "./markets/url";
import { getRegionForCountry, type Region } from "./medusa/regions";
import type { Hrefs } from "./view-models/common";

/**
 * What a route handler or a server action knows about the market it was called for (D60): they
 * have no `next/root-params` (`next-root-params.md`), so the browser sends the market's key and
 * this checks it against the map. `null` for a key that names no open market, or a market whose
 * country has no region in Medusa yet (SETUP.md, T07 item 3): neither can hold a cart.
 */
export type MarketContext = {
  map: MarketMap;
  market: CurrentMarket;
  region: Region;
  /** The market's public URLs (SPEC §8.5), for the view models. */
  hrefs: Required<Hrefs>;
  /** A path inside the market as its public URL. */
  url: (path: string) => string;
};

export async function getMarketContext(key: string): Promise<MarketContext | null> {
  const map = await getRenderMarketMap();
  const found = findMarket(map, key);
  if (found === undefined) return null;
  const region = await getRegionForCountry(found.country);
  if (region === undefined) return null;
  const url = (path: string) => buildPublicUrl(found, path, map);
  return { map, market: withLocale(found), region, url, hrefs: hrefsFor(url) };
}

/** A market's catalog URLs (SPEC §8.1) from its `url` (a path inside it as its public URL). */
export function hrefsFor(url: (path: string) => string): Required<Hrefs> {
  const segments = (handle: string) => handle.split("/").map(encodeURIComponent).join("/");
  return {
    product: (handle) => url(`/products/${encodeURIComponent(handle)}`),
    category: (handle) => url(`/categories/${segments(handle)}`),
    collection: (handle) => url(`/collections/${encodeURIComponent(handle)}`),
  };
}
