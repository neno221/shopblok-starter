// What `GET /admin/markets` answers (`MarketsOverview` in `src/lib/overview.ts`, which the
// plugin's type test compares with this one) and what the two `POST` routes take. The admin has
// its own copy: the server's types pull in modules the admin bundle must not.

export type Problem = {
  /** A stable name. */
  code: string;
  message: string;
  /** The field it belongs to, when there is one. */
  path?: string;
};

export type OverviewCountry = {
  /** Lowercase ISO 3166-1 alpha-2. */
  code: string;
  /** Medusa's display name for the country. */
  name: string;
  region: { id: string; name: string; currency_code: string };
  /** Whether the country has a row; a country just added to a region has none and is closed. */
  saved: boolean;
  enabled: boolean;
  /** ISO 639-1, the default first. */
  languages: string[];
  domain: string | null;
  time_zone: string | null;
};

export type OverviewLanguage = {
  code: string;
  medusa_locale: string;
  html_lang: string | null;
  rank: number | null;
};

export type MarketsOverview = {
  /** The storefront's map (`GET /store/markets`), which the panels do not read. */
  map: unknown;
  countries: OverviewCountry[];
  regions: {
    id: string;
    name: string;
    currency_code: string;
    countries: string[];
  }[];
  /** The store's locales (Store → Locales), as `locale_code`. */
  locales: string[];
  languages: OverviewLanguage[];
  settings: { primary_country: string | null; fallback_market: string | null };
  default_region_id: string | null;
  problems: Problem[];
};

export type CountryBody = {
  enabled?: boolean;
  languages?: string[];
  time_zone?: string | null;
  domain?: string | null;
};

export type SettingsBody = {
  primary_country?: string;
  fallback_market?: string;
  languages?: {
    code: string;
    medusa_locale: string;
    html_lang?: string | null;
  }[];
};
