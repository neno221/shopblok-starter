import { expect } from "@playwright/test";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./medusa-admin";
import { base } from "./server";

// M4b (T75): the market map is Medusa's, so a suite that opens or closes a market does it through
// the markets plugin's Admin API, as the bootstrap admin: `POST /admin/markets/countries/:code`
// (one country's `enabled`, `languages`, `time_zone`, `domain`) and `POST /admin/markets/settings`
// (the primary country, the fallback market, the languages' store locales). The plugin refuses what
// would leave the shop without a primary or fallback market, so these helpers change the settings
// before they close a country, and put everything back in the opposite order.

export type MarketCountry = {
  code: string;
  region: { id: string; name: string };
  enabled: boolean;
  languages: string[];
  domain: string | null;
  time_zone: string | null;
};

export type MarketLanguage = { code: string; medusa_locale: string; html_lang: string | null };

/** What `GET /admin/markets` answers, as far as the suites read it. */
export type MarketsOverview = {
  map: { countries: { code: string; enabled: boolean; languages: string[] }[] };
  countries: MarketCountry[];
  settings: { primary_country: string | null; fallback_market: string | null };
  languages: MarketLanguage[];
  locales: string[];
  problems: { code: string; message: string }[];
};

/** A country to leave open, with the languages it offers (the default first). */
export type OpenCountry = { code: string; languages: string[] };

export type MarketsAdmin = Awaited<ReturnType<typeof marketsAdmin>>;

/** Medusa's markets Admin API as the bootstrap admin. A refused login fails here. */
export async function marketsAdmin() {
  const medusa = medusaUrl();
  const token = await medusaAdminToken(medusa);
  const api = <T = Record<string, unknown>>(method: string, path: string, body?: unknown) =>
    medusaAdminApi<T>(medusa, token, method, path, body);

  const overview = () => api<MarketsOverview>("GET", "/admin/markets");

  const saveCountry = (
    code: string,
    body: {
      enabled?: boolean;
      languages?: string[];
      time_zone?: string | null;
      domain?: string | null;
    },
  ) => api<MarketsOverview>("POST", `/admin/markets/countries/${code}`, body);

  const saveSettings = (body: {
    primary_country?: string;
    fallback_market?: string;
    languages?: { code: string; medusa_locale: string; html_lang?: string | null }[];
  }) => api<MarketsOverview>("POST", "/admin/markets/settings", body);

  /** The store's locales (Store → Locales): the plugin only reads them. */
  const store = async () => {
    const { stores } = await api<{
      stores: { id: string; supported_locales: { locale_code: string }[] }[];
    }>("GET", "/admin/stores?fields=id,*supported_locales");
    return {
      id: stores[0]!.id,
      locales: stores[0]!.supported_locales.map((each) => each.locale_code),
    };
  };
  const setStoreLocales = (storeId: string, locales: string[]) =>
    api("POST", `/admin/stores/${storeId}`, {
      supported_locales: locales.map((locale_code) => ({ locale_code })),
    });

  /**
   * Leaves exactly these countries open, the first as the primary country and its first language
   * as the fallback market, and closes every other country. Opens first, then moves the settings,
   * then closes, since a save refuses to close the primary country or the fallback market's.
   */
  async function openOnly(open: OpenCountry[]): Promise<void> {
    const first = open[0];
    expect(
      first,
      "at least one country stays open: the primary country cannot be closed",
    ).toBeDefined();
    const before = await overview();
    for (const country of open) {
      await saveCountry(country.code, { enabled: true, languages: country.languages });
    }
    await saveSettings({
      primary_country: first!.code,
      fallback_market: `${first!.languages[0]}-${first!.code}`,
    });
    const keep = new Set(open.map((country) => country.code));
    for (const country of before.countries) {
      if (!keep.has(country.code) && country.enabled) {
        await saveCountry(country.code, { enabled: false });
      }
    }
  }

  /**
   * Puts the markets back as `before` (an overview read before the suite changed them): the open
   * countries first (a closed primary country cannot be named), then the settings and the language
   * rows, then the closed countries. A country row is never deleted, so a country the suite added
   * to a region is closed and emptied.
   */
  async function restore(before: MarketsOverview): Promise<void> {
    const original = (country: MarketCountry) => ({
      enabled: country.enabled,
      languages: country.languages,
      time_zone: country.time_zone,
      domain: country.domain,
    });
    for (const country of before.countries.filter((each) => each.enabled)) {
      await saveCountry(country.code, original(country));
    }
    // A language row is never deleted either, and a suite that added a store locale for a new
    // language leaves its row behind (unused rows are not in the map); the plugin refuses a row
    // whose locale the store does not have, so only the rows the store can still serve are sent.
    const { locales } = await store();
    await saveSettings({
      primary_country: before.settings.primary_country ?? undefined,
      fallback_market: before.settings.fallback_market ?? undefined,
      languages: before.languages
        .filter((language) => locales.includes(language.medusa_locale))
        .map(({ code, medusa_locale, html_lang }) => ({ code, medusa_locale, html_lang })),
    });
    for (const country of before.countries.filter((each) => !each.enabled)) {
      await saveCountry(country.code, original(country));
    }
  }

  return {
    medusa,
    api,
    overview,
    saveCountry,
    saveSettings,
    store,
    setStoreLocales,
    openOnly,
    restore,
  };
}

/** The proxy's map as the storefront serves it (`/next/markets`: the open countries only). */
export async function servedMap(): Promise<{ countries: { code: string; languages: string[] }[] }> {
  const response = await fetch(`${base()}/next/markets`);
  expect(response.status, "/next/markets").toBe(200);
  return (await response.json()) as { countries: { code: string; languages: string[] }[] };
}

/**
 * Waits until `/next/markets` lists exactly these open countries. A save in Medusa expires the
 * map's cache entry (`shopblok.markets.updated`, the backend's revalidation subscriber), and the
 * entry is at most 30 s old without that, so this is a few seconds, never a minute.
 */
export async function waitForServedCountries(codes: string[], timeout = 70_000): Promise<void> {
  await expect
    .poll(async () => (await servedMap()).countries.map((country) => country.code).sort(), {
      message: "/next/markets lists the open countries",
      timeout,
      intervals: [1_000],
    })
    .toEqual([...codes].sort());
}
