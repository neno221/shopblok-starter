/**
 * What `seed-markets.ts` sets up. Plain data, no Medusa imports, so the plan
 * (M0 §1, D8) can be read and tested without a database.
 */

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

/** `eur` is the store's default currency. */
export const SUPPORTED_CURRENCIES = [
  { currency_code: "eur", is_default: true },
  { currency_code: "usd", is_default: false },
  { currency_code: "gbp", is_default: false },
  { currency_code: "chf", is_default: false },
] as const;

/**
 * One Medusa locale per language (D8). `de-CH` and `fr-CH` shoppers see the
 * German and French translations, so there is no locale for them.
 */
export const SUPPORTED_LOCALES = ["en-US", "el-GR", "de-DE", "fr-FR"] as const;

/** The locales that carry translations; `en-US` is the language the data is written in. */
export const TRANSLATED_LOCALES = ["el-GR", "de-DE", "fr-FR"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["currency_code"];

export type MarketRegion = {
  name: string;
  currency_code: SupportedCurrency;
  /** Lower-case ISO 3166-1 alpha-2 codes. A country belongs to one region only. */
  countries: string[];
  /** The "Standard" shipping option's price, in the region's currency. */
  standard_shipping: number;
};

export const MARKET_REGIONS: MarketRegion[] = [
  {
    name: "Europe",
    currency_code: "eur",
    countries: ["cy", "de", "fr"],
    standard_shipping: 6,
  },
  {
    name: "United States",
    currency_code: "usd",
    countries: ["us"],
    standard_shipping: 8,
  },
  {
    name: "United Kingdom",
    currency_code: "gbp",
    countries: ["gb"],
    standard_shipping: 5,
  },
  {
    name: "Switzerland",
    currency_code: "chf",
    countries: ["ch"],
    standard_shipping: 7,
  },
];

export const STOCK_LOCATION_ADDRESS = {
  address_1: "Shopblok warehouse",
  city: "Nicosia",
  country_code: "CY",
};
