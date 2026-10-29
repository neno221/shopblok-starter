import { listMarkets } from "../markets/market";
import type { MarketMap } from "../markets/types";
import { marketPrefix } from "../markets/url";

// D82 (T68): the redirects' shape and the rules a `from` and a custom `to` follow. Pure and free of
// Payload, so the proxy (`match.ts`), `/next/redirects` and the collection's save checks
// (`payload/redirects.ts`) share them.

/** The codes an editor picks (D82): a GET gets its own, any other method the one keeping it. */
export const REDIRECT_TYPES = ["301", "302", "308"] as const;
export type RedirectType = (typeof REDIRECT_TYPES)[number];

/**
 * Where a redirect sends, as `/next/redirects` hands it to the proxy: a custom URL as the editor
 * wrote it (a path inside the visitor's market, or a full URL), or a page's or post's address
 * inside a market, per language (a language where it has none is left out).
 */
export type RedirectTarget = { url: string } | { paths: Record<string, string> };

/** One redirect: its `from` as written (with or without a market prefix), its code and target. */
export type RedirectEntry = { from: string; type: RedirectType; to: RedirectTarget };

/** What `/next/redirects` answers. */
export type RedirectList = { redirects: RedirectEntry[] };

/**
 * A path as the redirects compare it: its segments decoded (a Greek slug matches whether the
 * browser sent it escaped or not), no empty segment and no trailing slash, `/` for the root.
 */
export function normalizePath(path: string): string {
  const segments = path
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  return `/${segments.join("/")}`;
}

/**
 * The first segments the proxy's matcher skips (`proxy.ts`): Payload, the design system, the
 * `/next` routes, Next's and Vercel's own paths and `/.well-known`. A `from` there never reaches
 * the redirect step.
 */
const SKIPPED_SEGMENTS = [
  "admin",
  "api",
  "design-system",
  "next",
  "_next",
  "_vercel",
  ".well-known",
] as const;

/** The matcher's file rule (D54): a last segment ending in `.` and a letter (`old.html`). */
const LOOKS_LIKE_FILE = /\.[A-Za-z][A-Za-z0-9]*$/;

/** What a market's URLs start with (`/us`, `/ch/fr`), for every open market that has one. */
export function marketPrefixes(map: MarketMap): { key: string; prefix: string }[] {
  return listMarkets(map).flatMap((market) => {
    const prefix = marketPrefix(market, map);
    return prefix === "" ? [] : [{ key: market.key, prefix }];
  });
}

/** Whether `path` (normalized) is `prefix` or under it. */
export const isUnder = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/**
 * Why a `from` cannot work, or `undefined` when it can (D82). The proxy only sees what its matcher
 * lets through, so a path it skips is refused with the reason rather than saved to do nothing; a
 * market's home is refused too, since a redirect there would take the whole market away.
 */
export function fromProblem(from: string, map: MarketMap): string | undefined {
  if (!from.startsWith("/") || from.startsWith("//"))
    return "Start with a single /, like /old-page.";
  if (/[?#]/.test(from)) return "Write the path alone, without ? or #.";
  if (/[\s\\]/.test(from)) return "A path has no spaces or backslashes.";
  const path = normalizePath(from);
  const [first = ""] = path.split("/").slice(1);
  if ((SKIPPED_SEGMENTS as readonly string[]).includes(first))
    return `Paths under /${first} never reach the shop's redirects: Payload, the design system or Next answers them first.`;
  if (LOOKS_LIKE_FILE.test(path))
    return "This looks like a file (it ends in a dot and letters, like .html): the shop answers such paths as files and never redirects them.";
  if (path === "/" || marketPrefixes(map).some(({ prefix }) => prefix === path))
    return "This is a market's home: a redirect here would take the whole market away.";
  return undefined;
}

const ABSOLUTE = /^https?:\/\//i;

/** Whether a target is a full URL (`https://…`) rather than a path inside the market. */
export const isAbsoluteUrl = (url: string) => ABSOLUTE.test(url);

/**
 * Why a custom `to` cannot work, or `undefined` (D82): a path inside the visitor's market, which
 * the proxy puts the market's prefix in front of, or a full `http(s)` URL. A path that starts
 * with a market's prefix would get a second one (`/de/de/new`).
 */
export function customUrlProblem(url: string, map: MarketMap): string | undefined {
  if (isAbsoluteUrl(url)) {
    try {
      new URL(url);
      return undefined;
    } catch {
      return "This is not a valid URL.";
    }
  }
  if (!url.startsWith("/") || url.startsWith("//") || /[\s\\]/.test(url))
    return "Write a path inside the market (/new-page) or a full URL (https://…).";
  const path = normalizePath(url.replace(/[?#].*$/, ""));
  const prefixed = marketPrefixes(map)
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => isUnder(path, prefix));
  if (prefixed !== undefined)
    return `Write the path inside the market, without ${prefixed.prefix}: the shop adds the visitor's market. For another market's page, write its full URL.`;
  return undefined;
}

/** A redirect's referenced page or post (the plugin's `to.reference`, populated or not). */
export type RedirectReference = { relationTo: "pages" | "posts"; id: number };

/** A `redirects` document as Payload stores it, as far as a redirect needs it. */
export type StoredRedirect = {
  from?: unknown;
  type?: unknown;
  to?: { type?: unknown; reference?: unknown; url?: unknown } | null;
};

/** The page or post a stored redirect sends to, when it sends to one. */
export function referenceOf(doc: StoredRedirect): RedirectReference | undefined {
  if (doc.to?.type !== "reference") return undefined;
  const reference = doc.to.reference as { relationTo?: unknown; value?: unknown } | null;
  const { relationTo, value } = reference ?? {};
  if (relationTo !== "pages" && relationTo !== "posts") return undefined;
  const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof id === "number" ? { relationTo, id } : undefined;
}

/**
 * A stored redirect as an entry, with `paths` giving a referenced page's or post's address in each
 * language. `undefined` for one that cannot redirect (no `from`, no target), which the save checks
 * never let through but an old row might hold.
 */
export function storedEntry(
  doc: StoredRedirect,
  paths: (reference: RedirectReference) => Record<string, string> | undefined,
): RedirectEntry | undefined {
  const { from, type } = doc;
  if (typeof from !== "string" || from === "") return undefined;
  if (!(REDIRECT_TYPES as readonly unknown[]).includes(type)) return undefined;
  const reference = referenceOf(doc);
  if (reference !== undefined) {
    const found = paths(reference);
    return found === undefined
      ? undefined
      : { from, type: type as RedirectType, to: { paths: found } };
  }
  const url = doc.to?.url;
  if (doc.to?.type !== "custom" || typeof url !== "string" || url === "") return undefined;
  return { from, type: type as RedirectType, to: { url } };
}
