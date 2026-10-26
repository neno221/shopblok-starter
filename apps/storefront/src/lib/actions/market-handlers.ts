import "server-only";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getMarketContext } from "../market-context";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { findMarket } from "../markets/market";
import { getCart, moveCart } from "../medusa/cart";
import { setChosenMarket } from "../medusa/cookies";
import { MedusaRequestError } from "../medusa/sdk";
import { action, ActionError } from "./action";

/**
 * The visitor's cart moved to the chosen market's region and language (D65, T54), so the page the
 * switcher goes to shows it in that country's prices. A move Medusa refuses (a line with no price
 * there) or cannot make is logged and leaves the cart where it was: the choice still counts, and
 * the next checkout step moves the cart or says what is wrong.
 */
async function moveVisitorCart(market: string): Promise<void> {
  try {
    const context = await getMarketContext(market);
    if (context === null) return;
    const locale = context.market.medusaLocale;
    const cart = await getCart(locale);
    if (cart === null) return;
    const moved = await moveCart(cart, { regionId: context.region.id, locale });
    if (moved !== cart) updateTag("cart");
  } catch (error) {
    if (!(error instanceof MedusaRequestError)) throw error;
    console.error(`[market] the cart was not moved to ${market}: ${error.message}`);
  }
}

/**
 * Records the visitor's explicit choice of market (D66, SPEC §8.5): MarketSwitcher's click and the
 * suggestion banner's "stay". Only a key of an open market is kept; from then on `/` redirects to
 * it (`proxy.ts`) and the banner is not shown again. The cart goes with the visitor.
 */
export const rememberMarketAction = action(
  z.object({ market: z.string().min(1).max(64) }),
  async ({ market }): Promise<{ market: string }> => {
    if (findMarket(await getRenderMarketMap(), market) === undefined)
      throw new ActionError("not-found", `no open market ${market}`);
    await setChosenMarket(market);
    await moveVisitorCart(market);
    return { market };
  },
);
