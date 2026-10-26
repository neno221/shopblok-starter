import "server-only";
import type { Category, MarketChoice } from "@shopblok/registry/contracts";
import { getCurrentMarket } from "../../lib/current-market";
import { hrefsFor } from "../../lib/market-context";
import type { CurrentMarket } from "../../lib/market-locale";
import { getRenderMarketMap } from "../../lib/markets/cached-market-map";
import { listMarkets } from "../../lib/markets/market";
import type { MarketMap } from "../../lib/markets/types";
import { buildPublicUrl } from "../../lib/markets/url";
import { listCategories } from "../../lib/medusa/categories";
import { listRegions, type Region } from "../../lib/medusa/regions";
import { MedusaRequestError } from "../../lib/medusa/sdk";
import { toMarketChoice } from "../../lib/shell/market-choice";
import { toCategories } from "../../lib/view-models/category";
import { cache } from "react";

// What the header and the footer read, once per render (React's `cache`): the market, the map, the
// category tree and the regions, all `cached()` entries, so a catalog page's `ensureStatic` covers
// the layout too (D66 step 1). Medusa's reads fall back to nothing when Medusa does not answer (a
// build with no backend, a backend that was never up for this entry): the shell then has no
// navigation and no switcher, and the page is regenerated with them within 30 s of Medusa's return
// (the market map's life, `cached-market-map.ts`). Once an entry exists, an outage serves it stale.

export type ShellData = {
  market: CurrentMarket;
  map: MarketMap;
  /** A path inside the market as its public URL. */
  url: (path: string) => string;
  categories: Category[];
  choice: MarketChoice | undefined;
  /** Every option's market: its key and its home, for the choice island. */
  homes: { key: string; home: string }[];
};

const orNothing = async <T>(read: Promise<T>, nothing: T): Promise<T> => {
  try {
    return await read;
  } catch (error) {
    if (error instanceof MedusaRequestError) return nothing;
    throw error;
  }
};

export const getShellData = cache(async (): Promise<ShellData> => {
  const [market, map] = await Promise.all([getCurrentMarket(), getRenderMarketMap()]);
  const url = (path: string) => buildPublicUrl(market, path, map);
  const [tree, regions] = await Promise.all([
    orNothing(listCategories(market.medusaLocale), []),
    orNothing(listRegions(), [] as Region[]),
  ]);
  const currencyOf = (country: string) =>
    regions.find((region) => region.countries.includes(country))?.currencyCode;
  const choice = toMarketChoice(map, market, currencyOf);
  return {
    market,
    map,
    url,
    categories: toCategories(tree, hrefsFor(url)),
    choice,
    homes: listMarkets(map).map((each) => ({
      key: each.key,
      home: buildPublicUrl(each, "/", map),
    })),
  };
});
