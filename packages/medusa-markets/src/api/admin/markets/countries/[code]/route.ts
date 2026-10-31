import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { readOverview } from "../../../../../lib/overview";
import { saveMarketCountryWorkflow } from "../../../../../workflows";
import { answerRefusal } from "../../../../refusal";
import type { SaveMarketCountryBodyType } from "../../../../validators";

/**
 * `POST /admin/markets/countries/:code` (D92): one country's `enabled`, `languages`, `time_zone`
 * and `domain`. Refused with 400 and every reason when a check fails (D91); answers what
 * `GET /admin/markets` answers, after the save.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<SaveMarketCountryBodyType>,
  res: MedusaResponse,
) {
  try {
    await saveMarketCountryWorkflow(req.scope).run({
      input: { code: req.params.code, ...req.validatedBody },
      throwOnError: true,
    });
  } catch (error) {
    if (answerRefusal(error, res)) return;
    throw error;
  }
  res.json(await readOverview(req.scope));
}
