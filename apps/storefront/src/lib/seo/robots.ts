import type { MetadataRoute } from "next";
import type { RawEnv } from "../env";
import { listMarkets, normalizeHost } from "../markets/market";
import type { Market, MarketMap } from "../markets/types";
import { marketPrefix } from "../markets/url";
import { hstsEnabled } from "../security/headers";
import { NONCE_ROUTES } from "../security/nonce-routes";

// M7 D147 (T110): `robots.txt` (SPEC §12). Pure, so `app/robots.ts` and the tests share it: the
// route reads the environment, the host and the map, and this turns them into Next's object.

/**
 * The first segments no crawler is sent to under every market's prefix (D147): the nine nonce
 * routes (`lib/security/nonce-routes.ts`, so a route added there is closed here too) and the
 * search, which every market has at `{prefix}/{segment}`.
 */
export const MARKET_DISALLOWED_SEGMENTS = [...NONCE_ROUTES, "search"] as const;

/**
 * The segments that exist only at the host's root, whatever the markets' prefixes (PR 155's
 * review): Payload's admin and API (`app/(payload)`), Next's own routes (`app/next`) and the
 * design system (`app/design-system`). Closed once at the root on every host, so a host whose
 * markets all have a prefix (`/us`, `/de`) still closes `/admin/`.
 */
export const ROOT_DISALLOWED_SEGMENTS = ["admin", "api", "next", "design-system"] as const;

/** Every segment `robots.txt` closes, the market ones and the root ones. */
export const DISALLOWED_SEGMENTS = [
  ...MARKET_DISALLOWED_SEGMENTS,
  ...ROOT_DISALLOWED_SEGMENTS,
] as const;

/**
 * Whether crawlers may index this deployment (D147, D133): only on `DEPLOY_ENV=production`, in
 * D133's order, so a Vercel preview is closed whatever `DEPLOY_ENV` says. Not `deployEnv()`'s
 * answer alone: without `DEPLOY_ENV` it counts `NODE_ENV=production` (CI's `next start`, a local
 * `next start`) and Vercel's Production (staging, D132) as production, and those stay closed until
 * the go-live sets the name. The same rule as HSTS's (`hstsEnabled`, T106): both wait for the
 * deployment that is the live shop.
 */
export function robotsOpen(source: RawEnv): boolean {
  return hstsEnabled(source);
}

/**
 * The markets a host serves at their own URLs: on a country's own domain, that country's; anywhere
 * else, every market without a domain of its own. A market on its own domain is listed on that
 * domain only (its pages' canonical URLs are there, `buildPublicUrl`).
 */
export function marketsOnHost(map: MarketMap, host: string): Market[] {
  const name = normalizeHost(host);
  const markets = listMarkets(map);
  const own = markets.filter((market) => market.domain !== undefined && market.domain === name);
  return own.length > 0 ? own : markets.filter((market) => market.domain === undefined);
}

/**
 * The `Disallow` lines of the markets on a host: the root segments once at the root (`/admin$`),
 * then for each prefix (`""`, `/us`, `/ch/fr`) each market segment, as the page itself
 * (`/us/cart$`), anything under it (`/us/cart/`) and with a query (`/us/search?`). Robots rules
 * match by prefix, so a bare `/cart` would also hide a CMS page at `/cartography`; `$` is the end
 * of the URL for Google and Bing (RFC 9309 leaves it out, and a crawler that ignores it reads
 * `/us/cart$` as a path no page has).
 */
export function disallowedPaths(markets: readonly Market[], map: MarketMap): string[] {
  const forms = (path: string) => [`${path}$`, `${path}/`, `${path}?`];
  const prefixes = [...new Set(markets.map((market) => marketPrefix(market, map)))];
  return [
    ...ROOT_DISALLOWED_SEGMENTS.flatMap((segment) => forms(`/${segment}`)),
    ...prefixes.flatMap((prefix) =>
      MARKET_DISALLOWED_SEGMENTS.flatMap((segment) => forms(`${prefix}/${segment}`)),
    ),
  ];
}

/** Where a sitemap is: `/sitemap/{id}.xml` (`generateSitemaps`), on the market's own origin. */
export function sitemapUrl(market: Market, id: string, base: URL): string {
  const origin = market.domain === undefined ? base.origin : `https://${market.domain}`;
  return `${origin}/sitemap/${encodeURIComponent(id)}.xml`;
}

/** `robots.txt` where nothing may be crawled: staging, previews, CI and development (D133). */
export const CLOSED_ROBOTS: MetadataRoute.Robots = { rules: { userAgent: "*", disallow: "/" } };

export type OpenRobotsInput = {
  /** The request's `Host`. */
  host: string;
  map: MarketMap;
  /** The site's origin (`siteBase()`), for the sitemaps of the markets without a domain. */
  base: URL;
  /** The sitemaps' ids of each market (`sitemapIdsByMarket`), by the market's key. */
  sitemaps: Readonly<Record<string, readonly string[]>>;
};

/**
 * `robots.txt` on the production deployment (D147): the `Disallow` lines and the sitemaps of the
 * markets on this host. With no market on the host (an empty map) it is closed: there is nothing
 * to crawl.
 */
export function openRobots({ host, map, base, sitemaps }: OpenRobotsInput): MetadataRoute.Robots {
  const markets = marketsOnHost(map, host);
  if (markets.length === 0) return CLOSED_ROBOTS;
  return {
    rules: { userAgent: "*", allow: "/", disallow: disallowedPaths(markets, map) },
    sitemap: markets.flatMap((market) =>
      (sitemaps[market.key] ?? []).map((id) => sitemapUrl(market, id, base)),
    ),
  };
}
