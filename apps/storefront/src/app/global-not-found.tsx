import { catalogs } from "@shopblok/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { getRenderMarketMap } from "../lib/markets/cached-market-map";
import { primaryMarket } from "../lib/markets/market";
import { buildPublicUrl } from "../lib/markets/url";
import "../styles/globals.css";

export const metadata: Metadata = { title: catalogs.en.notFound.title };

// Renders for every URL no route handles. It bypasses the layouts, so it brings its own `<html>`
// and styles, and has no market to read: the default language, and a link to the primary market.
export default async function GlobalNotFound() {
  const { notFound } = catalogs.en;
  // A missing page stays a 404 when the map can't be read (an empty global, a database that is
  // down): the page is then shown without its link. The failure is logged where it happens.
  const map = await getRenderMarketMap().catch(() => undefined);
  const primary = map === undefined ? undefined : primaryMarket(map);
  const home =
    map === undefined || primary === undefined ? undefined : buildPublicUrl(primary, "/", map);
  return (
    <html lang="en">
      <body>
        <main className="p-8">
          <h1 className="text-2xl font-semibold">{notFound.title}</h1>
          <p className="mt-2">{notFound.body}</p>
          {/* A usable map always has a primary market; without one there is nowhere to link. */}
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
