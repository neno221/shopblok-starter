import type { Image } from "@shopblok/registry/contracts";
import { shareTitleQuery, shareTitleText } from "./share-title";

// M7 D147 (T110): the share picture a page falls back to (SPEC §12: "localized Payload image, then
// the product thumbnail, then a generated `opengraph-image.tsx`"). Each market has one, drawn by
// `app/(storefront)/[market]/share-image/route.tsx` with the shop's name and the page's title (or,
// for a page without one, the site's description) in the market's language; `withSeo` takes it
// after the site settings' own picture.

/** Open Graph's size (Facebook's and LinkedIn's 1.91:1), which the route draws at. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** The route's path inside a market (`app/(storefront)/[market]/share-image/route.tsx`). */
export const OG_IMAGE_PATH = "/share-image";

/**
 * The generated picture of a market for a page, as an `Image` the metadata can name: `url` is the
 * market's public URL builder (`buildPublicUrl`), so the address is the one a crawler can fetch
 * (`/us/share-image`, a domain market's own host), never the internal `/{key}/…`. A page's title
 * goes on it signed (`share-title.ts`); without one it is the market's card.
 */
export function shareImageFor(
  url: (path: string) => string,
  market: string,
  storeName: string,
  secret: string | undefined,
): (title?: string) => Image {
  return (title) => {
    const query = shareTitleQuery(market, title, secret);
    return {
      src: `${url(OG_IMAGE_PATH)}${query}`,
      // The picture shows the title only when it is signed; else it is the market's card.
      alt: query === "" || title === undefined ? storeName : shareTitleText(title),
      ...OG_IMAGE_SIZE,
    };
  };
}

/**
 * The shop's font for the picture: Inter Bold (D28's family) as TrueType, which the image renderer
 * (Satori) reads; `next/font` serves WOFF2, which it does not. Google Fonts' own file (v20), every
 * subset in one, so a Greek title is drawn in it (`og-font.test.ts` checks the glyphs), with its
 * licence beside it (`assets/fonts/OFL.txt`).
 */
export const OG_FONT_FILE = "assets/fonts/Inter-Bold.ttf";
