import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { planSettingsSave, type SettingsPlan } from "../../lib/checks";
import { MarketsRefused } from "../../lib/refusal";
import { loadState } from "../../lib/state";
import type { SettingsSaveInput } from "../../lib/types";

/** Validates the shop-wide settings (D91) the way `planCountrySaveStep` does a country. */
export const planSettingsSaveStep = createStep(
  "plan-settings-save",
  async (input: SettingsSaveInput, { container }) => {
    const state = await loadState(container);
    const plan = planSettingsSave(state, input);
    if (plan.problems.length > 0) throw new MarketsRefused(plan.problems);
    return new StepResponse<SettingsPlan>(plan);
  },
);
