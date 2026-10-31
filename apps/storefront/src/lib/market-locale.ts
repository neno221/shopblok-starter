import { DEFAULT_LOCALE, isLocale, type Locale } from "@shopblok/i18n";
import type { Market } from "./markets/types";

/**
 * The zone of a market whose country has no `timeZone` in Medusa's markets (D65, D96): a fixed
 * zone, so the server that prerenders a page and the browser that hydrates it print the same time.
 */
export const DEFAULT_TIME_ZONE = "UTC";

/**
 * A market, the message catalog its pages use (the language when `@shopblok/i18n` has it) and the
 * time zone its dates are written in (the country's, else UTC).
 */
export type CurrentMarket = Market & { locale: Locale; timeZone: string };

/**
 * The catalog a market language's copy comes from: its own, or English for a language the i18n
 * package has no catalog for (a Brazilian shop in `pt`). The one rule (D62): `withLocale` and the
 * `ui-strings` loader both use it.
 */
export const catalogLocale = (language: string): Locale =>
  isLocale(language) ? language : DEFAULT_LOCALE;

/** A market with its catalog (`catalogLocale`) and its time zone. */
export function withLocale(market: Market): CurrentMarket {
  return {
    ...market,
    locale: catalogLocale(market.language),
    timeZone: market.timeZone ?? DEFAULT_TIME_ZONE,
  };
}
