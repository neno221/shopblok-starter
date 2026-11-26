// Two rules that doctor copies from the backend, checked against the backend's own code so that a
// change there fails a test here (T14). The backend is loaded in place: `tsc` refuses a static import
// of it (TS1287, its package is CommonJS to TypeScript; see load-exports.ts), and it has no build
// output to import instead. This file has its own test file so that a failure to load Medusa's
// framework fails these tests and not the pure ones around them.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { configChecks } from "./doctor-checks.ts";
import { getIntegrationStatus, type AppEnvs, type IntegrationId } from "@shopblok/integrations";

const backendFile = (name: string) =>
  pathToFileURL(path.resolve(import.meta.dirname, "../../apps/backend/src/config", name)).href;

type Env = Record<string, string | undefined>;
const { buildModules } = (await import(backendFile("modules.ts"))) as {
  buildModules: (env: Env) => unknown;
};
const { sentryDsn } = (await import(
  pathToFileURL(path.resolve(import.meta.dirname, "../../apps/backend/src/lib/sentry.ts")).href
)) as { sentryDsn: (env: Env) => string | undefined };
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

  it("holds for every integration: M6's done-when (SPEC §17.1, T103)", () => {
    expect(getIntegrationStatus(none).filter((status) => !status.wired)).toEqual([]);
  });
});

/** A value each backend key takes in the cases below: shaped as the key's real value, never a key. */
const SAMPLE: Record<string, string> = {
  STRIPE_API_KEY: "sk_test_gate",
  STRIPE_WEBHOOK_SECRET: "ci-stand-in-webhook-secret",
  RESEND_API_KEY: "re_gate",
  RESEND_FROM_EMAIL: "shop@example.com",
  POSTHOG_EVENTS_API_KEY: "phc_gate",
  SENTRY_DSN: "https://gate@o1.ingest.de.sentry.io/1",
  MEILISEARCH_HOST: "http://localhost:7701",
  MEILISEARCH_API_KEY: "gate",
  REDIS_URL: "redis://localhost:6380",
  S3_ENDPOINT: "https://gate.r2.cloudflarestorage.com",
  S3_ACCESS_KEY_ID: "gate",
  S3_SECRET_ACCESS_KEY: "gate",
  S3_BUCKET: "shopblok-gate",
  S3_PRIVATE_BUCKET: "shopblok-gate-private",
  S3_PUBLIC_URL: "https://media.example.com",
};

/** The backend's keys of an integration, as the integrations table names them, with SAMPLE's values. */
function backendKeys(id: IntegrationId): Env {
  const status = getIntegrationStatus(none).find((each) => each.id === id)!;
  const keys = status.parts
    .filter((part) => part.app === "backend")
    .flatMap((part) => part.missing);
  return Object.fromEntries(
    keys.map((key) => {
      const value = SAMPLE[key];
      if (value === undefined) throw new Error(`SAMPLE has no value for ${id}'s ${key}`);
      return [key, value];
    }),
  );
}

type Entry = { resolve?: string; options?: { providers?: { resolve?: string }[] } };
/** Every `resolve` of the module list, the providers' too: `@medusajs/medusa/payment > …/payment-stripe`. */
const resolves = (modules: unknown): string[] =>
  (modules as Entry[]).flatMap((entry) => [
    entry.resolve ?? "",
    ...(entry.options?.providers ?? []).map((provider) => `${entry.resolve} > ${provider.resolve}`),
  ]);

// T103 (M6 §5, step 1): one case per integration. With its backend keys (the integrations table's,
// so a key renamed in one place and not the other fails here), the backend registers the
// integration's module, or for Sentry starts its SDK (`instrumentation.ts` calls `startSentry` only
// when `sentryDsn` finds the DSN); with every key but one, and with none, it does not.
const REGISTERS: Record<IntegrationId, (env: Env) => boolean> = {
  stripe: (env) =>
    resolves(buildModules(env)).includes(
      "@medusajs/medusa/payment > @medusajs/medusa/payment-stripe",
    ),
  resend: (env) =>
    resolves(buildModules(env)).includes("@medusajs/medusa/notification > ./src/modules/resend"),
  posthog: (env) =>
    resolves(buildModules(env)).includes(
      "@medusajs/medusa/analytics > @medusajs/medusa/analytics-posthog",
    ),
  sentry: (env) => sentryDsn(env) !== undefined,
  meilisearch: (env) =>
    resolves(buildModules(env)).includes(
      "@medusajs/medusa/search > ./src/modules/meilisearch-search",
    ),
  redis: (env) => {
    const list = resolves(buildModules(env));
    return [
      "event-bus-redis",
      "workflow-engine-redis",
      "locking > @medusajs/medusa/locking-redis",
    ].every((name) => list.some((each) => each.endsWith(name)));
  },
  r2: (env) =>
    resolves(buildModules(env)).includes("@medusajs/medusa/file > ./src/modules/r2-file"),
};

describe("each integration turns on through its keys alone (T103)", () => {
  it.each(getIntegrationStatus(none).map((status) => status.id))("%s", (id) => {
    const keys = backendKeys(id);
    const names = Object.keys(keys);
    expect(names.length, `${id} has backend keys`).toBeGreaterThan(0);
    expect(REGISTERS[id](keys), `${id} with ${names.join(", ")}`).toBe(true);
    // So its entry must say it is wired, or doctor would call a live provider a fallback.
    expect(
      getIntegrationStatus(none).find((status) => status.id === id)?.wired,
      `${id} wired`,
    ).toBe(true);
    expect(REGISTERS[id]({}), `${id} without its keys`).toBe(false);
    for (const left of names) {
      const half = Object.fromEntries(Object.entries(keys).filter(([key]) => key !== left));
      expect(REGISTERS[id](half), `${id} without ${left}`).toBe(false);
    }
    // And its keys turn on nothing of the others'.
    for (const other of getIntegrationStatus(none).map((status) => status.id)) {
      if (other !== id) expect(REGISTERS[other](keys), `${id}'s keys turn on ${other}`).toBe(false);
    }
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
