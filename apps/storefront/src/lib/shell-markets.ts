// A stand-in for T10's markets library: just enough for the shell to know its market keys and
// each one's `<html lang>`. T10 replaces this file with `lib/markets/` (`resolve`, `source`, …),
// and the layout then reads `getMarketMap()` instead of the seeded fixture.
import { markets as seededMarkets, type MarketMap } from "@shopblok/fixtures";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@shopblok/i18n";

export type ShellMarket = {
  /** `{language}-{country}` in lowercase (SPEC §8.1), also the value of the `[market]` segment. */
  key: string;
  country: string;
  language: string;
  /** The `<html lang>` value: `el-CY`, or the language's `htmlLang` override. */
  htmlLang: string;
  /** The message catalog to use: the language when the i18n package has it, else English. */
  locale: Locale;
};

/** Every market of the enabled countries: one per language the country serves. */
export function listShellMarkets(map: MarketMap = seededMarkets): ShellMarket[] {
  return map.countries
    .filter((country) => country.enabled)
    .flatMap((country) =>
      country.languages.map((language) => ({
        key: `${language}-${country.code}`,
        country: country.code,
        language,
        htmlLang:
          map.languages.find((entry) => entry.code === language)?.htmlLang ??
          `${language}-${country.code.toUpperCase()}`,
        locale: isLocale(language) ? language : DEFAULT_LOCALE,
      })),
    );
}

export function findShellMarket(
  key: string,
  map: MarketMap = seededMarkets,
): ShellMarket | undefined {
  return listShellMarkets(map).find((market) => market.key === key);
}
