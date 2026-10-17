import { PHASE_PRODUCTION_BUILD } from "next/constants";
import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../next.config";
import { pathsLeftAlone, storefrontPaths } from "./test-support/proxy-urls";

afterEach(() => vi.unstubAllEnvs());

// D33: under Cache Components a build without the flag renders every DS path but one on request
// (`dynamicParams = false` is a build error there), so the gate must be a constant in the bundle,
// not a read of the runtime environment. `next.config.ts`'s `env` is what makes it one; without
// the entry, a server started with the flag would answer 200 for the unlisted paths.
describe("next.config.ts freezes the design-system flag into the build", () => {
  it("writes `true` for a build with the flag and `false` for one without", () => {
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    expect(config(PHASE_PRODUCTION_BUILD).env).toMatchObject({ DESIGN_SYSTEM_ENABLED: "true" });
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      vi.stubEnv("DESIGN_SYSTEM_ENABLED", value);
      expect(config(PHASE_PRODUCTION_BUILD).env, String(value)).toMatchObject({
        DESIGN_SYSTEM_ENABLED: "false",
      });
    }
  });

  it("always sets a string, so the read is never left to run time", () => {
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", undefined);
    expect(typeof config(PHASE_PRODUCTION_BUILD).env?.DESIGN_SYSTEM_ENABLED).toBe("string");
  });
});

/** Where `next.config.ts` rewrites `url` to (its path), or `undefined` when it does not. */
async function rewriteOf(url: string): Promise<string | undefined> {
  const response = await unstable_getResponseFromNextConfig({
    url: `https://example.com${url}`,
    nextConfig: config(PHASE_PRODUCTION_BUILD),
  });
  const rewritten = getRewrittenUrl(response);
  return rewritten === null ? undefined : new URL(rewritten).pathname;
}

// The paths the proxy's matcher leaves alone for a reason other than its file rule. One of them at
// the root is Payload's, the DS's, `/next`'s, or Next's or Vercel's, and is no file.
const ownedByOthers = /^\/(?:admin|api|design-system|next|_next|_vercel|\.well-known)(?:[/?]|$)/;

// D54 (T28): the rewrite takes a root path the proxy's matcher skips as a file, and nothing else.
// The helper checks the config's patterns only, not the files: `/favicon.ico` is rewritten here, but
// Next serves its file route first (`afterFiles`), which `markets.spec.ts` checks on `next start`.
describe("next.config.ts sends a root file that nothing serves to /next/missing-file", () => {
  it.each([
    "/robots.txt",
    "/sitemap.xml",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    "/wp-login.php",
  ])("rewrites %s", async (url) => {
    expect(await rewriteOf(url)).toBe("/next/missing-file");
  });

  it.each(storefrontPaths)("leaves the storefront path %s to the proxy", async (url) => {
    expect(await rewriteOf(url)).toBeUndefined();
  });

  it.each(pathsLeftAlone)(
    "agrees with the proxy's file rule on %s: a root file is rewritten, nothing else",
    async (url) => {
      const rootFile = /^\/[^/?]+$/.test(url) && !ownedByOthers.test(url);
      expect(await rewriteOf(url)).toBe(rootFile ? "/next/missing-file" : undefined);
    },
  );
});
