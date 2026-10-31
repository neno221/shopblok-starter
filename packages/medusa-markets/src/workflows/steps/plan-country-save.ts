import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { planCountrySave, type CountryPlan } from "../../lib/checks";
import { MarketsRefused } from "../../lib/refusal";
import { loadState } from "../../lib/state";
import type { CountrySaveInput } from "../../lib/types";

/**
 * Validates one country's save against the live regions and store locales and the stored rows
 * (D91), and refuses it with every reason. Nothing is written here: the write is the next step,
 * which has the compensation.
 */
export const planCountrySaveStep = createStep(
  "plan-country-save",
  async (input: CountrySaveInput, { container }) => {
    const state = await loadState(container);
    const plan = planCountrySave(state, input);
    if (plan.problems.length > 0) throw new MarketsRefused(plan.problems);
    return new StepResponse<CountryPlan>(plan);
  },
);
