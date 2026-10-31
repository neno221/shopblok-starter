import type { MedusaContainer } from "@medusajs/framework/types";

import { marketsProblems } from "./checks";
import { buildMarketMap } from "./map";
import { loadStateWithRegions, marketsService, readRegions, type RegionInfo } from "./state";
import type { LanguageRow, MarketMap, MarketsState, Problem, SettingsRow } from "./types";

type Resolver = Pick<MedusaContainer, "resolve">;

export type MarketsOverview = {
  /** What `GET /store/markets` answers. */
  map: MarketMap;
  /** Every country that is in a region, with its region and its row's settings or defaults. */
  countries: {
    code: string;
    name: string;
    region: { id: string; name: string; currency_code: string };
    /** Whether the country has a row; a country just added to a region has none and is closed. */
    saved: boolean;
    enabled: boolean;
    languages: string[];
    domain: string | null;
    time_zone: string | null;
  }[];
  regions: { id: string; name: string; currency_code: string; countries: string[] }[];
  /** The store's locales (Store → Locales), as `locale_code`. */
  locales: string[];
  languages: LanguageRow[];
  settings: SettingsRow;
  /** The store's default region (Store page): a settings save sets it to the primary country's region. */
  default_region_id: string | null;
  problems: Problem[];
};

export function overviewOf(
  state: MarketsState,
  regions: RegionInfo[],
  map: MarketMap,
): MarketsOverview {
  return {
    map,
    countries: regions.flatMap((region) =>
      region.countries.map((country) => {
        const row = state.countries.find((candidate) => candidate.code === country.code);
        return {
          code: country.code,
          name: country.name,
          region: { id: region.id, name: region.name, currency_code: region.currency_code },
          saved: row !== undefined,
          enabled: row?.enabled ?? false,
          languages: row?.languages ?? [],
          domain: row?.domain ?? null,
          time_zone: row?.time_zone ?? null,
        };
      }),
    ),
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      currency_code: region.currency_code,
      countries: region.countries.map((country) => country.code),
    })),
    locales: state.storeLocales,
    languages: state.languages,
    settings: state.settings,
    default_region_id: state.defaultRegionId,
    problems: marketsProblems(state),
  };
}

/** The answer of `GET /admin/markets`, from Medusa's regions and the store's locales and the rows. */
export async function readOverview(container: Resolver): Promise<MarketsOverview> {
  const { state, regions } = await loadStateWithRegions(container);
  // The map is built from the rows already read, not from a second `service.getMap()`.
  const map = buildMarketMap({
    countries: state.countries,
    languages: state.languages,
    settings: state.settings,
    regionCountryCodes: state.regionCountries.map((country) => country.code),
  });
  return overviewOf(state, regions, map);
}

/** The answer of `GET /store/markets`. */
export async function readMap(container: Resolver): Promise<MarketMap> {
  const regions = await readRegions(container);
  return marketsService(container).getMap(
    regions.flatMap((region) => region.countries.map((country) => country.code)),
  );
}
