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

async function upsertCountry(service: MarketsModuleService, row: CountryRow) {
  const [existing] = await service.listMarketCountries({ code: row.code }, { take: 1 });
  if (existing) await service.updateMarketCountries({ id: existing.id, ...row });
  else await service.createMarketCountries(row);
}

async function upsertLanguage(service: MarketsModuleService, row: LanguageRow) {
  const [existing] = await service.listMarketLanguages({ code: row.code }, { take: 1 });
  if (existing) await service.updateMarketLanguages({ id: existing.id, ...row });
  else await service.createMarketLanguages(row);
}

async function upsertSettings(service: MarketsModuleService, row: SettingsRow) {
  const [existing] = await service.listMarketSettings(
    {},
    { take: 1, order: { created_at: "ASC" } },
  );
  if (existing) await service.updateMarketSettings({ id: existing.id, ...row });
  else await service.createMarketSettings(row);
}

export async function write(
  service: MarketsModuleService,
  rows: { countries?: CountryRow[]; languages?: LanguageRow[]; settings?: SettingsRow },
) {
  // The languages first, so a country never names a language that has no row yet.
  for (const row of rows.languages ?? []) await upsertLanguage(service, row);
  // One after the other, not in a batch: the map's order is the order the rows were created in.
  for (const row of rows.countries ?? []) await upsertCountry(service, row);
  if (rows.settings) await upsertSettings(service, rows.settings);
}

export async function restore(service: MarketsModuleService, before: Snapshot) {
  for (const [code, row] of Object.entries(before.countries)) {
    if (row) await upsertCountry(service, row);
    else await service.deleteMarketCountries({ code });
  }
  for (const [code, row] of Object.entries(before.languages)) {
    if (row) await upsertLanguage(service, row);
    else await service.deleteMarketLanguages({ code });
  }
  if (before.settings?.row) await upsertSettings(service, before.settings.row);
  else if (before.settings) {
    const rows = await service.listMarketSettings({});
    if (rows.length > 0) await service.deleteMarketSettings(rows.map((row) => row.id));
  }
}
