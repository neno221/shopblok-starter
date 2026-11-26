import { findMarket, normalizeHost } from "./market";
import type { Market, MarketMap } from "./types";
import { localPath } from "../safe-redirect";

// M7 D148 (3), T111: live preview for a country on its own domain. The editor's Payload cookie and
// Draft Mode's cookie belong to the admin's host (T59), so such a market is previewed there, not on
// its domain: at `/{market key}/…` on the admin's host, the internal key that is never a public
// URL (SPEC §8.1). The proxy serves that path only to a request that carries Draft Mode's cookie
// and a valid staff `payload-token` (`proxy.ts`), as a rewrite to the market's own page, `noindex`
// and never stored; anyone else gets the 404 the key always gets. The page then renders in the
// market's language and prices; its links point at the market's domain, so only the frame's address
// differs from the live page's.

/** The cookie `draftMode().enable()` sets (Next's `__prerender_bypass`). */
export const DRAFT_MODE_COOKIE = "__prerender_bypass";

/** What an own-domain preview path names: the market, and the path inside it (`""` for its home). */
export type OwnDomainPreview = { market: Market; internalPath: string };

/**
 * `/{key}/…` when `key` is an open market on a domain of its own that is not `host` (on its own
 * domain the key stays a 404, as `resolve` has it), else `undefined`. Empty segments are dropped,
 * as `resolve` drops them.
 */
export function ownDomainPreview(
  pathname: string,
  host: string,
  map: MarketMap,
): OwnDomainPreview | undefined {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const key = segments[0];
  if (key === undefined) return undefined;
  const market = findMarket(map, key);
  if (market?.domain === undefined) return undefined;
  if (normalizeHost(host) === market.domain) return undefined;
  const rest = segments.slice(1);
  return { market, internalPath: rest.length === 0 ? "" : `/${rest.join("/")}` };
}

/**
 * The path `/next/preview` may send an editor to for an own-domain market (D148, 3): `target` when
 * it passes `safeRedirect`'s checks of a local path and names such a market, as its path and query;
 * `null` otherwise.
 */
export function ownDomainPreviewPath(
  target: string | null | undefined,
  host: string,
  map: MarketMap,
): string | null {
  const url = localPath(target);
  if (url === null || ownDomainPreview(url.pathname, host, map) === undefined) return null;
  return url.pathname + url.search;
}

/**
 * The admin's-host path that previews `path` (a path inside the market, `/` for its home, with any
 * query) of an own-domain `market`: `/{key}{path}`.
 */
export function ownDomainPreviewTarget(market: Market, path: string): string {
  const cut = path.search(/[?#]/);
  const head = (cut === -1 ? path : path.slice(0, cut)).replace(/^[\s/\\]+/, "");
  const tail = cut === -1 ? "" : path.slice(cut).replace(/#.*$/, "");
  return `/${market.key}${head === "" ? "" : `/${head}`}${tail}`;
}
