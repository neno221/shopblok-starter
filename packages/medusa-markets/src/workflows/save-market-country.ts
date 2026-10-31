import { emitEventStep } from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";

import type { CountrySaveInput } from "../lib/types";
import { planCountrySaveStep } from "./steps/plan-country-save";
import { writeMarketsStep } from "./steps/write-markets";

/** Emitted after every save; the backend's revalidation subscriber listens (D94, T75). */
export const MARKETS_UPDATED_EVENT = "shopblok.markets.updated";

/**
 * Saves one country's market settings (D91): whether it is open, its languages (the default
 * first), time zone and domain. It validates against the live regions and store locales, fills
 * the `market_language` row of a language the first time it is used, writes in a step whose
 * compensation restores the previous rows, and emits `shopblok.markets.updated`.
 */
export const saveMarketCountryWorkflow = createWorkflow(
  "save-market-country",
  function (input: CountrySaveInput) {
    const plan = planCountrySaveStep(input);
    const rows = transform({ plan }, ({ plan }) => ({
      countries: [plan.country],
      languages: plan.newLanguages,
    }));
    const written = writeMarketsStep(rows);
    const event = transform({ written }, ({ written }) => ({
      scope: "country",
      codes: (written.countries ?? []).map((row) => row.code),
    }));
    emitEventStep({ eventName: MARKETS_UPDATED_EVENT, data: event });
    return new WorkflowResponse(written);
  },
);
