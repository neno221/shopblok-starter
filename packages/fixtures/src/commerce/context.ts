import type { Money } from "@shopblok/registry/contracts";
import {
  designSystemFixtures,
  type DesignSystemFixture,
  type DesignSystemLocale,
  type DesignSystemMarket,
} from "../design-system";
import { markets } from "../markets";
import type { Copy } from "./copy";
import {
  designSystemColourKeys,
  palette,
  type ColourKey,
  type Currency,
  type Prices,
  type ProductHandle,
} from "./data/catalog";

/**
 * What a URL starts with in a market (SPEC §8.5): nothing for the primary country in its default
 * language, `/{country}` for another country in its default language, `/{country}/{language}` for
 * any other language. So Cyprus in Greek is `""`, the US `/us`, Switzerland in German `/ch` and in
 * French `/ch/fr`.
 */
export function marketPrefix(country: string, language: string): string {
  const entry = markets.countries.find((candidate) => candidate.code === country);
  if (entry === undefined) throw new Error(`${country} is not in the seeded market map`);
  if (!entry.languages.includes(language))
    throw new Error(`${country} has no language ${language} in the seeded market map`);
  const isDefaultLanguage = entry.languages[0] === language;
  if (isDefaultLanguage && country === markets.primaryCountry) return "";
  return isDefaultLanguage ? `/${country}` : `/${country}/${language}`;
}

/** A market's home page: its prefix, or `/` when the prefix is empty. */
export function marketRoot(prefix: string): string {
  return prefix === "" ? "/" : prefix;
}

/** Rounds to two decimals, so a sum of cents never shows as 102.60000000000001. */
export function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function isCurrency(value: string): value is Currency {
  return value === "EUR" || value === "USD" || value === "CHF";
}

/** The design system's names for its five colours, which the catalog reuses. */
function colourNames(ds: DesignSystemFixture, copy: Copy): Record<ColourKey, string> {
  const names = { ...copy.colours } as Record<ColourKey, string>;
  designSystemColourKeys.forEach((key, index) => {
    const colour = ds.colours[index];
    if (colour === undefined || colour.hex !== palette[key])
      throw new Error(`design-system.ts colour ${index} is no longer ${key} (${palette[key]})`);
    names[key] = colour.name;
  });
  return names;
}

/** What the builders of one locale share: its market, its words and how to write a link or a price. */
export type Context = {
  locale: DesignSystemLocale;
  copy: Copy;
  ds: DesignSystemFixture;
  market: DesignSystemMarket;
  currency: Currency;
  prefix: string;
  /** `/` or the prefix. */
  root: string;
  /** A path under the market's prefix: `href("/products/x")` is `/us/products/x`. */
  href(path: string): string;
  /** A category's URL from the handles down to it. */
  categoryHref(...handles: string[]): string;
  money(amount: number): Money;
  /** The amount of a per-currency table in the market's currency. */
  price(prices: Prices): Money;
  productTitle(handle: ProductHandle): string;
  colourName(key: ColourKey): string;
};

export function createContext(locale: DesignSystemLocale, copy: Copy): Context {
  const ds = designSystemFixtures[locale];
  const { market } = ds;
  if (!isCurrency(market.currency))
    throw new Error(`The fixtures have no prices in ${market.currency}`);
  const currency = market.currency;
  const prefix = marketPrefix(market.country, market.language);
  const names = colourNames(ds, copy);
  const money = (amount: number): Money => ({ amount, currencyCode: currency });
  return {
    locale,
    copy,
    ds,
    market,
    currency,
    prefix,
    root: marketRoot(prefix),
    href: (path) => `${prefix}${path}`,
    categoryHref: (...handles) => `${prefix}/categories/${handles.join("/")}`,
    money,
    price: (prices) => money(prices[currency]),
    productTitle: (handle) =>
      handle === "heritage-hoodie" ? ds.ordinary.productName : copy.productTitles[handle],
    colourName: (key) => names[key],
  };
}
