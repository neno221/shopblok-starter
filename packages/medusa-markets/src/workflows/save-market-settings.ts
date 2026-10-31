import { emitEventStep } from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";

import type { SettingsSaveInput } from "../lib/types";
import { MARKETS_UPDATED_EVENT } from "./save-market-country";
import { planSettingsSaveStep } from "./steps/plan-settings-save";
import { setDefaultRegionStep } from "./steps/set-default-region";
import { writeMarketsStep } from "./steps/write-markets";

/**
 * Saves the shop-wide market settings (D91): the primary country, the fallback market and the
 * language rows (the store locale each language uses, and its `<html lang>`). It also sets the
 * store's `default_region_id` to the primary country's region. Validated, written with
 * compensations, and announced like `saveMarketCountryWorkflow`.
 */
export const saveMarketSettingsWorkflow = createWorkflow(
  "save-market-settings",
  function (input: SettingsSaveInput) {
    const plan = planSettingsSaveStep(input);
    const rows = transform({ plan }, ({ plan }) => ({
      settings: plan.settings,
      languages: plan.languages,
    }));
    const written = writeMarketsStep(rows);
    const region = transform({ plan }, ({ plan }) => ({ regionId: plan.defaultRegionId }));
    setDefaultRegionStep(region);
    const event = transform({ written }, ({ written }) => ({
      scope: "settings",
      languages: (written.languages ?? []).map((row) => row.code),
    }));
    emitEventStep({ eventName: MARKETS_UPDATED_EVENT, data: event });
    return new WorkflowResponse(written);
  },
);
