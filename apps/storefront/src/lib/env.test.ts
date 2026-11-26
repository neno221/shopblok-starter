import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MEDUSA_BACKEND_URL,
  deploymentBaseUrl,
  deployEnv,
  designSystemBuildFlag,
  designSystemEnabled,
  e2eRoutesEnabled,
  env,
  EnvError,
  firstUserClosed,
  isProduction,
  medusaEnv,
  previewOrigins,
  protectionBypassHeaders,
} from "./env";
import { siteOrigin } from "./site-origin";

const KEY = "pk_3c101e19ff02cb898eb71f6e20ccca7c4f824b84522d9a36b2ba9e19b6ffba30";

afterEach(() => vi.unstubAllEnvs());

describe("medusaEnv", () => {
  it("returns the URL and the key it is given", async () => {
    await expect(
      medusaEnv({
        MEDUSA_BACKEND_URL: "https://api.example.com",
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
      }),
    ).resolves.toEqual({
      backendUrl: "https://api.example.com",
      publishableKey: KEY,
    });
  });

  it("uses the local backend outside production when no URL is set, blank included", async () => {
    for (const NODE_ENV of [undefined, "development", "test"]) {
      for (const MEDUSA_BACKEND_URL of [undefined, "", "  "]) {
        const settings = await medusaEnv({
          NODE_ENV,
          MEDUSA_BACKEND_URL,
          NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
        });
        // The literal, not the constant: `pnpm dev` and `.env.example` run the backend on 9000.
        expect(settings.backendUrl).toBe("http://localhost:9000");
        expect(settings.backendUrl).toBe(DEFAULT_MEDUSA_BACKEND_URL);
      }
    }
  });

  it("requires the URL in production, where a localhost default would be a silent mistake", async () => {
    const call = medusaEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
    });
    await expect(call).rejects.toThrow(EnvError);
    await expect(call).rejects.toThrow(/MEDUSA_BACKEND_URL is required in production/);
  });

  it("names the variable and the remedy when the key is missing or blank", async () => {
    for (const value of [undefined, "", "   "]) {
      await expect(medusaEnv({ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: value })).rejects.toThrow(
        /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is empty.*pnpm bootstrap.*print-publishable-key/s,
      );
    }
  });

  it("refuses the key's id (apk_…) in place of its token (pk_…)", async () => {
    await expect(
      medusaEnv({
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "apk_01M4HCF3X63H0EHYYS3V03H4ZT",
      }),
    ).rejects.toThrow(/not its id \(apk_…\)/);
  });

  it("refuses a backend URL that is not http(s)", async () => {
    for (const MEDUSA_BACKEND_URL of [
      "localhost:9000",
      "ftp://x.example",
      "javascript:alert(1)",
      "nope",
    ]) {
      await expect(
        medusaEnv({
          MEDUSA_BACKEND_URL,
          NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
        }),
      ).rejects.toThrow(/MEDUSA_BACKEND_URL must be an http\(s\) URL/);
    }
  });

  it("reports every problem at once", async () => {
    const message = await medusaEnv({
      NODE_ENV: "production",
      MEDUSA_BACKEND_URL: "nope",
    }).then(
      () => "",
      (error: Error) => error.message,
    );
    expect(message).toMatch(/MEDUSA_BACKEND_URL must be an http\(s\) URL/);
    expect(message).toMatch(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is empty/);
  });

  it("reads the real environment by default", async () => {
    vi.stubEnv("MEDUSA_BACKEND_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", KEY);
    await expect(medusaEnv()).resolves.toEqual({
      backendUrl: "https://api.example.com",
      publishableKey: KEY,
    });
  });
});

describe("env", () => {
  it("is a live view: a change to the environment shows at once (the fallback rule reads NEXT_PHASE per call)", () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    expect(env.NEXT_PHASE).toBe("phase-production-build");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    expect(env.NEXT_PHASE).toBe("phase-production-server");
  });

  it("exposes exactly the variables the app reads", () => {
    expect(Object.keys(env).sort()).toEqual([
      "CRON_SECRET",
      "CSP_MODE",
      "DEPLOY_ENV",
      "DESIGN_SYSTEM_ENABLED",
      "E2E_TEST_ROUTES",
      "MEDUSA_BACKEND_URL",
      "NEXT_PHASE",
      "NEXT_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "NODE_ENV",
      "PAYLOAD_DATABASE_URL",
      "PAYLOAD_SECRET",
      "PREVIEW_SECRET",
      "REVALIDATE_SECRET",
      "S3_PRIVATE_BUCKET",
      "SEED_ADMIN_EMAIL",
      "SEED_ON_BUILD",
      "SHOPBLOK_CSP_HEADER",
      "SHOPBLOK_CSP_NONCE_POLICY",
      "SHOPBLOK_CSP_POLICY",
      "SHOPBLOK_SECRET_FINGERPRINTS",
      "STOREFRONT_BUILD_WORKERS",
      "STOREFRONT_LISTING_PAGE_SIZE",
      "STOREFRONT_PRERENDER_PRODUCTS",
      "STOREFRONT_SIGNING_SECRET",
      "TURNSTILE_SECRET_KEY",
      "VERCEL_AUTOMATION_BYPASS_SECRET",
      "VERCEL_BRANCH_URL",
      "VERCEL_ENV",
      "VERCEL_PROJECT_PRODUCTION_URL",
      "VERCEL_URL",
    ]);
  });
});

describe("isProduction", () => {
  it("is true for NODE_ENV=production only", () => {
    expect(isProduction({ NODE_ENV: "production" })).toBe(true);
    for (const NODE_ENV of [undefined, "development", "test", "staging"]) {
      expect(isProduction({ NODE_ENV })).toBe(false);
    }
  });
});

describe("deployEnv (M7 D133's order)", () => {
  it.each([
    [{}, undefined],
    [{ NODE_ENV: "development" }, undefined],
    [{ NODE_ENV: "production" }, "production"],
    [{ VERCEL_ENV: "development", NODE_ENV: "production" }, undefined],
    [{ VERCEL_ENV: "production", NODE_ENV: "production" }, "production"],
    [{ VERCEL_ENV: "preview", NODE_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: "staging", NODE_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: "staging", VERCEL_ENV: "production" }, "staging"],
    [{ DEPLOY_ENV: " production " }, "production"],
    [{ DEPLOY_ENV: "", NODE_ENV: "production" }, "production"],
    // A preview is staging even with DEPLOY_ENV=production set for every Vercel environment.
    [{ DEPLOY_ENV: "production", VERCEL_ENV: "preview", NODE_ENV: "production" }, "staging"],
  ] as const)("%o is %s", (source, expected) => {
    expect(deployEnv(source)).toBe(expected);
  });

  it("throws for any other DEPLOY_ENV, naming it", () => {
    for (const DEPLOY_ENV of ["prod", "Staging", "preview", "development"]) {
      expect(() => deployEnv({ DEPLOY_ENV, NODE_ENV: "production" })).toThrow(EnvError);
    }
    expect(() => deployEnv({ DEPLOY_ENV: "prod" })).toThrow('(it is "prod")');
  });

  it("reads the real environment by default", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DEPLOY_ENV", "production");
    expect(deployEnv()).toBe("staging");
  });
});

describe("e2eRoutesEnabled (the gate of the test-only routes)", () => {
  it("is on for the exact value `true` and nothing else", () => {
    expect(e2eRoutesEnabled({ E2E_TEST_ROUTES: "true" })).toBe(true);
    for (const E2E_TEST_ROUTES of [undefined, "", "1", "TRUE", "True", "yes", " true", "false"]) {
      expect(e2eRoutesEnabled({ E2E_TEST_ROUTES })).toBe(false);
    }
  });

  it("is off when nothing sets it, and reads the real environment by default", () => {
    vi.stubEnv("E2E_TEST_ROUTES", "");
    expect(e2eRoutesEnabled()).toBe(false);
    vi.stubEnv("E2E_TEST_ROUTES", "true");
    expect(e2eRoutesEnabled()).toBe(true);
  });

  it("stays off on a production deployment by name, and opens on a preview (M0's F6, M7 D133)", () => {
    const on = { E2E_TEST_ROUTES: "true", NODE_ENV: "production" };
    expect(e2eRoutesEnabled({ ...on, DEPLOY_ENV: "production" })).toBe(false);
    expect(e2eRoutesEnabled({ ...on, VERCEL_ENV: "production" })).toBe(false);
    expect(e2eRoutesEnabled({ ...on, VERCEL_ENV: "production", DEPLOY_ENV: "staging" })).toBe(
      false,
    );
    expect(e2eRoutesEnabled({ ...on, VERCEL_ENV: "preview" })).toBe(true);
    // PR 147 review, item 3: a mistyped DEPLOY_ENV fails closed.
    for (const DEPLOY_ENV of ["prod", "Production", " production "])
      expect(e2eRoutesEnabled({ ...on, DEPLOY_ENV }), DEPLOY_ENV).toBe(false);
    expect(e2eRoutesEnabled({ ...on, DEPLOY_ENV: "staging" })).toBe(true);
    expect(e2eRoutesEnabled({ ...on, NODE_ENV: "production" })).toBe(true);
    expect(e2eRoutesEnabled({ ...on, VERCEL_ENV: "preview", DEPLOY_ENV: "production" })).toBe(true);
    // CI's servers: a production build with neither name.
    expect(e2eRoutesEnabled(on)).toBe(true);
    expect(e2eRoutesEnabled({ ...on, DEPLOY_ENV: "staging" })).toBe(true);
  });
});

describe("designSystemEnabled (the gate of the design-system pages, D33)", () => {
  it("is on in `next dev`, whatever the flag says", () => {
    for (const DESIGN_SYSTEM_ENABLED of [undefined, "", "false", "true"]) {
      expect(designSystemEnabled({ NODE_ENV: "development", DESIGN_SYSTEM_ENABLED })).toBe(true);
    }
  });

  it("is on in a production build only for the exact value `true`", () => {
    expect(
      designSystemEnabled({
        NODE_ENV: "production",
        DESIGN_SYSTEM_ENABLED: "true",
      }),
    ).toBe(true);
    for (const DESIGN_SYSTEM_ENABLED of [
      undefined,
      "",
      "1",
      "TRUE",
      "True",
      "yes",
      " true",
      "false",
    ]) {
      expect(
        designSystemEnabled({ NODE_ENV: "production", DESIGN_SYSTEM_ENABLED }),
        `DESIGN_SYSTEM_ENABLED=${String(DESIGN_SYSTEM_ENABLED)}`,
      ).toBe(false);
    }
  });

  it("is off for a production build with no flag and for an unknown NODE_ENV without it", () => {
    expect(designSystemEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(designSystemEnabled({})).toBe(false);
    expect(designSystemEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("reads the real environment by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    expect(designSystemEnabled()).toBe(false);
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    expect(designSystemEnabled()).toBe(true);
  });
});

describe("designSystemBuildFlag (what next.config.ts freezes into the bundle, D33)", () => {
  it("is `true` only for the exact value `true`, and `false` for everything else", () => {
    expect(designSystemBuildFlag({ DESIGN_SYSTEM_ENABLED: "true" })).toBe("true");
    for (const DESIGN_SYSTEM_ENABLED of [undefined, "", "1", "TRUE", " true", "false", "yes"]) {
      expect(designSystemBuildFlag({ DESIGN_SYSTEM_ENABLED }), String(DESIGN_SYSTEM_ENABLED)).toBe(
        "false",
      );
    }
  });

  it("does not look at NODE_ENV: `next dev` has its own rule in designSystemEnabled", () => {
    expect(designSystemBuildFlag({ NODE_ENV: "development" })).toBe("false");
  });

  it("reads the real environment by default", () => {
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
    expect(designSystemBuildFlag()).toBe("true");
    vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
    expect(designSystemBuildFlag()).toBe("false");
  });
});

describe("deploymentBaseUrl (M7 D136, T114)", () => {
  it("keeps NEXT_PUBLIC_BASE_URL when it is set", () => {
    expect(
      deploymentBaseUrl({
        NEXT_PUBLIC_BASE_URL: "https://shop.example",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "x.vercel.app",
      }),
    ).toBe("https://shop.example");
  });

  it("on a preview, is its branch domain, else its own", () => {
    expect(
      deploymentBaseUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "shopblok-git-feature-team.vercel.app",
        VERCEL_URL: "shopblok-abc123-team.vercel.app",
      }),
    ).toBe("https://shopblok-git-feature-team.vercel.app");
    expect(
      deploymentBaseUrl({ VERCEL_ENV: "preview", VERCEL_URL: "shopblok-abc123-team.vercel.app" }),
    ).toBe("https://shopblok-abc123-team.vercel.app");
  });

  it("on Production, is the project's Production domain", () => {
    expect(
      deploymentBaseUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "shopblok-starter.vercel.app",
        VERCEL_BRANCH_URL: "shopblok-git-main-team.vercel.app",
      }),
    ).toBe("https://shopblok-starter.vercel.app");
  });

  it("is undefined off Vercel, so siteOrigin falls back to the local one", () => {
    expect(deploymentBaseUrl({})).toBeUndefined();
    expect(deploymentBaseUrl({ VERCEL_ENV: "development", VERCEL_URL: "x" })).toBeUndefined();
  });

  it("is what Payload's serverURL becomes on a preview build (siteOrigin's default)", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "shopblok-git-feature-team.vercel.app");
    expect(siteOrigin()).toBe("https://shopblok-git-feature-team.vercel.app");
  });
});

describe("previewOrigins (PR 149's review, 6)", () => {
  it("on a preview, are its deployment's and its branch's addresses", () => {
    expect(
      previewOrigins({
        VERCEL_ENV: "preview",
        VERCEL_URL: "shopblok-abc123-team.vercel.app",
        VERCEL_BRANCH_URL: "shopblok-git-feature-team.vercel.app/",
      }),
    ).toEqual([
      "https://shopblok-abc123-team.vercel.app",
      "https://shopblok-git-feature-team.vercel.app",
    ]);
  });

  it("are none on Production or off Vercel", () => {
    expect(previewOrigins({ VERCEL_ENV: "production", VERCEL_URL: "x.vercel.app" })).toEqual([]);
    expect(previewOrigins({})).toEqual([]);
  });
});

describe("protectionBypassHeaders (M7 D136)", () => {
  it("sends Vercel's bypass header only with the secret", () => {
    expect(protectionBypassHeaders({})).toEqual({});
    expect(protectionBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "s3cr3t" })).toEqual({
      "x-vercel-protection-bypass": "s3cr3t",
    });
  });
});

describe("firstUserClosed (M7 D136, 6)", () => {
  it("is closed whenever DEPLOY_ENV or VERCEL_ENV is set", () => {
    expect(firstUserClosed({})).toBe(false);
    expect(firstUserClosed({ NODE_ENV: "production" })).toBe(false);
    expect(firstUserClosed({ DEPLOY_ENV: "staging" })).toBe(true);
    expect(firstUserClosed({ VERCEL_ENV: "development" })).toBe(true);
  });
});
