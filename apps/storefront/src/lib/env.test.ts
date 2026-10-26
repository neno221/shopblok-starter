import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MEDUSA_BACKEND_URL,
  designSystemBuildFlag,
  designSystemEnabled,
  e2eRoutesEnabled,
  env,
  EnvError,
  isProduction,
  medusaEnv,
} from "./env";

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
      "DESIGN_SYSTEM_ENABLED",
      "E2E_TEST_ROUTES",
      "MEDUSA_BACKEND_URL",
      "NEXT_PHASE",
      "NEXT_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      "NODE_ENV",
      "PAYLOAD_DATABASE_URL",
      "REVALIDATE_SECRET",
      "STOREFRONT_PRERENDER_PRODUCTS",
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
