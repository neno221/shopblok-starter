import { DEFAULT_LOCALE, isLocale, type Locale } from "@shopblok/i18n";
import type { Market } from "./markets/types";

/** A market, and the message catalog its pages use: the language when `@shopblok/i18n` has it. */
export type CurrentMarket = Market & { locale: Locale };

/** English copy for a language the i18n package has no catalog for (a Brazilian shop in `pt`). */
export function withLocale(market: Market): CurrentMarket {
  return {
    ...market,
    locale: isLocale(market.language) ? market.language : DEFAULT_LOCALE,
  };
}
