/**
 * The shop's markets: the one place that says which currencies, regions and languages the
 * backend sells in. Plain data with no Medusa imports, so the seed (`scripts/seed-markets.ts`),
 * the search index (`search/helpers/pricing.ts`) and the unit tests all read the same lists.
 *
 * To open a market (a Brazilian shop, say), edit this file, best before the first
 * `pnpm bootstrap`:
 *
 * 1. `SUPPORTED_CURRENCIES`: add `{ currency_code: "brl", is_default: false }`. The store, the
 *    regions and the search index all take their currencies from this list, so price filtering
 *    and sorting in `/store/search` cover it (`min_price_brl`, `max_price_brl`, `on_sale_brl`).
 * 2. `MARKET_REGIONS`: add `{ name: "Brazil", currency_code: "brl", countries: ["br"],
 *    standard_shipping: 20 }`. A country belongs to one region only.
 * 3. `SUPPORTED_LOCALES`: add `"pt-BR"`. It must be one of the 51 BCP 47 codes Medusa ships
 *    (it includes `el-GR`, `pt-BR` and `mn-MN`); one locale per language (D8).
 *
 * On a database that already exists, apply the edit with `medusa db:migrate` (a new currency
 * changes the search index schema, so it plans a new index version), then `seed-markets.ts`
 * (store currencies and locales, regions, tax regions, shipping), then restart the server, which
 * fills the new index version and makes it live. A fresh database gets all of it from
 * `pnpm bootstrap`.
 *
 * The demo catalog prices itself in every supported currency when it creates its products
 * (`lib/demo-catalog.ts`); products that exist already keep the prices they have, so on a
 * development database reset it or add the prices in the admin. A language without translations
 * shows the English text until translations are added.
 */

/** What Medusa calls the store it creates on every boot, and what the seed names it instead. */
export const MEDUSA_DEFAULT_STORE_NAME = "Medusa Store";

export const STORE_NAME = "Shopbloks Starter";

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
