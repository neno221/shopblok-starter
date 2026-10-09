import { catalogs } from "@shopblok/i18n";
import Link from "next/link";
import { getCurrentMarket } from "../../../lib/current-market";
import { getRenderMarketMap } from "../../../lib/markets/cached-market-map";
import { buildPublicUrl } from "../../../lib/markets/url";

// Shown inside the market's layout when a page calls `notFound()` (a product that doesn't
// exist, later). A URL that matches no route gets `global-not-found`.
export default async function MarketNotFound() {
  const market = await getCurrentMarket();
  const { notFound } = catalogs[market.locale];
  const home = buildPublicUrl(market, "/", await getRenderMarketMap());
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{notFound.title}</h1>
      <p className="mt-2">{notFound.body}</p>
      <Link className="mt-4 inline-block underline" href={home}>
        {notFound.home}
      </Link>
    </main>
  );
}
