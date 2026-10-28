import type { LivePreviewConfig, PayloadRequest } from "payload";
import { env } from "../lib/env";
import { mapFromGlobal, type MarketsGlobal } from "../lib/markets/global";
import { listMarkets, primaryCountryCode } from "../lib/markets/market";
import type { Market, MarketMap } from "../lib/markets/types";
import { buildPublicUrl } from "../lib/markets/url";

/** D74's three frames: a phone, a tablet and a laptop. */
export const LIVE_PREVIEW_BREAKPOINTS = [
  { name: "mobile", label: "Mobile", width: 375, height: 667 },
  { name: "tablet", label: "Tablet", width: 768, height: 1024 },
  { name: "desktop", label: "Desktop", width: 1440, height: 900 },
];

/**
 * Where a document is inside a market, per collection or global. T65 gives `pages` its full path
 * (parents' slugs) and its route; T66 adds `posts`, T61 the globals (a market's home).
 */
const PATHS: Record<string, (data: Record<string, unknown>) => string | null> = {
  pages: (data) => (typeof data["slug"] === "string" && data["slug"] ? `/${data["slug"]}` : null),
};

/**
 * The market an editor previews a language in (D74): the primary country if it speaks it, else
 * the first open country that does.
 */
export function previewMarket(map: MarketMap, language: string): Market | undefined {
  const speaking = listMarkets(map).filter((market) => market.language === language);
  const primary = primaryCountryCode(map);
  return speaking.find((market) => market.country === primary) ?? speaking[0];
}

/**
 * The live-preview frame's URL: `/next/preview` with the secret and the page's public path, on the
 * market's own domain when it has one (its Draft Mode cookie belongs to that host), else on the
 * site's. `null` (no live preview) without a market for the language or without a secret.
 */
export function previewUrl(args: {
  map: MarketMap;
  language: string;
  path: string;
  serverURL: string;
  secret: string | undefined;
}): string | null {
  const { map, language, path, serverURL, secret } = args;
  const market = previewMarket(map, language);
  if (market === undefined || !secret) return null;
  const target = new URL(buildPublicUrl(market, path, map), serverURL);
  const url = new URL("/next/preview", target.origin);
  url.searchParams.set("path", target.pathname + target.search);
  url.searchParams.set("secret", secret);
  return url.toString();
}

const MAP_TTL_MS = 30_000;
let memo: { map: MarketMap; until: number } | undefined;

/** The market map for the url function, read at most every 30 s: Payload calls it on every autosave. */
async function marketMap(req: PayloadRequest): Promise<MarketMap> {
  if (memo !== undefined && memo.until > Date.now()) return memo.map;
  const doc = (await req.payload.findGlobal({ slug: "markets", depth: 0, req })) as MarketsGlobal;
  memo = { map: mapFromGlobal(doc), until: Date.now() + MAP_TTL_MS };
  return memo.map;
}

/** `admin.livePreview.url`: the edited language's market, the document's path (D74). */
export const livePreviewUrl: NonNullable<LivePreviewConfig["url"]> = async ({
  collectionConfig,
  data,
  globalConfig,
  locale,
  req,
}) => {
  const slug = collectionConfig?.slug ?? globalConfig?.slug;
  const path = slug === undefined ? null : (PATHS[slug]?.(data) ?? null);
  if (path === null) return null;
  return previewUrl({
    map: await marketMap(req),
    language: locale.code,
    path,
    serverURL: req.payload.config.serverURL || "http://localhost:8000",
    secret: env.PREVIEW_SECRET,
  });
};
