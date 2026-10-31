import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { marketsService } from "../../lib/state";
import { restore, snapshot, write } from "../../lib/store";
import type { CountryRow, LanguageRow, SettingsRow, Snapshot } from "../../lib/types";

export type MarketsWrite = {
  countries?: CountryRow[];
  languages?: LanguageRow[];
  settings?: SettingsRow;
};

/**
 * Writes the planned rows. Its compensation puts the previous rows back, and deletes the ones the
 * write created, so a later step that fails (the event, a hook) leaves the markets as they were.
 */
export const writeMarketsStep = createStep(
  "write-markets",
  async (rows: MarketsWrite, { container }) => {
    const service = marketsService(container);
    const before = await snapshot(service, {
      countries: (rows.countries ?? []).map((row) => row.code),
      languages: (rows.languages ?? []).map((row) => row.code),
      settings: rows.settings !== undefined,
    });
    await write(service, rows);
    return new StepResponse(rows, before);
  },
  async (before: Snapshot | undefined, { container }) => {
    if (!before) return;
    await restore(marketsService(container), before);
  },
);
