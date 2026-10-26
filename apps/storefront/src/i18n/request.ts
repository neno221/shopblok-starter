import { catalogs } from "@shopblok/i18n";
import { getRequestConfig } from "next-intl/server";
import { getCurrentMarket } from "../lib/current-market";

/**
 * next-intl's per-request configuration (D62): the locale, the time zone and the messages of the
 * market in the URL. The market comes from the `[market]` root param and the cached market map
 * (`getCurrentMarket`), not from `requestLocale`: that parameter reads the request's headers, which
 * would turn every page that asks for a translation into a dynamic one. `getRequestConfig` here
 * ignores its arguments for that reason, and the build under `ensureStatic` checks it (SETUP.md,
 * "next-intl (T46)").
 *
 * - `locale` is the market's `<html lang>` (`el-CY`, `de-CH`, `mn`), so `Intl` formats numbers,
 *   dates and money in the country's own convention, in a language the catalogs lack too.
 * - `messages` is the catalog of `market.locale`: `withLocale`'s one fallback rule, English for any
 *   language `@shopblok/i18n` has no catalog for. Indexing `catalogs` by the language would be a
 *   second rule, and `catalogs["mn"]` is `undefined`.
 * - `timeZone` is the market's (the country's zone in the `markets` global, D65, else UTC), so a
 *   server rendering at build time and a browser agree (without one, next-intl falls back to the
 *   zone of whichever machine renders).
 */
export default getRequestConfig(async () => {
  const market = await getCurrentMarket();
  return {
    locale: market.htmlLang,
    timeZone: market.timeZone,
    messages: catalogs[market.locale],
  };
});
