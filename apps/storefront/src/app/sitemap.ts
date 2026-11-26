import type { MetadataRoute } from "next";
import { getRenderMarketMap } from "../lib/markets/cached-market-map";
import { findMarket } from "../lib/markets/market";
import { siteBase } from "../lib/seo/product";
import { parseSitemapId, sitemapEntries } from "../lib/seo/sitemap";
import { marketAddresses, sitemapIds } from "../lib/seo/sitemap-data";

// M7 D147 (T110): one sitemap per market (SPEC §12) at `/sitemap/{id}.xml`, `{id}` the market's key
// (`/sitemap/en-us.xml`), split into `{key}_2`… past 50,000 addresses. Each lists what the market
// sells and publishes, with `lastModified` and the address in every open market
// (`alternates.languages`), from cached reads under the catalog's and Payload's own tags
// (`lib/seo/sitemap-data.ts`), so the sitemaps are prerendered at build and refreshed by the same
// revalidations as the pages. A closed market has no sitemap and appears in no other's alternates
// (`listMarkets`). Every sitemap is served on every host; `robots.txt` lists a market's only on the
// host its pages are on. The proxy's matcher skips `/sitemap/….xml` (a file), so these answer
// with `headers()`' static policy (T106).

/** Every market's sitemaps, in the map's order. Next also calls it per request to check the id. */
export async function generateSitemaps(): Promise<{ id: string }[]> {
  const ids = await sitemapIds(await getRenderMarketMap());
  return Object.values(ids)
    .flat()
    .map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const parsed = parseSitemapId(await id);
  const map = await getRenderMarketMap();
  const market = parsed === undefined ? undefined : findMarket(map, parsed.key);
  if (parsed === undefined || market === undefined) return [];
  return sitemapEntries(market, map, await marketAddresses(market, map), siteBase(), {
    part: parsed.part,
  });
}
