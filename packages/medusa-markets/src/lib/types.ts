import type { MarketMap } from "@shopblok/fixtures/markets";

export type { MarketMap };

/** A country of one of Medusa's regions, with the region it is in. */
export type RegionCountry = {
  /** Lowercase ISO 3166-1 alpha-2, as Medusa stores it. */
  code: string;
  name: string;
  region_id: string;
  region_name: string;
  currency_code: string;
};

export type CountryRow = {
  code: string;
  enabled: boolean;
  /** ISO 639-1, the default first. */
  languages: string[];
  domain: string | null;
  time_zone: string | null;
  /** The place in the map; `null` after the ranked ones, by code. */
  rank: number | null;
};

export type LanguageRow = {
  code: string;
  medusa_locale: string;
  html_lang: string | null;
  rank: number | null;
};

export type SettingsRow = {
  primary_country: string | null;
  fallback_market: string | null;
};

/** Everything a check reads: Medusa's regions and store locales, and the module's own rows. */
export type MarketsState = {
  regionCountries: RegionCountry[];
  /** The store's `supported_locales`, as `locale_code`. */
  storeLocales: string[];
  /** The store's `default_region_id` (Store page), when it has one. */
  defaultRegionId: string | null;
  countries: CountryRow[];
  languages: LanguageRow[];
  settings: SettingsRow;
};

/** A reason a save is refused, or a warning about what is stored. */
export type Problem = {
  /** A stable name, for a test or a panel. */
  code: string;
  message: string;
  /** The field it belongs to (`languages`, `domain`, `primary_country`…), when there is one. */
  path?: string;
};

export type CountrySaveInput = {
  code: string;
  enabled?: boolean;
  languages?: string[];
  /** `null` clears it. */
  time_zone?: string | null;
  /** `null` clears it. */
  domain?: string | null;
};

export type SettingsSaveInput = {
  primary_country?: string;
  fallback_market?: string;
  languages?: { code: string; medusa_locale: string; html_lang?: string | null }[];
};

/** The module's rows as they were before a save, for the compensation (`null`: there was none). */
export type Snapshot = {
  countries: Record<string, CountryRow | null>;
  languages: Record<string, LanguageRow | null>;
  /** `null`: the save leaves the settings alone. `row: null`: there was no settings row. */
  settings: { row: SettingsRow | null } | null;
};
