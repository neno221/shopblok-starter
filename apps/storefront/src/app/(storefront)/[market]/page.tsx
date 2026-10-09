import { catalogs } from "@shopblok/i18n";
import { getCurrentMarket } from "../../../lib/current-market";

export default async function MarketHome() {
  const market = await getCurrentMarket();
  const { wiring } = catalogs[market.locale];
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{wiring.title}</h1>
      <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt>{wiring.market}</dt>
        <dd data-testid="market">{market.key}</dd>
        <dt>{wiring.language}</dt>
        <dd data-testid="language">{market.htmlLang}</dd>
      </dl>
    </main>
  );
}
