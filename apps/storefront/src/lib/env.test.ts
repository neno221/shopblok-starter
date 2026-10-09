import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MEDUSA_BACKEND_URL, env, EnvError, isProduction, medusaEnv } from "./env";

const KEY = "pk_3c101e19ff02cb898eb71f6e20ccca7c4f824b84522d9a36b2ba9e19b6ffba30";

afterEach(() => vi.unstubAllEnvs());

describe("medusaEnv", () => {
  it("returns the URL and the key it is given", async () => {
    await expect(
      medusaEnv({
        MEDUSA_BACKEND_URL: "https://api.example.com",
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
      }),
    ).resolves.toEqual({ backendUrl: "https://api.example.com", publishableKey: KEY });
  });

  it("uses the local backend outside production when no URL is set, blank included", async () => {
    for (const NODE_ENV of [undefined, "development", "test"]) {
      for (const MEDUSA_BACKEND_URL of [undefined, "", "  "]) {
        const settings = await medusaEnv({
          NODE_ENV,
          MEDUSA_BACKEND_URL,
          NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY,
        });
        expect(settings.backendUrl).toBe(DEFAULT_MEDUSA_BACKEND_URL);
      }
    }
  });

  it("requires the URL in production, where a localhost default would be a silent mistake", async () => {
    const call = medusaEnv({ NODE_ENV: "production", NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY });
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
      medusaEnv({ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "apk_01M4HCF3X63H0EHYYS3V03H4ZT" }),
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
        medusaEnv({ MEDUSA_BACKEND_URL, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: KEY }),
      ).rejects.toThrow(/MEDUSA_BACKEND_URL must be an http\(s\) URL/);
    }
  });

  it("reports every problem at once", async () => {
    const message = await medusaEnv({ NODE_ENV: "production", MEDUSA_BACKEND_URL: "nope" }).then(
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
      "MEDUSA_BACKEND_URL",
      "NEXT_PHASE",
      "NEXT_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      "NODE_ENV",
      "PAYLOAD_DATABASE_URL",
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
