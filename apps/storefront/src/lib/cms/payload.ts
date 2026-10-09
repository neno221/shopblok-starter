import type { Payload } from "payload";

/**
 * Payload's Local API. Payload and its config load on the first call, not when a module imports
 * this, so a page that never reads the CMS (or a build with no database) pays nothing. Not
 * imported by tests: Vitest has no `@payload-config` alias (`lib/markets/payload-loader.ts` is the
 * same).
 */
export async function getPayloadClient(): Promise<Payload> {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ]);
  return getPayload({ config });
}
