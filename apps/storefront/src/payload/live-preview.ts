import type { LivePreviewConfig, Payload } from "payload";
import { MAX_PAGE_DEPTH, pageIdOf, pagePath } from "../lib/cms/page-path";
import { CMS_PATHS } from "../lib/cms/paths";
import { env } from "../lib/env";
import { listMarkets, primaryCountryCode } from "../lib/markets/market";
import type { Market, MarketMap } from "../lib/markets/types";
import { buildPublicUrl } from "../lib/markets/url";
import { siteOrigin } from "../lib/site-origin";
import { marketMapOrUndefined } from "./market-map";

/** D74's three frames: a phone, a tablet and a laptop. */
export const LIVE_PREVIEW_BREAKPOINTS = [
  { name: "mobile", label: "Mobile", width: 375, height: 667 },
  { name: "tablet", label: "Tablet", width: 768, height: 1024 },
  { name: "desktop", label: "Desktop", width: 1440, height: 900 },
];

/**
 * The market an editor previews a language in (D74): the primary country if it speaks it, else
 * the first open country that does, among the countries served on the site's own host.
 *
 * **Known limit: a country with its own domain is never previewed.** `/next/preview` needs the
 * editor's Payload session, and that cookie belongs to the admin's host: on the country's domain
 * the request carries none (and the frame is cross-site to the admin, so Payload's CSRF rule
 * would refuse it anyway), so the preview could only answer 401. A language that only such
 * countries speak has no live preview (`null`; Payload says so). Own domains reach production
 * with M7, which decides how to preview them (SETUP.md, "CMS foundations (T59)").
 */
export function previewMarket(map: MarketMap, language: string): Market | undefined {
  const speaking = listMarkets(map).filter(
    (market) => market.language === language && market.domain === undefined,
  );
  const primary = primaryCountryCode(map);
  return speaking.find((market) => market.country === primary) ?? speaking[0];
}

/**
 * The live-preview frame's URL: `/next/preview` on the site's origin, with the secret and the
 * page's public path in the market. `null` (no live preview) without a market for the language
 * (`previewMarket`) or without a secret.
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
  const url = new URL("/next/preview", serverURL);
  url.searchParams.set("path", target.pathname + target.search);
  url.searchParams.set("secret", secret);
  return url.toString();
}

/** The page a content global is previewed on (T61): the market's home, which shows all three. */
const GLOBAL_PREVIEW_PATH = "/";

/**
 * A page's address in the language being edited (D80): its parents' slugs and its own, each as
 * that language reads it, from the parents' latest versions, as the preview's Draft Mode reads
 * them. `null` while the page has no slug yet.
 */
export async function pagePreviewPath(
  payload: Pick<Payload, "findByID">,
  data: Record<string, unknown>,
  locale: string,
): Promise<string | null> {
  const slugs: unknown[] = [data["slug"]];
  const seen = new Set<unknown>([data["id"]]);
  let id = pageIdOf(data["parent"]);
  while (id !== null) {
    // The page and its parents, at most `MAX_PAGE_DEPTH` in all, as `pagePaths` counts them.
    if (seen.has(id) || seen.size >= MAX_PAGE_DEPTH) return null;
    seen.add(id);
    const doc = (await payload.findByID({
      collection: "pages",
      id,
      locale: locale as never,
      draft: true,
      depth: 0,
      select: { slug: true, parent: true },
      disableErrors: true,
      overrideAccess: true,
    })) as { slug?: unknown; parent?: unknown } | null;
    if (doc === null) return null;
    slugs.unshift(doc.slug);
    id = pageIdOf(doc.parent);
  }
  return pagePath(slugs);
}

/** `admin.livePreview.url`: the edited language's market, the document's path (D74). */
export const livePreviewUrl: NonNullable<LivePreviewConfig["url"]> = async ({
  collectionConfig,
  data,
  globalConfig,
  locale,
  req,
}) => {
  const slug = collectionConfig?.slug;
  const path =
    globalConfig !== undefined
      ? GLOBAL_PREVIEW_PATH
      : slug === "pages"
        ? await pagePreviewPath(req.payload, data, locale.code)
        : slug === undefined
          ? null
          : (CMS_PATHS[slug]?.(data) ?? null);
  if (path === null) return null;
  // Medusa unreadable and no map held yet: no preview rather than an error in the admin.
  const map = await marketMapOrUndefined(req, "the live preview is off for now");
  if (map === undefined) return null;
  return previewUrl({
    map,
    language: locale.code,
    path,
    serverURL: siteOrigin(),
    secret: env.PREVIEW_SECRET,
  });
};
