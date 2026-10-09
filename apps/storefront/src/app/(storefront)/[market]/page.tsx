import { catalogs, formatMoney } from "@shopblok/i18n";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentMarket } from "../../../lib/current-market";
import type { CurrentMarket } from "../../../lib/market-locale";
import { countPublishedPages } from "../../../lib/cms/site";
import { listProducts } from "../../../lib/medusa/products";
import { getRegionForCountry, getSearchPriceCurrencies } from "../../../lib/medusa/regions";

const PRODUCT_COUNT = 4;

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
      <Suspense fallback={<p className="mt-4">…</p>}>
        <MarketData market={market} />
      </Suspense>
    </main>
  );
}

async function MarketData({ market }: { market: CurrentMarket }) {
  await connection();
  const { wiring } = catalogs[market.locale];
  const [region, pages, priceCurrencies] = await Promise.all([
    getRegionForCountry(market.country),
    countPublishedPages(),
    getSearchPriceCurrencies(),
  ]);
  const products =
    region === undefined
      ? []
      : await listProducts({
          regionId: region.id,
          locale: market.medusaLocale,
          limit: PRODUCT_COUNT,
        });
  return (
    <>
      <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt>{wiring.region}</dt>
        <dd data-testid="region">{region?.name ?? "–"}</dd>
        <dt>{wiring.currency}</dt>
        <dd data-testid="currency">{region?.currencyCode.toUpperCase() ?? "–"}</dd>
        <dt>{wiring.priceCurrencies}</dt>
        <dd data-testid="price-currencies">
          {priceCurrencies.map((currency) => currency.toUpperCase()).join(", ")}
        </dd>
        <dt>{wiring.pages}</dt>
        <dd data-testid="pages">{pages}</dd>
      </dl>
      <h2 className="mt-6 text-xl font-semibold">{wiring.products}</h2>
      {region === undefined ? (
        <p data-testid="no-region">{wiring.noRegion}</p>
      ) : products.length === 0 ? (
        <p data-testid="no-products">{wiring.noProducts}</p>
      ) : (
        <ul className="mt-2 list-disc pl-6" data-testid="products">
          {products.map((product) => (
            <li key={product.id} data-testid="product">
              {product.title}
              {product.price === null
                ? null
                : ` — ${formatMoney(product.price.amount, product.price.currencyCode, market.htmlLang)}`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
