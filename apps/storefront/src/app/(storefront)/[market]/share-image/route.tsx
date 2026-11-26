import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { cmsOrNull } from "../../../../lib/cms/read";
import { settingsFrom } from "../../../../lib/cms/shell";
import { readSiteSettings } from "../../../../lib/cms/site";
import { env } from "../../../../lib/env";
import { getRenderMarketMap } from "../../../../lib/markets/cached-market-map";
import { findMarket } from "../../../../lib/markets/market";
import { OG_FONT_FILE, OG_IMAGE_SIZE } from "../../../../lib/seo/og-image";
import { verifiedShareTitle } from "../../../../lib/seo/share-title";

// M7 D147 (T110): the generated share picture, the last of SPEC §12's fallbacks (after the
// document's own picture, the product's and the site settings'): the page's title and the shop's
// name in the market's language and the shop's own font (Inter, Greek included), 1200 × 630. A page
// names it at its market's public address with its title signed (`shareImageFor`, through
// `withSeo`): `/us/share-image?title=…&sig=…`, `/share-image…` for the market at `/`, a domain
// market's on its own host. Without a title, or with one this shop did not sign, it draws the
// market's card: the shop's name and the site's description.
//
// A route handler, not Next's `opengraph-image.tsx` (D147's name for it): under the `(storefront)`
// group Next serves that file at `/{key}/opengraph-image-{hash}` and writes that address into the
// `og:image` of every page under `[market]` that names no picture (the cart, the account), and
// `/{key}/…` is the internal key the proxy answers 404 (SPEC §8.5). Measured on `next dev`: the
// account page carried `/en-us/opengraph-image-ocsoqu`. The file convention also hands its image
// the route's params only, never the page's title.
//
// It reads the request (the title), so it is drawn per request from cached reads (the map, the
// site settings), and the answer is cached by the browser and the CDN for a day: a page's
// address names its title, so a new title is a new address.

/** Read once per server: the file does not change while it runs (Next's "Predictable values"). */
const font = readFile(join(process.cwd(), OG_FONT_FILE));

/** A day in the browser and the CDN, a week more while a new one is drawn. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(request: NextRequest, { params }: RouteContext<"/[market]/share-image">) {
  const { market: key } = await params;
  const market = findMarket(await getRenderMarketMap(), key);
  if (market === undefined) return new Response("Not Found", { status: 404 });
  const settings = settingsFrom(
    await cmsOrNull(
      readSiteSettings({ market, draft: false }),
      "share picture: the shop's name from site.ts",
    ),
  );
  const title = verifiedShareTitle(
    market.key,
    request.nextUrl.searchParams,
    env.STOREFRONT_SIGNING_SECRET,
  );
  const [heading, line] =
    title === undefined
      ? [settings.storeName, settings.seo.description]
      : [title, settings.storeName];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 96px",
        background: "#fafafa",
        color: "#0a0a0a",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          fontSize: title === undefined ? 88 : 72,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          // Three lines at most: a title is cut at 120 characters (`SHARE_TITLE_MAX`).
          display: "block",
          lineClamp: 3,
        }}
      >
        {heading}
      </div>
      {line === undefined ? null : (
        <div
          style={{
            marginTop: 40,
            fontSize: 40,
            lineHeight: 1.3,
            color: "#525252",
            // The description is 150 to 160 characters (SPEC §12): three lines at most too.
            display: "block",
            lineClamp: 3,
          }}
        >
          {line}
        </div>
      )}
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [{ name: "Inter", data: await font, weight: 700, style: "normal" }],
      headers: { "Cache-Control": CACHE_CONTROL },
    },
  );
}
