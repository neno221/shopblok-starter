import { getPayloadClient } from "../cms/payload";
import type { MarketsGlobal } from "./global";

/**
 * Reads the `markets` global through Payload's Local API (D10). The Local API is not subject to
 * access by default, so this works for the storefront while the REST read of `markets` stays
 * staff-only (SETUP.md, T09 item 9).
 *
 * Only `get-market-map.ts` imports this. Tests don't: Vitest has no `@payload-config` alias.
 */
export async function loadMarketsGlobal(): Promise<MarketsGlobal> {
  const payload = await getPayloadClient();
  return payload.findGlobal({ slug: "markets", depth: 0 });
}
