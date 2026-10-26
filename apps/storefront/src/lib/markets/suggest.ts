import type { MarketSuggestion } from "@shopblok/registry/contracts";
import { listMarkets } from "./market";
import { resolve } from "./resolve";
import type { Market, MarketMap } from "./types";
import { buildPublicUrl } from "./url";

// The market suggestion (SPEC §8.5, D66): never a redirect, a banner. The country comes from
// Vercel's `x-vercel-ip-country`, the language from `Accept-Language`; the suggestion is the
// visitor's country in the language they read best among its own, and nothing when that is the
// market they are on. `/next/visitor` answers it, and only while the visitor has made no explicit
// choice (the `_shopblok_market` cookie).

/** `Accept-Language` as primary language codes, best first (`de-CH,fr;q=0.8` → `de`, `fr`). */
export function preferredLanguages(header: string | null | undefined): string[] {
  const entries = (header ?? "").split(",").flatMap((part, index) => {
    const [tag, ...params] = part.trim().split(";");
    const language = tag?.trim().toLowerCase().split("-")[0];
    if (!language || language === "*" || !/^[a-z]{2,3}$/.test(language)) return [];
    const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
    const quality = q === undefined ? 1 : Number(q.slice(2));
    return Number.isFinite(quality) && quality > 0 ? [{ language, quality, index }] : [];
  });
  entries.sort((a, b) => b.quality - a.quality || a.index - b.index);
  return [...new Set(entries.map((entry) => entry.language))];
}

/** The path inside its market of a public path (`/us/products/tee` → `/products/tee`), else `/`. */
export function pathInMarket(publicPath: string, host: string, map: MarketMap): string {
  if (!publicPath.startsWith("/") || publicPath.startsWith("//")) return "/";
  const resolution = resolve({ pathname: publicPath }, host, map);
  return resolution.kind === "rewrite" && resolution.internalPath !== ""
    ? resolution.internalPath
    : "/";
}

export type SuggestionInput = {
  map: MarketMap;
  current: Market;
  /** `x-vercel-ip-country`: ISO 3166-1 alpha-2, any case; absent outside Vercel. */
  country: string | null | undefined;
  acceptLanguage: string | null | undefined;
  /** The page's path inside the market, so the suggestion links to the same page. */
  path: string;
  /** The currency a country's region sells in, upper case; `undefined` when it has no region. */
  currencyOf: (country: string) => string | undefined;
};

/** A market's `<html lang>` in the contract's `xx-YY` form. */
const langTag = (market: Market) => `${market.language}-${market.country.toUpperCase()}`;

/**
 * What the banner offers, with the suggested market's key; `null` when there is nothing to offer:
 * no country header, a country the shop does not sell in, a country with no region, or the
 * market the visitor is on. The contract needs another country (MarketSuggestion's refinement), so
 * a visitor in the right country but another of its languages gets no banner here; MarketSwitcher
 * covers that.
 */
export function suggestMarket(input: SuggestionInput): Suggestion | null {
  const country = input.country?.trim().toLowerCase();
  if (!country || !/^[a-z]{2}$/.test(country) || country === input.current.country) return null;
  const candidates = listMarkets(input.map).filter((market) => market.country === country);
  if (candidates.length === 0) return null;
  const languages = preferredLanguages(input.acceptLanguage);
  const suggested =
    languages
      .map((language) => candidates.find((market) => market.language === language))
      .find((market) => market !== undefined) ??
    candidates.find((market) => market.isDefaultLanguage) ??
    candidates[0];
  if (suggested === undefined) return null;
  return suggestionOf(input, suggested);
}

type Suggestion = MarketSuggestion & { market: string };

/** The banner's offer of `suggested` from `input.current`, or `null` when its country has no region. */
function suggestionOf(
  input: Pick<SuggestionInput, "map" | "current" | "path" | "currencyOf">,
  suggested: Market,
): Suggestion | null {
  const currencyCode = input.currencyOf(suggested.country);
  if (currencyCode === undefined) return null;
  return {
    market: suggested.key,
    current: { country: input.current.country },
    suggested: {
      country: suggested.country,
      language: suggested.language,
      htmlLang: langTag(suggested),
      currencyCode,
      href: buildPublicUrl(suggested, input.path, input.map),
    },
  };
}

/**
 * The offer of the market `key` names, as `suggestMarket` would make it, for the banner's action
 * (PR 75 review, item 8): `/next/visitor` has matched the request's country and languages already,
 * so the action takes the key the visitor store holds and only checks it. Everything the banner
 * shows comes from the map and the regions, never from the browser; `null` for a key that is no
 * open market, or one in the current market's country (MarketSuggestion's refinement).
 */
export function suggestionForKey(
  input: Pick<SuggestionInput, "map" | "current" | "path" | "currencyOf">,
  key: string,
): Suggestion | null {
  const suggested = listMarkets(input.map).find((market) => market.key === key);
  if (suggested === undefined || suggested.country === input.current.country) return null;
  return suggestionOf(input, suggested);
}
