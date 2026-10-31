import { MedusaService } from "@medusajs/framework/utils";

import { buildMarketMap } from "../../lib/map";
import type { CountryRow, LanguageRow, MarketMap, SettingsRow } from "../../lib/types";
import MarketCountry from "./models/market-country";
import MarketLanguage from "./models/market-language";
import MarketSettings from "./models/market-settings";

/**
 * The `markets` module (D90). It holds only what Medusa has no field for: per country whether it
 * is open, its languages, domain and time zone; per language its Medusa locale and `<html lang>`;
 * and the shop-wide primary country and fallback market. The regions and the store's locales stay
 * Medusa's, and a module can't read another module's tables, so the service takes the countries
 * of the regions as an argument (`getMap`) and the workflows read them with Query.
 */
class MarketsModuleService extends MedusaService({
  MarketCountry,
  MarketLanguage,
  MarketSettings,
}) {
  /** Every country row, by code (the map orders them by `rank`, see `buildMarketMap`). */
  async readCountries(): Promise<CountryRow[]> {
    const rows = await this.listMarketCountries({}, { order: { code: "ASC" } });
    return rows.map((row) => ({
      code: row.code,
      enabled: row.enabled,
      languages: [...(row.languages ?? [])],
      domain: row.domain ?? null,
      time_zone: row.time_zone ?? null,
      rank: row.rank ?? null,
    }));
  }

  async readLanguages(): Promise<LanguageRow[]> {
    const rows = await this.listMarketLanguages({}, { order: { code: "ASC" } });
    return rows.map((row) => ({
      code: row.code,
      medusa_locale: row.medusa_locale,
      html_lang: row.html_lang ?? null,
      rank: row.rank ?? null,
    }));
  }

  /** The single settings row; both fields are `null` while there is none. */
  async readSettings(): Promise<SettingsRow> {
    const [row] = await this.listMarketSettings({}, { take: 1, order: { created_at: "ASC" } });
    return {
      primary_country: row?.primary_country ?? null,
      fallback_market: row?.fallback_market ?? null,
    };
  }

  /** Whether the module holds any row yet: the seed fills it only while it holds none. */
  async isEmpty(): Promise<boolean> {
    const [countries, languages, settings] = await Promise.all([
      this.listMarketCountries({}, { take: 1 }),
      this.listMarketLanguages({}, { take: 1 }),
      this.listMarketSettings({}, { take: 1 }),
    ]);
    return countries.length + languages.length + settings.length === 0;
  }

  /**
   * The market map the storefront reads (`MarketMap`, `@shopblok/fixtures`): the countries that
   * are in a region (`regionCountryCodes`, from Medusa's regions) and have a row here. See
   * `buildMarketMap` for the order and what is left out.
   */
  async getMap(regionCountryCodes: Iterable<string>): Promise<MarketMap> {
    const [countries, languages, settings] = await Promise.all([
      this.readCountries(),
      this.readLanguages(),
      this.readSettings(),
    ]);
    return buildMarketMap({ countries, languages, settings, regionCountryCodes });
  }
}

export default MarketsModuleService;
