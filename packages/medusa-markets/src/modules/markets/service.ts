import type { Context } from "@medusajs/framework/types";
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";

import { buildMarketMap } from "../../lib/map";
import type { CountryRow, LanguageRow, MarketMap, SettingsRow } from "../../lib/types";
import MarketCountry from "./models/market-country";
import MarketLanguage from "./models/market-language";
import MarketSettings from "./models/market-settings";

/** The rows of one save. */
type MarketsWrite = {
  countries?: CountryRow[];
  languages?: LanguageRow[];
  settings?: SettingsRow;
};

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

  /**
   * Writes the rows of one save in one database transaction: the languages first (so a country
   * never names a language that has no row yet), then the countries, then the settings. If any
   * of them fails (a unique index on a domain that a concurrent save took, a lost connection),
   * none is kept, so the step's compensation only has to undo what a later step spoils (PR 105
   * review, item 2). It follows Medusa's "DB operations": `@InjectManager` on the public method,
   * `@InjectTransactionManager` on the one that writes, and the `sharedContext` passed to every
   * call.
   */
  @InjectManager()
  async saveMarkets(
    rows: MarketsWrite,
    @MedusaContext() sharedContext: Context = {},
  ): Promise<void> {
    await this.saveMarkets_(rows, sharedContext);
  }

  @InjectTransactionManager()
  protected async saveMarkets_(
    rows: MarketsWrite,
    @MedusaContext() sharedContext: Context = {},
  ): Promise<void> {
    for (const row of rows.languages ?? []) {
      const [existing] = await this.listMarketLanguages(
        { code: row.code },
        { take: 1 },
        sharedContext,
      );
      if (existing) await this.updateMarketLanguages({ id: existing.id, ...row }, sharedContext);
      else await this.createMarketLanguages(row, sharedContext);
    }
    // One after the other, not in a batch. The map orders the countries by `rank`, then code, not
    // by when they were written (`buildMarketMap`).
    for (const row of rows.countries ?? []) {
      const [existing] = await this.listMarketCountries(
        { code: row.code },
        { take: 1 },
        sharedContext,
      );
      if (existing) await this.updateMarketCountries({ id: existing.id, ...row }, sharedContext);
      else await this.createMarketCountries(row, sharedContext);
    }
    if (rows.settings) {
      const [existing] = await this.listMarketSettings(
        {},
        { take: 1, order: { created_at: "ASC" } },
        sharedContext,
      );
      if (existing) {
        await this.updateMarketSettings({ id: existing.id, ...rows.settings }, sharedContext);
      } else await this.createMarketSettings(rows.settings, sharedContext);
    }
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
   * The market map the storefront reads (`MarketMap`, `@shopblok/fixtures`): every country that
   * is in a region (`regionCountryCodes`, from Medusa's regions), with or without a row here (a
   * country without one is listed closed, D90). See `buildMarketMap` for the order and what is
   * left out.
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
