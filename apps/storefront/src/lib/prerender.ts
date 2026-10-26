import { env, type RawEnv } from "./env";

// Which product pages `next build` renders (D58). With `MEDUSA_BACKEND_URL` set, the build asks
// Medusa for the first `STOREFRONT_PRERENDER_PRODUCTS` handles in handle order (500 by default), so
// which products a build left out is known: the rest render on their first request. Without it (D10's
// stand-in rule: CI's design-system job and `check` build with no `.env`) the build asks nothing and
// renders one placeholder, which the page answers with a 404 before it reads anything; with it set,
// a Medusa that does not answer fails the build and says so. Cache Components refuse a dynamic
// segment whose `generateStaticParams` returns nothing, so a cap of 0 renders the placeholder too.

/** The handle of the one page a build without Medusa renders; never a Medusa handle (D58). */
export const PLACEHOLDER_HANDLE = "__shopblok-stand-in__";

export const DEFAULT_PRERENDER_PRODUCTS = 500;

/** `STOREFRONT_PRERENDER_PRODUCTS` as a count: a whole number from 0, the default when unset. */
export function prerenderCap(source: RawEnv = env): number {
  const raw = source.STOREFRONT_PRERENDER_PRODUCTS?.trim();
  if (raw === undefined || raw === "") return DEFAULT_PRERENDER_PRODUCTS;
  if (!/^\d+$/.test(raw))
    throw new Error(`STOREFRONT_PRERENDER_PRODUCTS must be a whole number from 0, not "${raw}"`);
  return Number(raw);
}

/** Whether the build may ask Medusa: D10's rule, `MEDUSA_BACKEND_URL` set. */
export function buildReadsMedusa(source: RawEnv = env): boolean {
  return (source.MEDUSA_BACKEND_URL?.trim() ?? "") !== "";
}

/**
 * The PDP's `generateStaticParams` handles: the placeholder alone without Medusa or with a cap of 0,
 * else the first `cap` handles `list` gives (handle order, D58).
 */
export async function productHandlesToPrerender(
  list: (limit: number) => Promise<string[]>,
  source: RawEnv = env,
): Promise<string[]> {
  const cap = prerenderCap(source);
  if (!buildReadsMedusa(source) || cap === 0) return [PLACEHOLDER_HANDLE];
  let handles: string[];
  try {
    handles = await list(cap);
  } catch (error) {
    throw new Error(
      `The product pages' generateStaticParams could not read Medusa at ${source.MEDUSA_BACKEND_URL} (D58: a build with MEDUSA_BACKEND_URL set needs Medusa up; unset it to build with the stand-in)`,
      { cause: error },
    );
  }
  return handles.length > 0 ? handles.slice(0, cap) : [PLACEHOLDER_HANDLE];
}
