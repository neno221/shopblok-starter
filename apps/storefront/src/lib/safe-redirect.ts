import { resolve } from "./markets/resolve";
import type { MarketMap } from "./markets/types";

/** First segments that are never a market's page: Payload, the DS, Next's own and the routes here. */
const NOT_A_MARKET = new Set(["admin", "api", "design-system", "next", "_next", "_vercel"]);

/** Any character below a space or DEL: browsers drop or reinterpret them in a `Location`. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

/**
 * The path to send a browser to after a preview route (D74), or `null` when `target` is not a
 * page of an open market on this host. A preview link carries the path in its query string, so the
 * routes must not become an open redirect: anything that could leave the origin or land outside
 * the shop is refused, and the caller sends the market's home (or 400) instead.
 *
 * Accepted: a path starting with one `/`, with no backslash, control character or encoded slash
 * or backslash, that stays on this origin once parsed, and that `resolve` serves as a market page
 * (a 301 there, `/{primary}/…`, is refused too: the caller's link should be the public URL). The
 * result is the parsed path and query, without a fragment.
 */
export function safeRedirect(
  target: string | null | undefined,
  host: string,
  map: MarketMap,
): string | null {
  if (typeof target !== "string" || !target.startsWith("/")) return null;
  // `//evil.example` and `/\evil.example` are other origins to a browser.
  if (target.startsWith("//") || target.includes("\\") || CONTROL.test(target)) return null;
  // `/%2F%2Fevil.example` and `/%5Cevil.example` decode to the same, in a browser or a proxy.
  if (/%(2f|5c)/i.test(target)) return null;
  let url: URL;
  try {
    url = new URL(target, "http://origin.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://origin.invalid") return null;
  const head = url.pathname.split("/")[1] ?? "";
  if (NOT_A_MARKET.has(head.toLowerCase())) return null;
  if (resolve({ pathname: url.pathname, search: url.search }, host, map).kind !== "rewrite") {
    return null;
  }
  return url.pathname + url.search;
}
