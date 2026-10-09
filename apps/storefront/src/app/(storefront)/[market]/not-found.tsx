import { catalogs } from "@shopblok/i18n";
import Link from "next/link";
import { getCurrentMarket } from "../../../lib/current-market";

// Shown inside the market's layout when a page calls `notFound()` (a product that doesn't
// exist, later). A URL that matches no route, or an unknown market, gets `global-not-found`.
export default async function MarketNotFound() {
  const market = await getCurrentMarket();
  const { notFound } = catalogs[market.locale];
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{notFound.title}</h1>
      <p className="mt-2">{notFound.body}</p>
      {/* The internal key is the only URL until T11's proxy; T11 builds public URLs instead. */}
      <Link className="mt-4 inline-block underline" href={`/${market.key}`}>
        {notFound.home}
      </Link>
    </main>
  );
}
