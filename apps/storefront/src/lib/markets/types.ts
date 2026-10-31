// The market map is defined in `@shopblok/fixtures` (the shape of Medusa's `GET /store/markets`,
// M4b D94); the library adds the derived market and the result of resolving a request.
import type { MarketCountry, MarketLanguage, MarketMap } from "@shopblok/fixtures";

export type { MarketCountry, MarketLanguage, MarketMap };

/** One country in one of its languages: the unit a shopper browses (SPEC §8.5). */
export type Market = {
  /** The internal key, `{language}-{country}` in lowercase (SPEC §8.1): the `[market]` segment. */
  key: string;
  country: string;
  language: string;
  /** `<html lang>` and the hreflang value: the language's override, else `{language}-{COUNTRY}`. */
  htmlLang: string;
  /** What Medusa calls this language (`x-medusa-locale`, D8). */
  medusaLocale: string;
  /** The country's own domain, lowercase and bare, when it has one. */
  domain?: string;
  /** The country's IANA time zone (D65), when it has a valid one: `withLocale` falls back to UTC. */
  timeZone?: string;
  /** Whether this is the country's first language, the one that needs no segment in its URL. */
  isDefaultLanguage: boolean;
};

/** What a public request means (SPEC §8.5). T11's proxy turns each case into a response. */
export type Resolution =
  /** Serve `/{market.key}{internalPath}`. `internalPath` is empty for the market's home. */
  | { kind: "rewrite"; market: Market; internalPath: string }
  /** Send the browser to `location` (a path and query on the same host). */
  | { kind: "redirect"; location: string; status: 301 }
  /** Nothing is served here, for example the internal `/el-cy/` key. */
  | { kind: "notFound" };

/** The part of a URL that `resolve` reads. A `URL` and Next's `NextURL` both fit. */
export type RequestUrl = { pathname: string; search?: string };
