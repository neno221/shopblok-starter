import { catalogs } from "@shopblok/i18n";
import { unstable_rethrow } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { readUiStrings } from "../lib/cms/ui-strings";
import { getCurrentMarket } from "../lib/current-market";
import { withOverrides, type UiStringOverrides } from "./messages";

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
 *   second rule, and `catalogs["mn"]` is `undefined`. Over it go the language's edited
 *   `ui-strings` (D77, `readUiStrings`): one cached read per language, Payload's English for a
 *   language with no value of its own, and only values that pass the ICU check. So a value comes
 *   from the language's edit, then English's edit, then the code catalog of the language, then
 *   English's. With no database, or while Payload cannot answer, the code catalog alone.
 * - `timeZone` is the market's (the country's zone in the `markets` global, D65, else UTC), so a
 *   server rendering at build time and a browser agree (without one, next-intl falls back to the
 *   zone of whichever machine renders).
 */
export default getRequestConfig(async () => {
  const market = await getCurrentMarket();
  const overrides = await editedStrings(market);
  return {
    locale: market.htmlLang,
    timeZone: market.timeZone,
    messages: withOverrides(catalogs[market.locale], overrides),
  };
});

let failing = false;

/**
 * The market language's edited strings, or none. A read that fails (Payload's database down, with
 * nothing cached yet) must not take every page with it, so the code catalog stands in, with one
 * warning per outage. Next's own control-flow errors are rethrown.
 */
async function editedStrings(market: { language: string }): Promise<UiStringOverrides> {
  try {
    const overrides = (await readUiStrings({ market, draft: false })) ?? {};
    failing = false;
    return overrides;
  } catch (error) {
    unstable_rethrow(error);
    if (!failing) console.warn("ui-strings: the read failed, so pages show the code's copy", error);
    failing = true;
    return {};
  }
}
