/**
 * Links in the e-mails the backend sends (T44, D64): `STOREFRONT_URL`, the market's prefix, a path
 * and its query. The storefront passes the market's public prefix in the request's `metadata.market`
 * (what `marketPrefix` in `apps/storefront/src/lib/markets/url.ts` gives: `""`, `/us`, `/ch/fr`),
 * because only the storefront has the market map (Payload's `markets` global): the backend cannot
 * turn a market key into a prefix itself.
 *
 * The prefix comes from the client, so only the shape a prefix can have is accepted: up to two
 * lower-case segments of two or three letters. Anything else, or none, is the primary market's
 * (no prefix), so a link can never point at another path or host. A market on its own domain
 * (SPEC §8.5) is not handled yet: its link goes to `STOREFRONT_URL`.
 */
const PREFIX = /^(?:\/[a-z]{2,3}){0,2}$/;

export function marketPrefixFrom(metadata: unknown): string {
  const market = (metadata as { market?: unknown } | null | undefined)?.market;

  return typeof market === "string" && PREFIX.test(market) ? market : "";
}

/**
 * `{STOREFRONT_URL}{prefix}{path}?{query}`, or `undefined` when `STOREFRONT_URL` is not an http(s)
 * URL (`localhost:8000` parses as a URL whose scheme is `localhost:`).
 */
export function storefrontLink(
  storefrontUrl: string | undefined,
  metadata: unknown,
  path: `/${string}`,
  query: Record<string, string>,
): string | undefined {
  let base: URL;

  try {
    base = new URL(storefrontUrl ?? "");
  } catch {
    return undefined;
  }

  if (base.protocol !== "http:" && base.protocol !== "https:") return undefined;

  const url = new URL(
    `${base.pathname.replace(/\/+$/, "")}${marketPrefixFrom(metadata)}${path}`,
    base.origin,
  );

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
