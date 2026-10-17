import { z } from "zod";
import { CountryCode } from "./address";
import { Href } from "./content";
import { CurrencyCode } from "./money";

/**
 * A country of the market switcher, with its languages (SPEC §8.4: country and language together,
 * enabled markets only). The names are `countryName` and the language's own, from `Intl`, so none
 * is stored here.
 */
export const MarketOption = z.object({
  country: CountryCode,
  flagCode: z.string().regex(/^[A-Z]{2}$/, "Flag's code: alpha-2 in upper case"),
  currencyCode: CurrencyCode,
  languages: z
    .array(
      z.object({
        language: z.string().regex(/^[a-z]{2}$/, "ISO 639-1, lower case"),
        htmlLang: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, "`{language}-{COUNTRY}`"),
        href: Href.describe("The current page in this market"),
        current: z.boolean(),
      }),
    )
    .min(1)
    .describe("The default language first"),
});

/** The market switcher's countries (MarketSwitcher, D49); exactly one language is the current one. */
export const MarketChoice = z
  .object({ markets: z.array(MarketOption).min(1) })
  .refine(
    (choice) =>
      choice.markets.flatMap((market) => market.languages).filter((language) => language.current)
        .length === 1,
    "exactly one language of one market is the current one",
  );

export type MarketOption = z.infer<typeof MarketOption>;
export type MarketChoice = z.infer<typeof MarketChoice>;
