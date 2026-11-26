import { createHmac, timingSafeEqual } from "node:crypto";

// M7 D147 (T110): the page's title on the market's generated share picture (`share-image/route.tsx`).
// The title travels in the picture's address, signed, so the route draws only titles the shop's own
// pages named: an unsigned or altered one is drawn without its title (the market's card), and nobody
// can have the shop's host draw text of their choosing. The key is `STOREFRONT_SIGNING_SECRET`
// (D142), under a label of its own, so a signature here is never one of the signed address's
// (`lib/security/client-signature.ts`). Without the secret the pictures carry no title.

/** A longer title is cut here before it is signed: the picture has room for about three lines. */
export const SHARE_TITLE_MAX = 120;

const LABEL = "shopblok-share-title:v1";

/** The title as the picture draws it: one line of text, at most `SHARE_TITLE_MAX` characters. */
export function shareTitleText(title: string): string {
  const flat = title.replace(/\s+/g, " ").trim();
  return flat.length <= SHARE_TITLE_MAX ? flat : `${flat.slice(0, SHARE_TITLE_MAX - 1).trimEnd()}…`;
}

function signature(market: string, title: string, secret: string): string {
  return createHmac("sha256", secret).update(`${LABEL}\n${market}\n${title}`).digest("base64url");
}

/**
 * The query string that puts `title` on the market's picture (`?title=…&sig=…`), or `""` without a
 * title or a secret.
 */
export function shareTitleQuery(
  market: string,
  title: string | undefined,
  secret: string | undefined,
): string {
  const key = secret?.trim() ?? "";
  const text = title === undefined ? "" : shareTitleText(title);
  if (key === "" || text === "") return "";
  const query = new URLSearchParams({ title: text, sig: signature(market, text, key) });
  return `?${query.toString()}`;
}

/** The title an address names for the market's picture, if its signature is this shop's. */
export function verifiedShareTitle(
  market: string,
  params: URLSearchParams,
  secret: string | undefined,
): string | undefined {
  const key = secret?.trim() ?? "";
  const title = params.get("title");
  const given = params.get("sig");
  if (key === "" || title === null || given === null || title === "") return undefined;
  const expected = Buffer.from(signature(market, title, key));
  const received = Buffer.from(given);
  return expected.length === received.length && timingSafeEqual(expected, received)
    ? title
    : undefined;
}

/**
 * What the picture's route draws for an address's query (PR 155's review): the market's card for
 * no query, the title for exactly a `title` and a `sig` this shop signed, and `"redirect"` for
 * anything else (an altered or unsigned title, a parameter more, a name twice). The CDN keys its
 * cache by the whole address, so drawing for any query would let `?x=1`, `?x=2`… each cost a render
 * and a cache slot; the route sends those to the bare address instead, so only the card and the
 * shop's own titles are ever drawn.
 */
export function shareImageQuery(
  market: string,
  params: URLSearchParams,
  secret: string | undefined,
): { title: string | undefined } | "redirect" {
  const names = [...params.keys()];
  if (names.length === 0) return { title: undefined };
  if (names.length !== 2 || !names.includes("title") || !names.includes("sig")) return "redirect";
  const title = verifiedShareTitle(market, params, secret);
  return title === undefined ? "redirect" : { title };
}
