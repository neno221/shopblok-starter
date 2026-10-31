import type { PayloadRequest } from "payload";
import { describeError } from "../lib/markets/source";
import type { MarketMap } from "../lib/markets/types";

/**
 * The shop's own market map (`lib/markets/get-market-map.ts`: Medusa's `GET /store/markets`, kept
 * for 30 s, with its last good map and its development fallback; a save in Medusa marks it stale
 * through `/api/revalidate`, and the source is one per process, `lib/markets/shared-source.ts`),
 * so Payload's admin, the live preview, `/next/preview` and `safeRedirect` agree on the markets
 * (D95).
 *
 * Imported when the function first runs, which is only ever inside Next (the admin and its
 * requests): `get-market-map.ts` imports `server-only` and the Medusa SDK, and a static import from
 * `payload.config.ts` would load them with the config in `payload generate:types`, `payload
 * migrate` and `payload run`, where `server-only` throws. `config-outside-next.test.ts` loads the
 * config without Next and keeps it so.
 *
 * It throws when Medusa cannot be read and nothing was read before (a server that restarted while
 * Medusa is down); a caller that must not takes the map through `marketMapOrUndefined`, or catches
 * it (`filterAvailableLocales`).
 */
export async function marketMap(): Promise<MarketMap> {
  const { getMarketMap } = await import("../lib/markets/get-market-map");
  return getMarketMap();
}

/**
 * The map, or `undefined` when it cannot be read (the log says so, with `consequence`): for the
 * save checks and the SEO suggestions, which an unreadable Medusa must answer in words, not with a
 * server error (T75 review, items 2 and 3).
 */
export async function marketMapOrUndefined(
  req: PayloadRequest,
  consequence: string,
): Promise<MarketMap | undefined> {
  try {
    return await marketMap();
  } catch (error) {
    req.payload.logger.warn(
      `markets: the market map could not be read (${describeError(error)}); ${consequence}`,
    );
    return undefined;
  }
}
