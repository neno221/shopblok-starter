import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { readMap } from "../../../lib/overview";

/**
 * `GET /store/markets` (D92): the market map, in the shape of `@shopblok/fixtures`' `MarketMap`.
 * Closed countries are in it (the storefront's 404 for them needs to know them). Medusa asks every
 * `/store` route for the publishable key.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ markets: await readMap(req.scope) });
}
