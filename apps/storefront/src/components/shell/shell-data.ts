import "server-only";
import type { Category, MarketChoice } from "@shopblok/registry/contracts";
import { draftMode } from "next/headers";
import {
  footerFrom,
  headerFrom,
  settingsFrom,
  type ShellFooter,
  type ShellHeader,
  type ShellSettings,
} from "../../lib/cms/shell";
import type { PagePaths } from "../../lib/cms/page-path";
import { readPagePaths } from "../../lib/cms/pages";
import { readFooter, readHeader, readSiteSettings } from "../../lib/cms/site";
import { getCurrentMarket } from "../../lib/current-market";
import { hrefsFor } from "../../lib/market-context";
import type { CurrentMarket } from "../../lib/market-locale";
import { getRenderMarketMap } from "../../lib/markets/cached-market-map";
import { listMarkets } from "../../lib/markets/market";
import type { MarketMap } from "../../lib/markets/types";
import { buildPublicUrl } from "../../lib/markets/url";
import { listCategories, type CategoryNode } from "../../lib/medusa/categories";
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
//
// T61 (D78): the `header`, `footer` and `site-settings` globals, in the market's language (D73),
// read beside Medusa. In Draft Mode (an editor's live preview) they are the drafts, uncached. A
// global that cannot be read gives `site.ts`'s values, as one never saved does (`lib/cms/shell.ts`),
// and the failure is logged: the shell is above every page, so it must not throw.
//
// T65 (D80): the pages' addresses in the market's language, so a link to a page (in the globals
// and in a page's blocks) goes to its address there; one read, tagged `pages:<locale>`.

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
  /** The page addresses in the market's language (T65), for internal links; none without a database. */
  pages: PagePaths | null;
  choice: MarketChoice | undefined;
  /** Every option's market: its key and its home, for the choice island. */
  homes: { key: string; home: string }[];
  /** Draft Mode is on: an editor's preview (the globals are their drafts). */
  draft: boolean;
  settings: ShellSettings;
  header: ShellHeader;
  footer: ShellFooter;
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

const cmsOrNothing = async <T>(read: Promise<T | null>): Promise<T | null> => {
  try {
    return await read;
  } catch (error) {
    console.error("shell: a Payload read failed; the header and footer use their defaults", error);
    return null;
  }
};

/** The year the copyright line names: the build's, as a prerendered page keeps it. */
const YEAR = new Date().getUTCFullYear();

export const getShellData = cache(async (): Promise<ShellData> => {
  const [market, map, { isEnabled: draft }] = await Promise.all([
    getCurrentMarket(),
    getRenderMarketMap(),
    draftMode(),
  ]);
  const url = (path: string) => buildPublicUrl(market, path, map);
  const reader = { market, draft };
  const [[tree, regions], header, footer, siteSettings, pages] = await Promise.all([
    medusaConfigured().then(
      (configured): Promise<[CategoryNode[], Region[]]> | [CategoryNode[], Region[]] =>
        configured
          ? Promise.all([
              orNothing(listCategories(market.medusaLocale), []),
              orNothing(listRegions(), [] as Region[]),
            ])
          : [[], []],
    ),
    cmsOrNothing(readHeader(reader)),
    cmsOrNothing(readFooter(reader)),
    cmsOrNothing(readSiteSettings(reader)),
    cmsOrNothing(readPagePaths(reader)),
  ]);
  const choice = toMarketChoice(map, market, currencyForCountry(regions));
  const categories = toCategories(tree, hrefsFor(url));
  const context = { market, map, url, categories, pages };
  const settings = settingsFrom(siteSettings);
  return {
    market,
    map,
    url,
    categories,
    pages,
    choice,
    draft,
    settings,
    header: headerFrom(header, context, settings),
    footer: footerFrom(footer, context, settings, YEAR),
    homes: listMarkets(map).map((each) => ({
      key: each.key,
      home: buildPublicUrl(each, "/", map),
    })),
  };
});
