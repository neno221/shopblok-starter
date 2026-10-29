import { listMarkets } from "../markets/market";
import type { Market, MarketMap } from "../markets/types";
import { buildPublicUrl } from "../markets/url";
import {
  isAbsoluteUrl,
  isUnder,
  marketPrefixes,
  normalizePath,
  type RedirectEntry,
  type RedirectList,
  type RedirectType,
} from "./rules";

// D82 (T68): which redirect a request matches and where it goes. A `from` without a market prefix
// applies in every market; one with a prefix (`/de/old`) in that market only, and wins there over
// one without. Matching runs on the path inside the market, after `resolve` and before the
// rewrite (`proxy-response.ts`). Pure, so the proxy, the save checks and the tests share it.

/** The redirects by the path inside a market they match: every market's, and each market's own. */
export type CompiledRedirects = {
  everywhere: ReadonlyMap<string, RedirectEntry>;
  byMarket: ReadonlyMap<string, ReadonlyMap<string, RedirectEntry>>;
};

/**
 * The redirects keyed for matching, given the market map: a `from` that starts with a market's
 * prefix belongs to that market (the longest prefix that fits, so `/ch/fr/old` is `/ch/fr`'s and
 * not `/ch`'s), with the prefix taken off. Of two with one key, the first keeps it (`from` is
 * unique, so that is only `/old` and `/old/`).
 */
export function compileRedirects(list: RedirectList, map: MarketMap): CompiledRedirects {
  const prefixes = marketPrefixes(map);
  const everywhere = new Map<string, RedirectEntry>();
  const byMarket = new Map<string, Map<string, RedirectEntry>>();
  const put = (into: Map<string, RedirectEntry>, path: string, entry: RedirectEntry) => {
    if (!into.has(path)) into.set(path, entry);
  };
  for (const entry of list.redirects) {
    const from = normalizePath(entry.from);
    const longest = Math.max(
      0,
      ...prefixes.filter(({ prefix }) => isUnder(from, prefix)).map(({ prefix }) => prefix.length),
    );
    if (longest === 0) {
      put(everywhere, from, entry);
      continue;
    }
    const inside = normalizePath(from.slice(longest));
    for (const { key, prefix } of prefixes) {
      if (prefix.length !== longest || !isUnder(from, prefix)) continue;
      const own = byMarket.get(key) ?? new Map<string, RedirectEntry>();
      byMarket.set(key, own);
      put(own, inside, entry);
    }
  }
  return { everywhere, byMarket };
}

/** The redirect for a path inside `market` (`resolve`'s `internalPath`, empty for its home). */
export function redirectFor(
  compiled: CompiledRedirects,
  market: Pick<Market, "key">,
  internalPath: string,
): RedirectEntry | undefined {
  const path = normalizePath(internalPath);
  return compiled.byMarket.get(market.key)?.get(path) ?? compiled.everywhere.get(path);
}

/** The path inside `market` a redirect sends to, or `undefined` (a full URL, or none there). */
export function targetPath(entry: RedirectEntry, market: Pick<Market, "language">) {
  if ("url" in entry.to) return isAbsoluteUrl(entry.to.url) ? undefined : entry.to.url;
  return entry.to.paths[market.language];
}

/**
 * Where a redirect sends a visitor of `market`: a full URL as written; a path inside the market,
 * or a page's or post's address in the market's language, with the market's prefix (its own
 * domain's URL for a market on one). `undefined` when the page or post has no address in that
 * language: the request then goes on to the page as if there were no redirect.
 */
export function redirectLocation(
  entry: RedirectEntry,
  market: Market,
  map: MarketMap,
): string | undefined {
  if ("url" in entry.to && isAbsoluteUrl(entry.to.url)) return entry.to.url;
  const path = targetPath(entry, market);
  return path === undefined ? undefined : buildPublicUrl(market, path, map);
}

/**
 * The status for a redirect of `type` (D82): a GET or HEAD gets the type; any other method gets the
 * code that keeps the method and its body, 308 for a 301 or a 308 and 307 for a 302, so a form's
 * POST is not turned into a GET.
 */
export function redirectCode(type: RedirectType, method: string): 301 | 302 | 307 | 308 {
  if (method === "GET" || method === "HEAD") return Number(type) as 301 | 302 | 308;
  return type === "302" ? 307 : 308;
}

const cache = new WeakMap<RedirectList, { map: MarketMap; compiled: CompiledRedirects }>();

/** `compileRedirects` once per list and map: the proxy keeps both for 30 s (D10). */
export function compiledFor(list: RedirectList, map: MarketMap): CompiledRedirects {
  const held = cache.get(list);
  if (held !== undefined && held.map === map) return held.compiled;
  const compiled = compileRedirects(list, map);
  cache.set(list, { map, compiled });
  return compiled;
}

/**
 * Why saving `candidate` next to `others` would make a loop or a chain, or `undefined` (D82): in
 * some market it sends to its own `from`, to another redirect's `from`, or another redirect sends
 * to its `from`. A visitor would then be redirected twice, or for ever.
 */
export function loopProblem(
  candidate: RedirectEntry,
  others: readonly RedirectEntry[],
  map: MarketMap,
): string | undefined {
  const own = normalizePath(candidate.from);
  const all = [candidate, ...others.filter((other) => normalizePath(other.from) !== own)];
  const compiled = compileRedirects({ redirects: all }, map);
  for (const market of listMarkets(map)) {
    const mine = compiled.byMarket.get(market.key);
    // The redirects that apply in this market: its own, and every market's it does not shadow.
    const inMarket: RedirectEntry[] = [
      ...(mine?.values() ?? []),
      ...[...compiled.everywhere].flatMap(([path, entry]) => (mine?.has(path) ? [] : [entry])),
    ];
    for (const entry of inMarket) {
      const target = targetPath(entry, market);
      if (target === undefined) continue;
      const next = redirectFor(compiled, market, target.replace(/[?#].*$/, ""));
      if (next === undefined) continue;
      if (entry === candidate && next === candidate)
        return "This redirect sends visitors to its own address, round and round.";
      if (entry === candidate)
        return `This sends visitors to ${next.from}, which redirects too: send them to where ${next.from} goes instead.`;
      if (next === candidate)
        return `${entry.from} already redirects to ${candidate.from}: a visitor would be redirected twice. Change that redirect first.`;
    }
  }
  return undefined;
}
