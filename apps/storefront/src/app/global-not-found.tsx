import { catalogs } from "@shopblok/i18n";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { inter } from "../lib/fonts";
import { getRenderMarketMap } from "../lib/markets/cached-market-map";
import { primaryMarket } from "../lib/markets/market";
import { buildPublicUrl } from "../lib/markets/url";
import "../styles/globals.css";

export const metadata: Metadata = { title: catalogs.en.templates.notFound.title };

/**
 * The primary market's front page, or nothing when the map can't be read (an empty global, a
 * database that is down): a missing page must stay a 404, not turn into a 500.
 */
async function homeHref(): Promise<Route | undefined> {
  try {
    const map = await getRenderMarketMap();
    const primary = primaryMarket(map);
    return primary === undefined ? undefined : buildPublicUrl(primary, "/", map);
  } catch (error) {
    console.error("markets: the 404 page has no home link, the map could not be read:", error);
    return undefined;
  }
}

// Renders for every URL no route handles. It bypasses the layouts, so it brings its own `<html>`
// and styles, and has no market to read: the default language, and a link to the primary market.
export default async function GlobalNotFound() {
  const { notFound } = catalogs.en.templates;
  const home = await homeHref();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <main className="p-8">
          <h1 className="text-2xl font-semibold">{notFound.title}</h1>
          <p className="mt-2">{notFound.body}</p>
          {home !== undefined && (
            <Link className="mt-4 inline-block underline" href={home}>
              {notFound.home}
            </Link>
          )}
        </main>
      </body>
    </html>
  );
}
