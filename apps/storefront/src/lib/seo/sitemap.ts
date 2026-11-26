import type { MetadataRoute } from "next";
import { hreflangAlternates } from "../markets/hreflang";
import { listMarkets } from "../markets/market";
import type { Market, MarketMap } from "../markets/types";
import { buildPublicUrl } from "../markets/url";
import { absolute } from "./product";

// M7 D147 (T110): the sitemaps (SPEC §12), one per market through `generateSitemaps()`, split past
// Google's 50,000 addresses. Pure, so `app/sitemap.ts` and the tests share it: `sitemap-data.ts`
// reads what each market sells and publishes, and this turns it into Next's entries, each with
// its `alternates.languages` from the builder the pages' hreflang uses (`hreflangAlternates`).

/** Google's limit of addresses in one sitemap (sitemaps.org; Search Central's "Build a sitemap"). */
export const SITEMAP_LIMIT = 50_000;

/**
 * One address of a market's sitemap. `path` is the page's path inside its market (`/products/x`),
 * the same in every market, or, for a page whose address is in the market's language (a CMS page,
 * a post, D80), a function that gives it per market: `null` where it has none.
 */
export type SitemapAddress = {
  path: string | ((market: Market) => string | null);
  /** When it last changed, as ISO 8601 (Medusa's `updated_at`, Payload's `updatedAt`). */
  lastModified?: string;
};

/** A sitemap's id: the market's key for its first part, then `{key}_2`, `{key}_3`… (`_` is in no key). */
export function sitemapId(key: string, part: number): string {
  return part === 1 ? key : `${key}_${part}`;
}

/** The market's key and the part (from 1) a sitemap's id names, or `undefined` for a malformed id. */
export function parseSitemapId(id: string): { key: string; part: number } | undefined {
  const match = /^([^_]+)(?:_([1-9][0-9]*))?$/.exec(id);
  if (match === null || match[1] === undefined) return undefined;
  const part = match[2] === undefined ? 1 : Number(match[2]);
  // `{key}_1` is the first part under another name: one address per sitemap.
  return match[2] === "1" ? undefined : { key: match[1], part };
}

/** How many sitemaps `count` addresses need: at least one, so an empty market still has its home's. */
export const sitemapParts = (count: number, limit = SITEMAP_LIMIT) =>
  Math.max(1, Math.ceil(count / limit));

/** Every sitemap id of the markets, in the map's order: what `generateSitemaps()` returns. */
export function sitemapIdsByMarket(
  counts: Readonly<Record<string, number>>,
  map: MarketMap,
  limit = SITEMAP_LIMIT,
): Record<string, string[]> {
  return Object.fromEntries(
    listMarkets(map).map((market) => [
      market.key,
      Array.from({ length: sitemapParts(counts[market.key] ?? 0, limit) }, (_, index) =>
        sitemapId(market.key, index + 1),
      ),
    ]),
  );
}

/** A path or a URL as an absolute URL: a market on its own domain has one already. */
const absoluteIn = (url: string, base: URL) => absolute(url, base);

/**
 * The entries of one market's sitemap: each address the market has, at its public URL (absolute,
 * as sitemaps require), with `lastModified` and the address in every open market as
 * `alternates.languages` (`x-default` included; none with a single market, SPEC §12). An address
 * the market has no path for is left out. `part` (from 1) picks the slice of `limit` addresses.
 */
export function sitemapEntries(
  market: Market,
  map: MarketMap,
  addresses: readonly SitemapAddress[],
  base: URL,
  { part = 1, limit = SITEMAP_LIMIT }: { part?: number; limit?: number } = {},
): MetadataRoute.Sitemap {
  const own = addresses.flatMap((address) => {
    const path = typeof address.path === "string" ? address.path : address.path(market);
    return path === null ? [] : [{ address, path }];
  });
  return own.slice((part - 1) * limit, part * limit).map(({ address, path }) => {
    const languages = Object.fromEntries(
      Object.entries(hreflangAlternates(address.path, map)).map(([lang, url]) => [
        lang,
        absoluteIn(url, base),
      ]),
    );
    return {
      url: absoluteIn(buildPublicUrl(market, path, map), base),
      ...(address.lastModified === undefined ? {} : { lastModified: address.lastModified }),
      ...(Object.keys(languages).length === 0 ? {} : { alternates: { languages } }),
    };
  });
}

/** How many addresses a market has in `addresses` (the ones with a path there). */
export function addressCount(market: Market, addresses: readonly SitemapAddress[]): number {
  return addresses.filter(
    (address) => typeof address.path === "string" || address.path(market) !== null,
  ).length;
}

/** The newest of some ISO dates, or `undefined` when there is none. */
export function newest(dates: readonly (string | undefined)[]): string | undefined {
  let best: string | undefined;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const date of dates) {
    if (date === undefined) continue;
    const time = Date.parse(date);
    if (!Number.isNaN(time) && time > bestTime) {
      best = date;
      bestTime = time;
    }
  }
  return best;
}
