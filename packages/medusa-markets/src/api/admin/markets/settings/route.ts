import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { readOverview } from "../../../../lib/overview";
import { saveMarketSettingsWorkflow } from "../../../../workflows";
import { answerRefusal } from "../../../refusal";
import type { SaveMarketSettingsBodyType } from "../../../validators";

/**
 * `POST /admin/markets/settings` (D92): the primary country, the fallback market and each
 * language's `medusa_locale` and `html_lang`. Refused with 400 and every reason when a check
 * fails (D91); answers what `GET /admin/markets` answers, after the save.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<SaveMarketSettingsBodyType>,
  res: MedusaResponse,
) {
  try {
    await saveMarketSettingsWorkflow(req.scope).run({
      input: req.validatedBody,
      throwOnError: true,
    });
  } catch (error) {
    if (answerRefusal(error, res)) return;
    throw error;
  }
  res.json(await readOverview(req.scope));
}
