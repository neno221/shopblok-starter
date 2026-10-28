import type { Route } from "next";
import { enabledCountries, primaryCountryCode } from "./market";
import type { Market, MarketMap } from "./types";

/**
 * What a market's URLs start with (SPEC §8.5): nothing, `/us`, `/ch/fr`, `/cy/en` or `/en`. Each
 * segment is there only when it is needed:
 * - the country segment is left out for the primary country in its default language, in a store
 *   with one country, and on a country's own domain;
 * - the language segment is left out for a country's default language.
 * An extra language of the primary country keeps the country (`/cy/en`), so `/en` stays free for a
 * CMS page. `resolve` is the inverse of this.
 */
export function marketPrefix(market: Market, map: MarketMap): string {
  const countryDropped = market.domain !== undefined || enabledCountries(map).length === 1;
  if (market.isDefaultLanguage) {
    return countryDropped || market.country === primaryCountryCode(map) ? "" : `/${market.country}`;
  }
  return countryDropped ? `/${market.language}` : `/${market.country}/${market.language}`;
}

/**
 * What the backend needs for an e-mail it sends to a shopper of `market` (T44, T70): the public
 * prefix its links start with, and the language whose copy it reads from Payload's
 * `email-templates` (D84). It travels in Medusa's `metadata`, as `{ market, language }`.
 */
export type MailTarget = { market: string; language: string };

export function mailTarget(market: Market, map: MarketMap): MailTarget {
  return { market: marketPrefix(market, map), language: market.language };
}

/**
 * The public URL of a page of a market. `path` is the page's path inside the market (`/`,
 * `/products/shirt`, `/store?page=2`); the result starts with the market's prefix. A market on its
 * own domain gets an absolute URL, because it differs from the current host when linked from
 * another market; every other market gets a path on the current host.
 *
 * The root of a market has no trailing slash (`/us`, not `/us/`): `trailingSlash` is off in
 * `next.config.ts`, so Next would redirect the longer form. SPEC §8.5 writes `/us/` as notation.
 *
 * Returns `Route` so a component can pass it to `<Link href>` with `typedRoutes` on and no cast of
 * its own (SETUP.md, T08 item 3). The one cast is here: the map decides the segments at runtime,
 * so Next's generated route types can't know them.
 */
export function buildPublicUrl(market: Market, path: string, map: MarketMap): Route {
  const cut = path.search(/[?#]/);
  const head = cut === -1 ? path : path.slice(0, cut);
  const tail = cut === -1 ? "" : path.slice(cut);
  // Always rooted at one slash, so a path like `//host` or `/\host` (a backslash is a slash to
  // browsers, and they drop leading whitespace) can't turn the result into another origin.
  const pathname = head.replace(/^[\s/\\]+/, "");
  const joined = marketPrefix(market, map) + (pathname === "" ? "" : `/${pathname}`);
  const local = (joined === "" ? "/" : joined) + tail;
  return (market.domain === undefined ? local : `https://${market.domain}${local}`) as Route;
}
