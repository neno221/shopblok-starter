import { medusaRequest } from "../medusa/sdk";
import type { MarketMap } from "./types";

/**
 * Reads the market map from Medusa's `GET /store/markets` (D94): the `@shopblok/medusa-markets`
 * plugin's route, which answers `{ markets: MarketMap }` for the publishable key the SDK sends.
 * No locale header: the map is the same in every language. Closed countries are in the answer
 * (the storefront's 404 for them needs to know them); `/next/markets` leaves them out for the
 * proxy.
 *
 * Only `get-market-map.ts` imports this, so the proxy never loads the Medusa SDK.
 */
export async function loadMarketMap(): Promise<MarketMap> {
  const body = await medusaRequest((sdk) =>
    sdk.client.fetch<{ markets?: Partial<MarketMap> | null }>("/store/markets"),
  );
  const markets = body.markets;
  // The one place the shape is untrusted: another app on the address answers 200 with its own JSON.
  if (!Array.isArray(markets?.countries) || !Array.isArray(markets.languages)) {
    throw new Error(
      "Medusa's GET /store/markets did not answer a market map; is the markets plugin installed?",
    );
  }
  return {
    countries: markets.countries,
    languages: markets.languages,
    primaryCountry: markets.primaryCountry ?? "",
    fallbackMarket: markets.fallbackMarket ?? "",
  };
}
