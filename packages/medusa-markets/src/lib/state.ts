import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { MARKETS_MODULE } from "../modules/markets";
import type MarketsModuleService from "../modules/markets/service";
import type { MarketsState, RegionCountry } from "./types";

type Resolver = Pick<MedusaContainer, "resolve">;

export function marketsService(container: Resolver): MarketsModuleService {
  return container.resolve(MARKETS_MODULE);
}

export type RegionInfo = {
  id: string;
  name: string;
  currency_code: string;
  countries: { code: string; name: string }[];
};

/**
 * Medusa's regions with their countries, ordered by name. A country is in at most one region
 * (Medusa's own rule), so the region and its currency come from the country and are never stored
 * in the module.
 */
export async function readRegions(container: Resolver): Promise<RegionInfo[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "countries.display_name"],
  });
  return data
    .map((region) => ({
      id: region.id as string,
      name: (region.name as string | null) ?? "",
      currency_code: region.currency_code as string,
      countries: ((region.countries ?? []) as ({ iso_2?: string; display_name?: string } | null)[])
        .flatMap((country) =>
          country?.iso_2
            ? [{ code: country.iso_2.toLowerCase(), name: country.display_name ?? country.iso_2 }]
            : [],
        )
        .sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export type StoreInfo = {
  id: string | null;
  /** The store's locales (Store → Locales), as `locale_code`. */
  locales: string[];
  defaultRegionId: string | null;
};

/** The store's locales and default region: both are Medusa's own fields on the Store page. */
export async function readStore(container: Resolver): Promise<StoreInfo> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "store",
    fields: ["id", "default_region_id", "supported_locales.locale_code"],
    pagination: { take: 1 },
  });
  const locales = (data[0]?.supported_locales ?? []) as ({ locale_code?: string } | null)[];
  return {
    id: (data[0]?.id as string | undefined) ?? null,
    locales: locales.flatMap((locale) => (locale?.locale_code ? [locale.locale_code] : [])),
    defaultRegionId: (data[0]?.default_region_id as string | null | undefined) ?? null,
  };
}

export function regionCountries(regions: RegionInfo[]): RegionCountry[] {
  return regions.flatMap((region) =>
    region.countries.map((country) => ({
      code: country.code,
      name: country.name,
      region_id: region.id,
      region_name: region.name,
      currency_code: region.currency_code,
    })),
  );
}

/** Everything a check reads: Medusa's regions and store locales, and the module's own rows. */
export async function loadState(container: Resolver): Promise<MarketsState> {
  const service = marketsService(container);
  const [regions, store, countries, languages, settings] = await Promise.all([
    readRegions(container),
    readStore(container),
    service.readCountries(),
    service.readLanguages(),
    service.readSettings(),
  ]);
  return {
    regionCountries: regionCountries(regions),
    storeLocales: store.locales,
    defaultRegionId: store.defaultRegionId,
    countries,
    languages,
    settings,
  };
}
