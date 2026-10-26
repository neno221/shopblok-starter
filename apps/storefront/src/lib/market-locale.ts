import { DEFAULT_LOCALE, isLocale, type Locale } from "@shopblok/i18n";
import type { Market } from "./markets/types";

/**
 * The zone of a market whose country has no `timeZone` in the `markets` global (D65): a fixed
 * zone, so the server that prerenders a page and the browser that hydrates it print the same time.
 */
export const DEFAULT_TIME_ZONE = "UTC";

/**
 * A market, the message catalog its pages use (the language when `@shopblok/i18n` has it) and the
 * time zone its dates are written in (the country's, else UTC).
 */
export type CurrentMarket = Market & { locale: Locale; timeZone: string };

/** English copy for a language the i18n package has no catalog for (a Brazilian shop in `pt`). */
export function withLocale(market: Market): CurrentMarket {
  return {
    ...market,
    locale: isLocale(market.language) ? market.language : DEFAULT_LOCALE,
    timeZone: market.timeZone ?? DEFAULT_TIME_ZONE,
  };
}
