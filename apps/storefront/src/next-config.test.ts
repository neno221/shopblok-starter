import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

// D62: next-intl's plugin gives Turbopack its `next-intl/config` alias, and the alias is the request
// configuration that reads the `[market]` root param. Without it, `getTranslations` fails at run
// time with "Couldn't find next-intl config file", on the first page that calls it.
describe("next.config.ts wires next-intl to the request configuration", () => {
  it("aliases next-intl/config to src/i18n/request.ts, relative to this app", () => {
    const aliases = config(PHASE_PRODUCTION_BUILD).turbopack?.resolveAlias;
    expect(aliases?.["next-intl/config"]).toBe("./src/i18n/request.ts");
    expect(existsSync(fileURLToPath(new URL("./i18n/request.ts", import.meta.url)))).toBe(true);
  });

  it("keeps what the other wrappers set: the monorepo root, Cache Components, the flag", () => {
    const built = config(PHASE_PRODUCTION_BUILD);
    expect(built.turbopack?.root).toBe(fileURLToPath(new URL("../../../", import.meta.url)));
    expect(built.cacheComponents).toBe(true);
    expect(built.env).toHaveProperty("DESIGN_SYSTEM_ENABLED");
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
    "/api.json", // the matcher skips both by its file rule, not as Payload's or `/next`'s
    "/next.js",
  ])("rewrites %s", async (url) => {
    expect(await rewriteOf(url)).toBe("/next/missing-file");
  });

  // A dynamic page's RSC payload, as a deployment adapter can address it (PR 50 review).
  it.each(["/us.rsc", "/us.RSC"])("leaves %s to `[market]`", async (url) => {
    expect(await rewriteOf(url)).toBeUndefined();
  });

  it.each(storefrontPaths)("leaves the storefront path %s to the proxy", async (url) => {
    expect(await rewriteOf(url)).toBeUndefined();
  });

  it.each(pathsLeftAlone)(
    "agrees with the proxy's file rule on %s: a root file is rewritten, nothing else",
    async (url) => {
      // The file rule itself, on one segment: a last segment ending in `.` and a letter.
      const rootFile = /^\/[^/?]*\.[A-Za-z][A-Za-z0-9]*$/.test(url) && !/\.rsc$/i.test(url);
      expect(await rewriteOf(url)).toBe(rootFile ? "/next/missing-file" : undefined);
    },
  );
});
