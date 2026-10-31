import { medusaRequest } from "../medusa/sdk";
import { toMarketMap } from "./problems";
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
  return toMarketMap(
    body.markets,
    (what) => new Error(`Medusa's GET /store/markets ${what}; is the markets plugin installed?`),
  );
}
