import { model } from "@medusajs/framework/utils";

/**
 * A language the shops use, mapped to one of the store's own locales (Store → Locales). A row is
 * filled the first time a country uses the language; the Store page's panel chooses between two
 * locales of one language (`de-DE`, `de-CH`).
 */
const MarketLanguage = model.define("market_language", {
  id: model.id({ prefix: "mktl" }).primaryKey(),
  /** ISO 639-1, lowercase. */
  code: model.text().unique(),
  /** One of the store's locales: one per language (D8). */
  medusa_locale: model.text(),
  /** Overrides `<html lang>`, which is `{language}-{COUNTRY}` when this is left out. */
  html_lang: model.text().nullable(),
  /** Like a country's: the seed sets it from the fixtures' order; a language added later has none. */
  rank: model.number().nullable(),
});

export default MarketLanguage;
