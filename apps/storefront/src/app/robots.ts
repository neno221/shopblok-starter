import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { env } from "../lib/env";
import { getRenderMarketMap } from "../lib/markets/cached-market-map";
import { siteBase } from "../lib/seo/product";
import { CLOSED_ROBOTS, openRobots, robotsOpen } from "../lib/seo/robots";
import { sitemapIds } from "../lib/seo/sitemap-data";

// M7 D147 (T110): `robots.txt` (SPEC §12). It reads the request's host first, so it is answered per
// request (a short file, read rarely) and never frozen at build: the server's `DEPLOY_ENV` and the
// host decide, not the build's. Closed (`Disallow: /`) unless `DEPLOY_ENV=production` (`robotsOpen`,
// D133's order); there, the `Disallow` lines and the sitemaps of the markets served on the host, so
// a market on its own domain lists its sitemap on that domain alone. A route without a dynamic
// segment wins over `next.config.ts`'s `afterFiles` rewrite, so `/robots.txt` is no longer the plain
// 404 of `/next/missing-file` (T28).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  if (!robotsOpen(env)) return CLOSED_ROBOTS;
  const map = await getRenderMarketMap();
  return openRobots({ host, map, base: siteBase(), sitemaps: await sitemapIds(map) });
}
