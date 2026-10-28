import { buildPublicUrl } from "../markets/url";
import type { Market, MarketMap } from "../markets/types";
import { CMS_PATHS } from "./paths";

/** A custom link's URL may be a path in the market, or an https, mailto or tel link. */
export function isSafeLinkUrl(value: string): boolean {
  const url = value.trim();
  if (url !== value || url === "") return false;
  if (url.startsWith("/")) return !url.startsWith("//") && !url.includes("\\");
  try {
    return ["https:", "mailto:", "tel:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** A `link` field's value as Payload stores it (depth 1: a reference is its document). */
export type LinkValue = {
  type?: "reference" | "custom" | null;
  reference?: { relationTo: string; value: unknown } | null;
  url?: string | null;
  label?: string | null;
  newTab?: boolean | null;
  appearance?: string | null;
};

/** How a collection's document becomes a path inside a market (`/products/shirt`). */
export type InternalPaths = Record<string, (doc: Record<string, unknown>) => string | null>;

export type ResolvedLink = {
  href: string;
  label: string | null;
  newTab: boolean;
  /** `noopener noreferrer` for a new tab (SPEC §7.5). */
  rel?: string;
  appearance: string | null;
};

/**
 * A `link` field's value as an `href` in the current market (SPEC §7.5): a custom path and an
 * internal reference both go through `buildPublicUrl`, so the same link points at `/us/sale` in
 * the US market and `/sale` in Cyprus. An unsafe URL, a reference to a document that is gone or
 * not loaded, or a collection with no path yet gives `null`, and the caller leaves the link out.
 * The paths are `CMS_PATHS`, the ones live preview uses too; a test can pass its own.
 */
export function resolveLink(
  value: LinkValue | null | undefined,
  { market, map, paths = CMS_PATHS }: { market: Market; map: MarketMap; paths?: InternalPaths },
): ResolvedLink | null {
  if (value == null) return null;
  let href: string | null = null;
  if (value.type === "reference") {
    const target = value.reference;
    const doc = target?.value;
    const path =
      target && doc !== null && typeof doc === "object"
        ? (paths[target.relationTo]?.(doc as Record<string, unknown>) ?? null)
        : null;
    href = path === null ? null : buildPublicUrl(market, path, map);
  } else if (typeof value.url === "string" && isSafeLinkUrl(value.url)) {
    href = value.url.startsWith("/") ? buildPublicUrl(market, value.url, map) : value.url;
  }
  if (href === null) return null;
  const newTab = value.newTab === true;
  return {
    href,
    label: value.label ?? null,
    newTab,
    ...(newTab ? { rel: "noopener noreferrer" } : {}),
    appearance: value.appearance ?? null,
  };
}
