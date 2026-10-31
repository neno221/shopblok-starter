import { model } from "@medusajs/framework/utils";

/**
 * What Medusa has no field for, per country (D90). The country itself is Medusa's: a row is only
 * the key (`code`, lowercase ISO 3166-1) to the country of a region, and a row whose country is in
 * no region is kept but left out of the map.
 */
const MarketCountry = model.define("market_country", {
  id: model.id({ prefix: "mktc" }).primaryKey(),
  code: model.text().unique(),
  /** False by default: a country just added to a region is a closed market. */
  enabled: model.boolean().default(false),
  /** ISO 639-1 codes, the default language first. */
  languages: model.array().default([]),
  /** A domain of its own, lowercase and bare. */
  domain: model.text().unique().nullable(),
  /** An IANA zone (`Europe/Nicosia`). */
  time_zone: model.text().nullable(),
  /**
   * Where the country stands in the map (the switcher and hreflang follow its order). The seed sets
   * it from the fixtures' order; a country saved later has none and comes after, by code.
   */
  rank: model.number().nullable(),
});

export default MarketCountry;
