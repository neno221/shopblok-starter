import { model } from "@medusajs/framework/utils";

/** The shop-wide settings: a single row. */
const MarketSettings = model.define("market_settings", {
  id: model.id({ prefix: "mkts" }).primaryKey(),
  /** The country served at `/`, lowercase ISO 3166-1. */
  primary_country: model.text().nullable(),
  /** The market key `{language}-{country}` hreflang `x-default` points to. */
  fallback_market: model.text().nullable(),
});

export default MarketSettings;
