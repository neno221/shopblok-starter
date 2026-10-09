import {
  enabledCountries,
  listMarkets,
  normalizeHost,
  primaryCountryCode,
  primaryMarket,
} from "./market";
import type { MarketMap, RequestUrl, Resolution } from "./types";

const NOT_FOUND: Resolution = { kind: "notFound" };

/** `/ch//fr/x/` → segments `["ch", "fr", "x"]` and a trailing slash. Empty segments are dropped. */
function parsePath(pathname: string) {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  return { segments, trailingSlash: segments.length > 0 && pathname.endsWith("/") };
}

/**
 * What a public request means (SPEC §8.5), the inverse of `buildPublicUrl`:
 *
 * | Request                          | Result                                              |
 * |----------------------------------|-----------------------------------------------------|
 * | `/…`                             | the primary country, in its default language        |
 * | `/{country}/…`                   | that country, in its default language               |
 * | `/{country}/{lang}/…`            | one of its extra languages                          |
 * | `/{primary}/…`                   | 301 to `/…`; `/{primary}/{extra lang}/…` is served  |
 * | `/{country}/{default lang}/…`    | 301 to `/{country}/…`                               |
 * | `/{key}/…` (`/el-cy/…`)          | not found: the internal key is never public         |
 *
 * A store with one country has no country segment, and the same goes for a country's own domain
 * (`host`): there extra languages sit at `/{lang}/…`. A segment only counts when it is an open
 * country, or an open language of the country in front of it, and then it wins over a CMS page of
 * the same name. Anything else belongs to the primary country (or the domain's country), and its
 * whole path is passed on.
 *
 * Redirects keep the trailing slash and the query string. A path with empty segments (`//host`)
 * is rebuilt without them, so a redirect can never point at another origin. The market's home has
 * an empty `internalPath`; every other path starts with `/`.
 *
 * No country or language is named here: the map is the only source of both.
 */
export function resolve(url: RequestUrl, host: string, map: MarketMap): Resolution {
  const markets = listMarkets(map);
  const open = enabledCountries(map);
  const { segments, trailingSlash } = parsePath(url.pathname);
  const search = url.search ?? "";
  const head = segments[0];

  if (markets.length === 0) return NOT_FOUND;
  if (head !== undefined && markets.some((market) => market.key === head)) return NOT_FOUND;

  const pathOf = (rest: string[]) =>
    rest.length === 0 ? "" : `/${rest.join("/")}${trailingSlash ? "/" : ""}`;

  const redirect = (prefix: string, rest: string[]): Resolution => ({
    kind: "redirect",
    status: 301,
    // A backslash is a slash to some browsers; encode it so `/\host` is no other origin either.
    location: `${(prefix + pathOf(rest)).replace(/\\/g, "%5C") || "/"}${search}`,
  });

  /** A path inside one country, where `prefix` is what that country's URLs start with. */
  const within = (country: string, prefix: string, rest: string[]): Resolution => {
    const own = markets.filter((market) => market.country === country);
    const fallback = own.find((market) => market.isDefaultLanguage);
    if (fallback === undefined) return NOT_FOUND;
    const named = own.find((market) => market.language === rest[0]);
    if (named === undefined)
      return { kind: "rewrite", market: fallback, internalPath: pathOf(rest) };
    if (named.isDefaultLanguage) return redirect(prefix, rest.slice(1));
    return { kind: "rewrite", market: named, internalPath: pathOf(rest.slice(1)) };
  };

  // A country's own domain serves that country alone, with no country segment.
  const hostName = normalizeHost(host);
  const domainCountry =
    hostName === undefined ? undefined : open.find((c) => normalizeHost(c.domain) === hostName);
  if (domainCountry !== undefined) return within(domainCountry.code, "", segments);

  const only = open[0];
  if (open.length === 1 && only !== undefined) return within(only.code, "", segments);

  const country = open.find((candidate) => candidate.code === head);
  if (country === undefined) {
    const home = primaryMarket(map);
    return home === undefined
      ? NOT_FOUND
      : { kind: "rewrite", market: home, internalPath: pathOf(segments) };
  }

  const rest = segments.slice(1);
  if (country.code !== primaryCountryCode(map))
    return within(country.code, `/${country.code}`, rest);

  // The primary country is served at `/`; only its extra languages keep the country segment.
  const extra = markets.find(
    (market) => market.country === country.code && market.language === rest[0],
  );
  if (extra !== undefined && !extra.isDefaultLanguage) {
    return { kind: "rewrite", market: extra, internalPath: pathOf(rest.slice(1)) };
  }
  return redirect("", extra === undefined ? rest : rest.slice(1));
}
