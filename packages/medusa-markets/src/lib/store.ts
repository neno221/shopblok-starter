import type MarketsModuleService from "../modules/markets/service";
import type { CountryRow, LanguageRow, SettingsRow, Snapshot } from "./types";

/**
 * Writes to the module's rows, and the undo of a write. `snapshot` takes the rows a save is about
 * to touch, `write` writes the new ones, and `restore` puts the snapshot back: a row the save
 * created is deleted again, one it changed gets its old values back.
 */

export async function snapshot(
  service: MarketsModuleService,
  touched: { countries: string[]; languages: string[]; settings: boolean },
): Promise<Snapshot> {
  const [countries, languages, settings] = await Promise.all([
    service.readCountries(),
    service.readLanguages(),
    service.listMarketSettings({}, { take: 1 }),
  ]);
  return {
    countries: Object.fromEntries(
      touched.countries.map((code) => [code, countries.find((row) => row.code === code) ?? null]),
    ),
    languages: Object.fromEntries(
      touched.languages.map((code) => [code, languages.find((row) => row.code === code) ?? null]),
    ),
    settings: touched.settings
      ? {
          row: settings[0]
            ? {
                primary_country: settings[0].primary_country ?? null,
                fallback_market: settings[0].fallback_market ?? null,
              }
            : null,
        }
      : null,
  };
}

/**
 * The rows of one save, written in one transaction by the service (`saveMarkets`): a failure
 * halfway leaves none of them, which a plain throw in the step could not undo, because a step
 * that throws never returns the snapshot its compensation needs.
 */
export async function write(
  service: MarketsModuleService,
  rows: { countries?: CountryRow[]; languages?: LanguageRow[]; settings?: SettingsRow },
) {
  await service.saveMarkets(rows);
}

export async function restore(service: MarketsModuleService, before: Snapshot) {
  for (const [code, row] of Object.entries(before.countries)) {
    if (row) await service.saveMarkets({ countries: [row] });
    else await service.deleteMarketCountries({ code });
  }
  for (const [code, row] of Object.entries(before.languages)) {
    if (row) await service.saveMarkets({ languages: [row] });
    else await service.deleteMarketLanguages({ code });
  }
  if (before.settings?.row) await service.saveMarkets({ settings: before.settings.row });
  else if (before.settings) {
    const rows = await service.listMarketSettings({});
    if (rows.length > 0) await service.deleteMarketSettings(rows.map((row) => row.id));
  }
}
