import type { MarketMap } from "../lib/markets/types";

/**
 * The shop's own market map (`lib/markets/get-market-map.ts`: Medusa's `GET /store/markets`, kept
 * for 30 s, with its last good map and its development fallback), so Payload's admin, the live
 * preview, `/next/preview` and `safeRedirect` agree on the markets (D95).
 *
 * Imported when the function first runs, which is only ever inside Next (the admin and its
 * requests): `get-market-map.ts` imports `server-only` and the Medusa SDK, and a static import from
 * `payload.config.ts` would load them with the config in `payload generate:types`, `payload
 * migrate` and `payload run`, where `server-only` throws. `config-outside-next.test.ts` loads the
 * config without Next and keeps it so.
 *
 * It throws when Medusa cannot be read and nothing was read before; a caller that must not
 * (`filterAvailableLocales`) catches it.
 */
export async function marketMap(): Promise<MarketMap> {
  const { getMarketMap } = await import("../lib/markets/get-market-map");
  return getMarketMap();
}
