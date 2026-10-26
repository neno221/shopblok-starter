import "server-only";
import { z } from "zod";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { setChosenMarket } from "../medusa/cookies";
import { action, ActionError } from "./action";

/**
 * Records the visitor's explicit choice of market (D66, SPEC §8.5): MarketSwitcher's click and the
 * suggestion banner's "stay". Only a key of an open market is kept; from then on `/` redirects to
 * it (`proxy.ts`) and the banner is not shown again.
 */
export const rememberMarketAction = action(
  z.object({ market: z.string().min(1).max(64) }),
  async ({ market }): Promise<{ market: string }> => {
    if (findMarket(await getRenderMarketMap(), market) === undefined)
      throw new ActionError("not-found", `no open market ${market}`);
    await setChosenMarket(market);
    return { market };
  },
);
