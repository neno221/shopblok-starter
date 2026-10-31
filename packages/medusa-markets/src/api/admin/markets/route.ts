import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { readOverview } from "../../../lib/overview";

/**
 * `GET /admin/markets` (D92): the market map, every country that is in a region (with its region
 * and its row's settings, or the defaults of a country just added to a region), the regions, the
 * store's locales, the language rows, the shop-wide settings and the warnings about what is
 * stored. One read for both panels.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await readOverview(req.scope));
}
