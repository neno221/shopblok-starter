import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentMarket } from "../../../lib/current-market";
import { getRenderMarketMap } from "../../../lib/markets/cached-market-map";
import { buildPublicUrl } from "../../../lib/markets/url";

// Shown inside the market's layout when a page calls `notFound()` (a product that doesn't
// exist, later). A URL that matches no route gets `global-not-found`.
export default async function MarketNotFound() {
  const market = await getCurrentMarket();
  const t = await getTranslations("notFound");
  const home = buildPublicUrl(market, "/", await getRenderMarketMap());
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2">{t("body")}</p>
      <Link className="mt-4 inline-block underline" href={home}>
        {t("home")}
      </Link>
    </main>
  );
}
