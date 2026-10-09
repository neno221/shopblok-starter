/**
 * What `seed-markets.ts` sets up. Plain data, no Medusa imports, so the plan
 * (M0 §1, D8) can be read and tested without a database. The lists a shop
 * edits (currencies, regions, locales) live in `src/config/markets.ts`, which
 * the search index reads too; they are re-exported here.
 */
export * from "../../config/markets";

/**
 * Medusa creates the store, this sales channel and the key below on every boot
 * (`createDefaultsWorkflow`), before a script runs. The seed finds them by
 * these names and only creates them when somebody deleted or renamed them.
 */
export const SALES_CHANNEL_NAME = "Default Sales Channel";

/** The storefront's publishable key; `print-publishable-key.ts` prints it. */
export const PUBLISHABLE_KEY_TITLE = "Default Publishable API Key";

export const STOCK_LOCATION_NAME = "Shopblok warehouse";

export const FULFILLMENT_SET_NAME = "Shopblok delivery";

export const FULFILLMENT_PROVIDER_ID = "manual_manual";

export const PAYMENT_PROVIDER_ID = "pp_system_default";

export const TAX_PROVIDER_ID = "tp_system";

export const SHIPPING_OPTION_NAME = "Standard";

/** The `code` of the "Standard" option's type, which survives an admin renaming the option. */
export const SHIPPING_OPTION_TYPE_CODE = "standard";

/**
 * The shipping profile products and options go in: the one `db:migrate` creates
 * (`Default Shipping Profile`). Filtering on the type keeps an extra profile an
 * admin added from being picked just because it comes first.
 */
export const DEFAULT_SHIPPING_PROFILE_TYPE = "default";

export const STOCK_LOCATION_ADDRESS = {
  address_1: "Shopblok warehouse",
  city: "Nicosia",
  country_code: "CY",
};
