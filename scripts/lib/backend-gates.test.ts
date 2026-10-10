// Two rules that doctor copies from the backend, checked against the backend's own code so that a
// change there fails a test here (T14). The backend is loaded in place: `tsc` refuses a static import
// of it (TS1287, its package is CommonJS to TypeScript; see load-exports.ts), and it has no build
// output to import instead. This file has its own test file so that a failure to load Medusa's
// framework fails these tests and not the pure ones around them.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { configChecks } from "./doctor-checks.ts";
import { getIntegrationStatus, type AppEnvs } from "./integrations.ts";

const backendFile = (name: string) =>
  pathToFileURL(path.resolve(import.meta.dirname, "../../apps/backend/src/config", name)).href;

type Env = Record<string, string | undefined>;
const { buildModules } = (await import(backendFile("modules.ts"))) as {
  buildModules: (env: Env) => unknown;
};
const { getSecret } = (await import(backendFile("config.ts"))) as {
  getSecret: (env: Env, key: string) => string | undefined;
};

const none: AppEnvs = { backend: {}, storefront: {} };

describe("wired", () => {
  // `wired` is a hand-kept flag per integration. `buildModules` is where the backend really switches
  // a provider on (`has(env, ...)`), so an integration whose backend keys change the modules it
  // registers must be marked wired; otherwise doctor keeps calling a live provider a fallback.
  it("is set for every integration whose backend keys change the modules the backend registers", () => {
    const empty = JSON.stringify(buildModules({}));
    for (const status of getIntegrationStatus(none)) {
      const env = Object.fromEntries(
        status.parts
          .filter((part) => part.app === "backend")
          .flatMap((part) => part.missing)
          .map((key) => [key, "x"]),
      );
      const changesModules = JSON.stringify(buildModules(env)) !== empty;
      if (changesModules) {
        expect(status.wired, `${status.id} is switched on by buildModules`).toBe(true);
      }
    }
  });

  it("holds for Redis, the one integration wired in M0", () => {
    const live = getIntegrationStatus(none).filter((status) => status.wired);
    expect(live.map((status) => status.id)).toEqual(["redis"]);
    expect(JSON.stringify(buildModules({ REDIS_URL: "redis://x" }))).not.toBe(
      JSON.stringify(buildModules({})),
    );
  });
});

describe("blank secrets", () => {
  // Doctor says a blank JWT_SECRET is an error when the backend would refuse to start with it
  // (`getSecret` keeps a blank value outside NODE_ENV "", development and test) and a warning when
  // Medusa would fall back to its default.
  it.each([undefined, "", "development", "test", "staging", "preview", "production", "Production"])(
    "doctor and the backend agree about NODE_ENV=%j",
    (nodeEnv) => {
      const backendRefuses = getSecret({ NODE_ENV: nodeEnv, JWT_SECRET: "" }, "JWT_SECRET") === "";
      const checks = configChecks(none, getIntegrationStatus(none), {
        nodeEnv: nodeEnv === "" ? undefined : nodeEnv,
        vercel: false,
      });
      const secrets = checks.find((check) => check.id === "secrets");
      expect(secrets?.level === "error").toBe(backendRefuses);
    },
  );
});
