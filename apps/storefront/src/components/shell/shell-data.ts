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
import { currencyForCountry, listRegions, type Region } from "../../lib/medusa/regions";
import { EnvError, medusaEnv } from "../../lib/env";
import { MedusaRequestError } from "../../lib/medusa/sdk";
import { toMarketChoice } from "../../lib/shell/market-choice";
import { toCategories } from "../../lib/view-models/category";
import { cache } from "react";

// What the header and the footer read, once per render (React's `cache`): the market, the map, the
// category tree and the regions, all `cached()` entries, so a catalog page's `ensureStatic` covers
// the layout too (D66 step 1). Medusa's reads fall back to nothing when Medusa does not answer (a
// backend that was never up for this entry): the shell then has no
// navigation and no switcher, and the page is regenerated with them within 30 s of Medusa's return
// (the market map's life, `cached-market-map.ts`). Once an entry exists, an outage serves it stale.
// A build with no Medusa configured (no `.env`, as the design-system job builds) reads nothing at
// all: an error inside a `"use cache"` entry fails the prerender even when its caller catches it.
// Any other error from these reads (an answer of an unexpected shape, say) gives the same empty menu
// and is logged (PR 75 review, item 3): a segment's `error.tsx` is inside its layout and cannot
// catch the layout's own errors, so a throw here would put every market page on the bare global
// error page.

const medusaConfigured = (): Promise<boolean> =>
  medusaEnv().then(
    () => true,
    (error: unknown) => {
      if (error instanceof EnvError) return false;
      throw error;
    },
  );

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
    if (!(error instanceof MedusaRequestError))
      console.error("shell: a Medusa read failed; the header and footer go without it", error);
    return nothing;
  }
};

export const getShellData = cache(async (): Promise<ShellData> => {
  const [market, map] = await Promise.all([getCurrentMarket(), getRenderMarketMap()]);
  const url = (path: string) => buildPublicUrl(market, path, map);
  const [tree, regions] = (await medusaConfigured())
    ? await Promise.all([
        orNothing(listCategories(market.medusaLocale), []),
        orNothing(listRegions(), [] as Region[]),
      ])
    : [[], [] as Region[]];
  const choice = toMarketChoice(map, market, currencyForCountry(regions));
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
