import { describe, expect, it } from "vitest";
import {
  classifyPayloadAuth,
  classifySearchField,
  configChecks,
  explainMedusaFailure,
  explainMedusaRun,
  medusaMarketsCheck,
  meilisearchLocalesCheck,
  orphanRegions,
  orphanRegionsCheck,
  productionStage,
  payloadAuthCheck,
  readLocales,
  readMeilisearchStats,
  readRegions,
  searchCurrencies,
  searchFieldOf,
  searchIndexCheck,
  type Context,
  type LiveRegion,
  resendDomainCheck,
  resendDomainState,
  senderDomain,
  emptyEnvelope,
  parseSentryDsn,
  sentryEnvelopeCheck,
  POSTHOG_EU,
  posthogFlagsCheck,
  posthogHost,
} from "./doctor-checks.ts";
import type { HttpResult } from "./http.ts";
import { getIntegrationStatus, type AppEnvs } from "@shopblok/integrations";

const dev: Context = { nodeEnv: undefined, vercel: false };

/** The two `.env` files after `pnpm bootstrap`. */
const bootstrapped: AppEnvs = {
  backend: {
    JWT_SECRET: "j",
    COOKIE_SECRET: "c",
    REDIS_URL: "redis://localhost:6380",
    MEDUSA_FF_CACHING: "true",
    PAYLOAD_API_KEY: "k",
    PAYLOAD_SERVER_URL: "http://localhost:8000",
    STOREFRONT_SIGNING_SECRET: "g",
  },
  storefront: {
    PAYLOAD_SECRET: "p",
    PREVIEW_SECRET: "v",
    CRON_SECRET: "r",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_0123",
    STOREFRONT_SIGNING_SECRET: "g",
  },
};

const run = (envs: AppEnvs, context: Context = dev) =>
  configChecks(envs, getIntegrationStatus(envs), context);
const find = (checks: ReturnType<typeof run>, id: string) => checks.find((c) => c.id === id);

describe("configChecks: a keyless setup after bootstrap", () => {
  const checks = run(bootstrapped);

  it("warns only about email verification", () => {
    expect(checks.filter((c) => c.level !== "ok" && c.level !== "note").map((c) => c.id)).toEqual([
      "email-verification",
    ]);
    // Bootstrap leaves the backend's CRON_SECRET blank: `next dev`'s timer publishes (T111).
    expect(checks.filter((c) => c.level === "note").map((c) => c.id)).toEqual([
      "payload-jobs-tick",
    ]);
  });

  it("the email-verification warning names the missing Resend key", () => {
    const check = find(checks, "email-verification");
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("Sign-up requires email verification");
    expect(check?.message).toContain("no Resend key");
    expect(check?.fix).toContain("RESEND_API_KEY");
  });

  it("is ok on the secrets, the publishable key and the Payload key", () => {
    for (const id of ["secrets", "publishable-key", "payload-key"]) {
      expect(find(checks, id)?.level).toBe("ok");
    }
  });
});

describe("configChecks: Stripe's live keys outside production (M6 D115)", () => {
  // Short on purpose: `pnpm check:keys` matches a key of 16 characters or more after its prefix.
  const withStripe = (backend: Record<string, string>, storefront: Record<string, string>) =>
    run({
      backend: { ...bootstrapped.backend, ...backend },
      storefront: { ...bootstrapped.storefront, ...storefront },
    });

  it("says nothing about test keys", () => {
    const checks = withStripe(
      { STRIPE_API_KEY: "sk_test_fake", STRIPE_WEBHOOK_SECRET: "stand-in" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_test_fake" },
    );
    expect(find(checks, "stripe-live-key")).toBeUndefined();
  });

  it("errors on a live secret, restricted or publishable key in development, naming only the variable", () => {
    for (const [backend, storefront, named] of [
      [{ STRIPE_API_KEY: "sk_live_fake" }, {}, "apps/backend: STRIPE_API_KEY"],
      [{ STRIPE_API_KEY: " rk_live_fake" }, {}, "apps/backend: STRIPE_API_KEY"],
      [{}, { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake" }, "apps/storefront: NEXT_PUBLIC_STRIPE_KEY"],
    ] as const) {
      const check = find(withStripe(backend, storefront), "stripe-live-key");
      expect(check?.level).toBe("error");
      expect(check?.details).toEqual([`${named} is a live key (NODE_ENV not set)`]);
      expect(JSON.stringify(check)).not.toContain("_live_fake");
    }
  });

  it("errors in a test run, and allows live keys where that app's NODE_ENV is production", () => {
    expect(
      find(withStripe({ STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "test" }, {}), "stripe-live-key")
        ?.level,
    ).toBe("error");
    const production = withStripe(
      { STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "production" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake" },
    );
    expect(find(production, "stripe-live-key")?.details).toEqual([
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY is a live key (NODE_ENV not set)",
    ]);
    const both = withStripe(
      { STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "production" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake", NODE_ENV: "production" },
    );
    expect(find(both, "stripe-live-key")).toBeUndefined();
  });

  it("on Vercel, allows live keys only where VERCEL_ENV is production, whatever NODE_ENV says", () => {
    const preview = withStripe(
      { STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "production", VERCEL_ENV: "preview" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake", NODE_ENV: "production", VERCEL_ENV: "preview" },
    );
    expect(find(preview, "stripe-live-key")?.details).toEqual([
      "apps/backend: STRIPE_API_KEY is a live key (VERCEL_ENV preview)",
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY is a live key (VERCEL_ENV preview)",
    ]);
    const production = withStripe(
      { STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "production", VERCEL_ENV: "production" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake", NODE_ENV: "production", VERCEL_ENV: "production" },
    );
    expect(find(production, "stripe-live-key")).toBeUndefined();
  });

  it("refuses live keys on staging, which runs as production on both platforms (M7 D133)", () => {
    const staging = withStripe(
      { STRIPE_API_KEY: "sk_live_fake", NODE_ENV: "production", DEPLOY_ENV: "staging" },
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake", VERCEL_ENV: "production", DEPLOY_ENV: "staging" },
    );
    expect(find(staging, "stripe-live-key")?.details).toEqual([
      "apps/backend: STRIPE_API_KEY is a live key (DEPLOY_ENV staging)",
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY is a live key (DEPLOY_ENV staging)",
    ]);
  });

  it("refuses them on a preview even with DEPLOY_ENV=production set for every environment", () => {
    const preview = withStripe(
      {},
      { NEXT_PUBLIC_STRIPE_KEY: "pk_live_fake", VERCEL_ENV: "preview", DEPLOY_ENV: "production" },
    );
    expect(find(preview, "stripe-live-key")?.details).toEqual([
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY is a live key (VERCEL_ENV preview, over DEPLOY_ENV production)",
    ]);
  });

  it("allows them with DEPLOY_ENV=production, and refuses them with an invalid DEPLOY_ENV", () => {
    expect(
      find(
        withStripe({ STRIPE_API_KEY: "sk_live_fake", DEPLOY_ENV: "production" }, {}),
        "stripe-live-key",
      ),
    ).toBeUndefined();
    expect(
      find(
        withStripe(
          { STRIPE_API_KEY: "sk_live_fake", DEPLOY_ENV: "prod", NODE_ENV: "production" },
          {},
        ),
        "stripe-live-key",
      )?.level,
    ).toBe("error");
  });
});

describe("productionStage: D133's order (M7)", () => {
  it.each([
    // [env, stage, production, said]
    [{}, undefined, false, "NODE_ENV not set"],
    [{ NODE_ENV: "development" }, undefined, false, "NODE_ENV development"],
    [{ NODE_ENV: "production" }, "production", true, "NODE_ENV production"],
    [{ VERCEL_ENV: "development" }, undefined, false, "VERCEL_ENV development"],
    [
      { VERCEL_ENV: "production", NODE_ENV: "production" },
      "production",
      true,
      "VERCEL_ENV production",
    ],
    [{ VERCEL_ENV: "preview", NODE_ENV: "production" }, "staging", false, "VERCEL_ENV preview"],
    [{ DEPLOY_ENV: "staging", NODE_ENV: "production" }, "staging", false, "DEPLOY_ENV staging"],
    [{ DEPLOY_ENV: " production " }, "production", true, "DEPLOY_ENV production"],
    // Staging's Vercel deployment is Vercel's Production one: DEPLOY_ENV wins over VERCEL_ENV.
    [{ DEPLOY_ENV: "staging", VERCEL_ENV: "production" }, "staging", false, "DEPLOY_ENV staging"],
    // A preview is staging even when DEPLOY_ENV=production was set for every environment.
    [
      { DEPLOY_ENV: "production", VERCEL_ENV: "preview", NODE_ENV: "production" },
      "staging",
      false,
      "VERCEL_ENV preview, over DEPLOY_ENV production",
    ],
  ] as const)("%o is %s", (env, stage, production, said) => {
    expect(productionStage(env)).toEqual({ stage, production, said });
  });

  it("calls any other DEPLOY_ENV invalid, and never production", () => {
    expect(productionStage({ DEPLOY_ENV: "prod", NODE_ENV: "production" })).toEqual({
      stage: undefined,
      production: false,
      said: "DEPLOY_ENV prod",
      invalid: "prod",
    });
  });
});

describe("configChecks: DEPLOY_ENV (M7 D133)", () => {
  const withEnv = (backend: Record<string, string>, storefront: Record<string, string>) =>
    run({
      backend: { ...bootstrapped.backend, ...backend },
      storefront: { ...bootstrapped.storefront, ...storefront },
    });

  it("says nothing in development", () => {
    expect(find(withEnv({}, {}), "deploy-env")).toBeUndefined();
  });

  it("says which deployment each app runs as once one is named", () => {
    const check = find(
      withEnv({ DEPLOY_ENV: "staging" }, { DEPLOY_ENV: "staging", VERCEL_ENV: "production" }),
      "deploy-env",
    );
    expect(check?.level).toBe("ok");
    expect(check?.message).toBe(
      "apps/backend runs as staging (DEPLOY_ENV staging); apps/storefront runs as staging (DEPLOY_ENV staging)",
    );
  });

  it("is an error for a value that is neither staging nor production", () => {
    const check = find(withEnv({ DEPLOY_ENV: "Staging" }, {}), "deploy-env");
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual(['apps/backend: DEPLOY_ENV is "Staging"']);
  });
});

describe("configChecks: the test-only routes (M0's F6, M7 D133)", () => {
  const storefront = (env: Record<string, string>) =>
    find(
      run({
        backend: bootstrapped.backend,
        storefront: { ...bootstrapped.storefront, E2E_TEST_ROUTES: "true", ...env },
      }),
      "e2e-test-routes",
    );

  it("is an error on a production deployment by name", () => {
    for (const env of [
      { DEPLOY_ENV: "production" },
      { VERCEL_ENV: "production" },
      { VERCEL_ENV: "production", DEPLOY_ENV: "staging" },
      { DEPLOY_ENV: "production", NODE_ENV: "production" },
    ] as Record<string, string>[]) {
      expect(storefront(env)?.level, JSON.stringify(env)).toBe("error");
    }
  });

  it("is allowed on a Vercel preview, whatever DEPLOY_ENV says", () => {
    expect(storefront({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBeUndefined();
    expect(storefront({ VERCEL_ENV: "preview", DEPLOY_ENV: "production" })).toBeUndefined();
  });

  it("warns on any other production build, and says nothing in development or when off", () => {
    expect(storefront({ NODE_ENV: "production" })?.level).toBe("warn");
    expect(storefront({ NODE_ENV: "production", DEPLOY_ENV: "staging" })?.level).toBe("warn");
    expect(storefront({})).toBeUndefined();
    expect(storefront({ E2E_TEST_ROUTES: "false", DEPLOY_ENV: "production" })).toBeUndefined();
  });
});

describe("configChecks: CSP_MODE (M7 D140, T106)", () => {
  const storefront = (env: Record<string, string>) =>
    find(
      run({ backend: bootstrapped.backend, storefront: { ...bootstrapped.storefront, ...env } }),
      "csp-mode",
    );

  it("says nothing when blank or enforce", () => {
    expect(storefront({})).toBeUndefined();
    expect(storefront({ CSP_MODE: "enforce" })).toBeUndefined();
  });

  it("is an error for any other value", () => {
    const check = storefront({ CSP_MODE: "off" });
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual(["apps/storefront: CSP_MODE=off"]);
  });

  it("is an accepted note for report-only on staging, and a warning elsewhere", () => {
    expect(storefront({ CSP_MODE: "report-only", DEPLOY_ENV: "staging" })?.level).toBe("note");
    expect(storefront({ CSP_MODE: "report-only", VERCEL_ENV: "preview" })?.level).toBe("note");
    const production = storefront({ CSP_MODE: "report-only", DEPLOY_ENV: "production" });
    expect(production?.level).toBe("warn");
    expect(production?.message).toContain("on production");
    expect(storefront({ CSP_MODE: "report-only" })?.level).toBe("warn");
  });
});

describe("configChecks: email verification", () => {
  const resendKeys = { RESEND_API_KEY: "re_x", RESEND_FROM_EMAIL: "shop@example.com" };

  it("with the backend's keys, Resend delivers them (T98), whatever the storefront has", () => {
    for (const storefront of [
      { ...bootstrapped.storefront, ...resendKeys },
      bootstrapped.storefront,
    ]) {
      const check = find(
        run({ backend: { ...bootstrapped.backend, ...resendKeys }, storefront }),
        "email-verification",
      );
      expect(check?.level).toBe("ok");
      expect(check?.message).toContain("Resend delivers");
    }
  });

  it("without the backend's keys, the links are only in the console", () => {
    const check = find(
      run({
        backend: bootstrapped.backend,
        storefront: { ...bootstrapped.storefront, ...resendKeys },
      }),
      "email-verification",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("no Resend key");
  });
});

describe("configChecks: the publishable key", () => {
  it("missing is a warning that says to build again", () => {
    const check = find(
      run({ backend: bootstrapped.backend, storefront: { PAYLOAD_SECRET: "p" } }),
      "publishable-key",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set");
    expect(check?.fix).toContain("build the storefront again");
  });

  it("a blank value is missing", () => {
    expect(
      find(
        run({ ...bootstrapped, storefront: { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "  " } }),
        "publishable-key",
      )?.level,
    ).toBe("warn");
  });

  it("the id of the key (apk_) is an error: it is not the token", () => {
    const check = find(
      run({ ...bootstrapped, storefront: { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "apk_01XYZ" } }),
      "publishable-key",
    );
    expect(check?.level).toBe("error");
    expect(check?.message).toContain("does not start with `pk_`");
  });

  it("never prints the key", () => {
    const check = find(run(bootstrapped), "publishable-key");
    expect(JSON.stringify(check)).not.toContain("pk_0123");
  });
});

describe("configChecks: the Payload integrations key", () => {
  it("warns when the key is not in the backend env", () => {
    const check = find(
      run({ ...bootstrapped, backend: { ...bootstrapped.backend, PAYLOAD_API_KEY: "" } }),
      "payload-key",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toBe(
      "PAYLOAD_API_KEY is not set in the backend, so the Medusa → Payload sync could not sign in to Payload.",
    );
  });

  it("names both when both are missing", () => {
    const check = find(run({ backend: {}, storefront: {} }), "payload-key");
    expect(check?.message).toContain("PAYLOAD_API_KEY and PAYLOAD_SERVER_URL are not set");
  });
});

describe("configChecks: Vercel without S3", () => {
  const vercel: Context = { nodeEnv: "production", vercel: true };

  it("warns when the environment looks like Vercel and has no S3_* keys", () => {
    const check = find(run(bootstrapped, vercel), "vercel-storage");
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("looks like Vercel");
    expect(check?.details?.[0]).toContain("S3_ENDPOINT");
  });

  it("is ok when the storefront has them", () => {
    const keys = {
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "b",
      S3_PUBLIC_URL: "https://media.example.com",
      // Payload's CSV exports and imports (M7 D148, 2).
      S3_PRIVATE_BUCKET: "p",
    };
    const checks = run(
      { ...bootstrapped, storefront: { ...bootstrapped.storefront, ...keys } },
      vercel,
    );
    expect(find(checks, "vercel-storage")?.level).toBe("ok");
  });

  it("is silent anywhere else", () => {
    expect(find(run(bootstrapped), "vercel-storage")).toBeUndefined();
  });
});

describe("configChecks: Redis in production", () => {
  const production: Context = { nodeEnv: "production", vercel: false };

  it("names the in-memory modules and the events that never leave the process", () => {
    const check = find(
      run({ ...bootstrapped, backend: { ...bootstrapped.backend, REDIS_URL: "" } }, production),
      "redis-production",
    );
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("in-memory event bus");
    expect(check?.message).toContain("Events never leave the process");
  });

  it("is silent with REDIS_URL set, and in development", () => {
    expect(find(run(bootstrapped, production), "redis-production")).toBeUndefined();
    expect(find(run({ backend: {}, storefront: {} }, dev), "redis-production")).toBeUndefined();
  });
});

describe("configChecks: Medusa's caching (M7 D149, T112)", () => {
  const backend = (env: Record<string, string>) =>
    find(run({ ...bootstrapped, backend: { ...bootstrapped.backend, ...env } }), "medusa-caching");

  it("is ok with the flag and Redis, in any case of true", () => {
    expect(backend({ MEDUSA_FF_CACHING: "true" })?.level).toBe("ok");
    expect(backend({ MEDUSA_FF_CACHING: "TRUE" })?.level).toBe("ok");
  });

  it("reads a value with spaces as off, as Medusa's isTruthy does (PR 150 review, item 1)", () => {
    const check = backend({ MEDUSA_FF_CACHING: "true ", DEPLOY_ENV: "staging" });
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual(['apps/backend: MEDUSA_FF_CACHING is "true "']);
  });

  it("warns that the flag without Redis caches nothing", () => {
    const check = backend({ MEDUSA_FF_CACHING: "true", REDIS_URL: "" });
    expect(check?.level).toBe("warn");
    expect(check?.message).toContain("nothing is cached");
  });

  it("is an accepted note off in development, and a warning off on a deployment", () => {
    expect(backend({ MEDUSA_FF_CACHING: "" })?.level).toBe("note");
    expect(backend({ MEDUSA_FF_CACHING: "false" })?.details).toEqual([
      'apps/backend: MEDUSA_FF_CACHING is "false"',
    ]);
    const staging = backend({ MEDUSA_FF_CACHING: "", DEPLOY_ENV: "staging" });
    expect(staging?.level).toBe("warn");
    expect(staging?.message).toContain("off on staging");
    expect(backend({ MEDUSA_FF_CACHING: "", DEPLOY_ENV: "production" })?.level).toBe("warn");
  });

  it("is the backend's alone", () => {
    const storefrontOnly = configChecks(
      { backend: {}, storefront: bootstrapped.storefront },
      getIntegrationStatus(
        { backend: {}, storefront: bootstrapped.storefront },
        { app: "storefront" },
      ),
      { ...dev, app: "storefront" },
    );
    expect(find(storefrontOnly, "medusa-caching")).toBeUndefined();
  });
});

describe("configChecks: secrets", () => {
  it("blank in development is a warning that points at bootstrap", () => {
    const check = find(run({ backend: {}, storefront: {} }), "secrets");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "not set: JWT_SECRET (apps/backend)",
      "not set: COOKIE_SECRET (apps/backend)",
      "not set: PAYLOAD_SECRET (apps/storefront)",
    ]);
    expect(check?.fix).toContain("pnpm bootstrap");
  });

  it("blank in production is an error", () => {
    const check = find(
      run({ backend: {}, storefront: {} }, { nodeEnv: "production", vercel: false }),
      "secrets",
    );
    expect(check?.level).toBe("error");
  });

  // The backend takes a blank secret only for NODE_ENV "", development and test
  // (`DEFAULT_SECRET_ENVS`, apps/backend/src/config/config.ts); anything else refuses to start.
  const secretsFor = (nodeEnv: string) =>
    find(run({ backend: {}, storefront: {} }, { nodeEnv, vercel: false }), "secrets");

  it.each(["staging", "preview", "Production"])("blank with NODE_ENV=%s is an error too", (env) => {
    expect(secretsFor(env)?.level).toBe("error");
    expect(secretsFor(env)?.message).toContain(`NODE_ENV is ${env}`);
  });

  it.each(["development", "test"])("blank with NODE_ENV=%s is only a warning", (env) => {
    expect(secretsFor(env)?.level).toBe("warn");
  });
});

describe("configChecks: the preview and jobs secrets (T59)", () => {
  const blank = { backend: bootstrapped.backend, storefront: { PAYLOAD_SECRET: "p" } };

  it("set after bootstrap", () => {
    expect(find(run(bootstrapped), "preview-cron-secrets")?.level).toBe("ok");
  });

  it("blank in development is a warning that names both and points at bootstrap", () => {
    const check = find(run(blank), "preview-cron-secrets");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "not set: PREVIEW_SECRET (apps/storefront)",
      "not set: CRON_SECRET (apps/storefront)",
    ]);
    expect(check?.fix).toContain("pnpm bootstrap");
  });

  it("blank in production is an error", () => {
    const check = find(
      run(blank, { nodeEnv: "production", vercel: false }),
      "preview-cron-secrets",
    );
    expect(check?.level).toBe("error");
    expect(check?.fix).toContain("whose worker calls the jobs endpoint");
  });
});

describe("configChecks: half-configured integrations", () => {
  it("warns once for each, with what is missing per app", () => {
    const checks = run({
      backend: { ...bootstrapped.backend, STRIPE_API_KEY: "sk_test_x" },
      storefront: bootstrapped.storefront,
    });
    const check = find(checks, "integration-stripe");
    expect(check?.level).toBe("warn");
    expect(check?.details).toEqual([
      "apps/backend: STRIPE_WEBHOOK_SECRET not set (payment provider)",
      "apps/storefront: NEXT_PUBLIC_STRIPE_KEY not set (Payment Element)",
    ]);
    expect(find(checks, "integration-resend")).toBeUndefined();
  });
});

describe("configChecks with an app (doctor --app, M7 D135)", () => {
  const backendOnly: AppEnvs = { backend: bootstrapped.backend, storefront: {} };
  const scoped = (envs: AppEnvs, app: "backend" | "storefront", context: Partial<Context> = {}) =>
    configChecks(envs, getIntegrationStatus(envs, { app }), { ...dev, app, ...context });
  const ids = (checks: ReturnType<typeof run>) => checks.map((check) => check.id);

  it("runs only the backend's checks, from the backend's variables alone", () => {
    const checks = scoped(backendOnly, "backend");
    expect(ids(checks)).toContain("payload-key");
    expect(ids(checks)).not.toContain("publishable-key");
    expect(ids(checks)).not.toContain("preview-cron-secrets");
    expect(find(checks, "secrets")).toMatchObject({
      level: "ok",
      message: "JWT_SECRET and COOKIE_SECRET are set.",
    });
  });

  it("runs only the storefront's checks, and finds no half-set Stripe for the other app's keys", () => {
    const envs: AppEnvs = {
      backend: {},
      storefront: { ...bootstrapped.storefront, NEXT_PUBLIC_STRIPE_KEY: "pk_test_x" },
    };
    const checks = scoped(envs, "storefront");
    expect(ids(checks)).toContain("publishable-key");
    expect(ids(checks)).not.toContain("payload-key");
    expect(ids(checks)).not.toContain("email-verification");
    expect(ids(checks)).not.toContain("integration-stripe");
    expect(find(checks, "secrets")?.message).toBe("PAYLOAD_SECRET is set.");
  });

  it("on a deployment, a blank secret is an error whatever NODE_ENV says", () => {
    const envs: AppEnvs = { backend: { DEPLOY_ENV: "staging" }, storefront: {} };
    expect(find(scoped(envs, "backend", { deployed: true }), "secrets")?.level).toBe("error");
    expect(find(scoped(envs, "backend"), "secrets")?.level).toBe("warn");
  });

  it("on a deployment, checks the fingerprints and (storefront) Payload's TLS", () => {
    const storefront = { ...bootstrapped.storefront, DEPLOY_ENV: "staging" };
    const envs: AppEnvs = {
      backend: {},
      storefront: {
        ...storefront,
        PAYLOAD_DATABASE_URL: "postgres://u:p@h.proxy.rlwy.net:1/railway",
      },
    };
    const checks = scoped(envs, "storefront", { deployed: true });
    expect(find(checks, "secret-fingerprints")?.level).toBe("error");
    expect(find(checks, "payload-database-tls")?.level).toBe("error");
    const backend = scoped({ backend: { DEPLOY_ENV: "staging" }, storefront: {} }, "backend", {
      deployed: true,
    });
    expect(find(backend, "secret-fingerprints")?.level).toBe("error");
    expect(find(backend, "payload-database-tls")).toBeUndefined();
  });

  it("without an app, adds neither the fingerprints nor the TLS check in development", () => {
    const checks = run(bootstrapped);
    expect(find(checks, "secret-fingerprints")).toBeUndefined();
    expect(find(checks, "payload-database-tls")).toBeUndefined();
  });
});

describe("classifySearchField", () => {
  const stats = (field: string) => ({
    status: 200,
    body: {
      results: [{ hits: [], facets: { [field]: { type: "stats", min: 12, max: 59, count: 8 } } }],
    },
  });

  it("a stats facet on a field the index has is present (measured on Medusa 2.21.2)", () => {
    expect(classifySearchField("min_price_eur", stats("min_price_eur"))).toEqual({
      state: "present",
    });
  });

  it("the 400 for an unknown field is missing (measured: min_price_brl before db:migrate)", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 400,
        body: {
          type: "invalid_data",
          message:
            'Unknown field "min_price_brl" used in search_options.facets on search index "product"',
        },
      }),
    ).toEqual({ state: "missing" });
  });

  it("the 400 for a currency that has a region but no index field is missing (measured: Brazil seeded, no db:migrate)", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 400,
        body: {
          type: "not_allowed",
          message: 'Field "min_price_brl" is not facetable on the postgres search provider',
        },
      }),
    ).toEqual({ state: "missing" });
  });

  it("a 200 with no facet for the field is missing too", () => {
    expect(
      classifySearchField("min_price_brl", {
        status: 200,
        body: { results: [{ hits: [], facets: {} }] },
      }),
    ).toEqual({ state: "missing" });
    expect(classifySearchField("min_price_brl", { status: 200, body: {} })).toEqual({
      state: "missing",
    });
  });

  it("a message about another currency's field does not count for this one", () => {
    for (const message of [
      'Unknown field "min_price_brl" used in search_options.facets',
      'Field "min_price_brl" is not facetable on the postgres search provider',
    ]) {
      expect(classifySearchField("min_price_eur", { status: 400, body: { message } }).state).toBe(
        "unknown",
      );
    }
  });

  it("any other answer is unknown, with what Medusa said (it may be a changed request shape)", () => {
    const result = classifySearchField("min_price_eur", {
      status: 400,
      body: { type: "invalid_data", message: "Invalid request: Field 'queries' is required" },
    });
    expect(result).toEqual({
      state: "unknown",
      detail: "HTTP 400: Invalid request: Field 'queries' is required",
    });
    expect(classifySearchField("min_price_eur", { status: 500, body: undefined })).toEqual({
      state: "unknown",
      detail: "HTTP 500",
    });
  });
});

describe("readRegions and readLocales", () => {
  it("reads the regions with the countries' ISO codes", () => {
    expect(
      readRegions({
        status: 200,
        body: {
          regions: [
            {
              name: "Europe",
              currency_code: "eur",
              countries: [{ iso_2: "cy" }, { iso_2: "fr" }],
            },
          ],
        },
      }),
    ).toEqual([{ name: "Europe", currency: "eur", countries: ["cy", "fr"] }]);
  });

  it("a 400 is the publishable key being refused", () => {
    expect(
      readRegions({
        status: 400,
        body: { type: "not_allowed", message: "A valid publishable key is required" },
      }),
    ).toBe("Medusa refused the publishable key (HTTP 400)");
    expect(readRegions({ status: 500, body: null })).toBe("HTTP 500");
    expect(readRegions({ status: 200, body: {} })).toContain("no `regions` list");
  });

  it("reads the locale codes", () => {
    expect(
      readLocales({
        status: 200,
        body: { locales: [{ code: "en-US", name: "English" }, { code: "el-GR" }] },
      }),
    ).toEqual(["en-US", "el-GR"]);
    expect(readLocales({ status: 404, body: null })).toBe("HTTP 404");
  });
});

describe("classifyPayloadAuth", () => {
  it("the integrations user is ok", () => {
    expect(
      classifyPayloadAuth({ status: 200, body: { user: { collection: "integrations" } } }),
    ).toBe("ok");
  });

  it("a user of another collection is not the integration", () => {
    expect(classifyPayloadAuth({ status: 200, body: { user: { collection: "users" } } })).toBe(
      "unknown",
    );
  });

  it("no user, or a refusal, is rejected", () => {
    expect(classifyPayloadAuth({ status: 200, body: { user: null } })).toBe("rejected");
    expect(classifyPayloadAuth({ status: 401, body: {} })).toBe("rejected");
    expect(classifyPayloadAuth({ status: 403, body: {} })).toBe("rejected");
  });

  it("anything else is unknown", () => {
    expect(classifyPayloadAuth({ status: 500, body: undefined })).toBe("unknown");
  });

  it("a 200 that is not Payload's JSON says nothing about the key (a proxy's page, another app)", () => {
    expect(classifyPayloadAuth({ status: 200, body: undefined })).toBe("unknown");
    expect(classifyPayloadAuth({ status: 200, body: null })).toBe("unknown");
    expect(classifyPayloadAuth({ status: 200, body: {} })).toBe("unknown");
  });
});

describe("explainMedusaFailure", () => {
  it("knows the causes bootstrap fixes", () => {
    expect(
      explainMedusaFailure(
        "Error: Cannot find module '@shopblok/medusa-markets/lib/overview'\nRequire stack:",
      ).cause,
    ).toBe("the markets plugin is not built");
    expect(explainMedusaFailure('error: database "medusa" does not exist').cause).toBe(
      "the medusa database does not exist",
    );
    expect(explainMedusaFailure('error: relation "market_country" does not exist').cause).toContain(
      "not migrated",
    );
    expect(
      explainMedusaFailure("password authentication failed for user postgres").cause,
    ).toContain("could not connect");
    expect(explainMedusaFailure("Error: connect ECONNREFUSED 127.0.0.1:6380").cause).toContain(
      "database or Redis",
    );
  });

  it("falls back to the last line of the log, without stack frames", () => {
    const result = explainMedusaFailure("first\nTypeError: boom\n    at foo (bar.ts:1:1)\n");
    expect(result.cause).toBe("Medusa failed: TypeError: boom");
  });

  it("copes with no output", () => {
    expect(explainMedusaFailure("").cause).toBe("Medusa failed without a message");
  });
});

describe("explainMedusaRun", () => {
  const run = { code: 1, output: "", timedOut: false };

  it("says when pnpm could not be started, not 'failed without a message'", () => {
    const why = explainMedusaRun({
      ...run,
      code: null,
      error: "spawn pnpm ENOENT",
    });
    expect(why.cause).toBe("pnpm could not be started (spawn pnpm ENOENT)");
    expect(why.fix).toContain("PATH");
  });

  it("says what Medusa asked, and that it ran out of time", () => {
    expect(explainMedusaRun({ ...run, prompt: "Continue? (y/N)" }).cause).toBe(
      'Medusa asked "Continue? (y/N)"',
    );
    expect(explainMedusaRun({ ...run, code: null, timedOut: true }).cause).toBe(
      "Medusa did not start within 90 s",
    );
  });

  it("reads the log otherwise, and names the exit when the log is empty", () => {
    expect(explainMedusaRun({ ...run, output: 'database "medusa" does not exist' }).cause).toBe(
      "the medusa database does not exist",
    );
    expect(explainMedusaRun(run).cause).toBe("Medusa failed without a message (exit code 1)");
    expect(explainMedusaRun({ ...run, code: null }).cause).toBe(
      "Medusa failed without a message (stopped by a signal)",
    );
  });
});

describe("orphanRegions", () => {
  const config = {
    currencies: ["eur", "usd"],
    regions: [
      { name: "Europe", currency: "eur", countries: ["cy", "de"] },
      { name: "United States", currency: "usd", countries: ["us"] },
    ],
    locales: ["en-US"],
  };

  it("finds a region whose countries the file no longer lists (a market taken out of config/markets.ts)", () => {
    const live = [
      { name: "Europe", currency: "eur", countries: ["cy", "de"] },
      { name: "Brazil", currency: "brl", countries: ["br"] },
    ];
    expect(orphanRegions(live, config)).toEqual([
      { name: "Brazil", currency: "brl", countries: ["br"] },
    ]);
  });

  it("an admin's rename does not hide it, or create one", () => {
    expect(
      orphanRegions([{ name: "EU shop", currency: "eur", countries: ["cy", "de"] }], config),
    ).toEqual([]);
  });

  it("a region that shares even one country with the file is not an orphan", () => {
    expect(
      orphanRegions([{ name: "Europe+", currency: "eur", countries: ["cy", "br"] }], config),
    ).toEqual([]);
  });

  it("a region with no countries is not counted", () => {
    expect(orphanRegions([{ name: "Empty", currency: "brl", countries: [] }], config)).toEqual([]);
  });
});

// ---- --online: the checks, from fabricated answers ---------------------------------------------

const json = (body: unknown, status = 200): HttpResult => ({
  kind: "response",
  status,
  text: JSON.stringify(body),
});
const refused: HttpResult = { kind: "refused" };
const timedOut: HttpResult = {
  kind: "unreachable",
  reason: "no answer within 15 s",
};

describe("payloadAuthCheck from the backend's deploy (M7 D135)", () => {
  const url = "https://staging.example.vercel.app";
  const deploy = { fromBackendDeploy: true };
  it("is an accepted note when Payload does not answer yet, and still an error when it refuses", () => {
    expect(payloadAuthCheck(url, refused, deploy).level).toBe("note");
    expect(payloadAuthCheck(url, timedOut, deploy).level).toBe("note");
    expect(payloadAuthCheck(url, json({ user: null }), deploy).level).toBe("error");
    expect(payloadAuthCheck(url, json({ errors: [] }, 401), deploy).level).toBe("error");
    expect(payloadAuthCheck(url, json({ errors: [] }, 403), deploy).level).toBe("error");
  });

  it("is a note before Vercel's first deployment, whose address answers 404 (PR 149's review, 1)", () => {
    const notFound: HttpResult = {
      kind: "response",
      status: 404,
      text: "The deployment could not be found on Vercel.\n\nDEPLOYMENT_NOT_FOUND",
    };
    const check = payloadAuthCheck(url, notFound, deploy);
    expect(check.level).toBe("note");
    expect(check.message).toContain("answered HTTP 404, not Payload");
    expect(payloadAuthCheck(url, notFound).level).toBe("error");
  });

  it("is ok once Payload answers as the integrations user", () => {
    expect(
      payloadAuthCheck(url, json({ user: { collection: "integrations" } }), deploy).level,
    ).toBe("ok");
  });
});

describe("payloadAuthCheck", () => {
  const url = "http://localhost:8000";

  it("warns when there was no URL or key to ask with", () => {
    expect(payloadAuthCheck(url, undefined)).toMatchObject({
      id: "payload-auth",
      level: "warn",
      fix: "Run `pnpm bootstrap`.",
    });
  });

  it("warns, naming the reason, when Payload does not answer", () => {
    expect(payloadAuthCheck(url, refused).message).toBe(
      "not checked: http://localhost:8000 is not running.",
    );
    expect(payloadAuthCheck(url, timedOut).message).toContain("does not answer (no answer");
  });

  it("is ok for the integrations user", () => {
    const answer = json({ user: { collection: "integrations" } });
    expect(payloadAuthCheck(url, answer).level).toBe("ok");
  });

  it("blames the key only when Payload says it does not know it", () => {
    const rejected = payloadAuthCheck(url, json({ user: null }));
    expect(rejected.level).toBe("error");
    expect(rejected.message).toContain("does not accept PAYLOAD_API_KEY");
    expect(rejected.fix).toContain("pnpm bootstrap");
  });

  it("blames the address, not the key, for a 200 that is not Payload's JSON", () => {
    const html: HttpResult = {
      kind: "response",
      status: 200,
      text: "<html>Welcome</html>",
    };
    const check = payloadAuthCheck(url, html);
    expect(check.level).toBe("error");
    expect(check.message).toBe(`GET ${url}/api/integrations/me answered HTTP 200, not a user.`);
    expect(check.message).not.toContain("PAYLOAD_API_KEY");
    expect(check.fix).toContain("PAYLOAD_SERVER_URL");
  });
});

describe("medusaMarketsCheck", () => {
  const url = "http://localhost:9000";
  const regions = json({
    regions: [
      { name: "Europe", currency_code: "eur", countries: [{ iso_2: "cy" }] },
      { name: "Brazil", currency_code: "brl", countries: [{ iso_2: "br" }] },
    ],
  });
  const locales = json({ locales: [{ code: "el-GR" }, { code: "pt-BR" }] });

  it("warns that nothing was asked when the storefront has no publishable key", () => {
    const { check, regions: live } = medusaMarketsCheck(url, undefined);
    expect(check).toMatchObject({ id: "medusa-markets", level: "warn" });
    expect(live).toBeUndefined();
  });

  it("warns, and goes no further, when Medusa does not answer", () => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions: refused, locales });
    expect(check.message).toBe("not checked: Medusa at http://localhost:9000 is not running.");
    expect(live).toBeUndefined();
  });

  it("is an error when Medusa refuses the key", () => {
    const refusedKey = json({ message: "x" }, 400);
    const { check } = medusaMarketsCheck(url, { regions: refusedKey, locales });
    expect(check.level).toBe("error");
    expect(check.message).toContain("Medusa refused the publishable key");
  });

  it("is ok when the regions and the locales answer, and hands the regions on", () => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions, locales });
    expect(check).toEqual({
      id: "medusa-markets",
      title: "Medusa answers the storefront's key",
      level: "ok",
      message: "2 regions and 2 locales answer the storefront's key.",
    });
    expect(live).toHaveLength(2);
  });

  // T75 review, item 6: `marketsCheck` compares the map with the regions and the store's locales;
  // this check no longer takes the map, so a gap is reported once, by that one.
  it("does not compare with the map: a store with no locales still answers", () => {
    const { check } = medusaMarketsCheck(url, { regions, locales: json({ locales: [] }) });
    expect(check).toMatchObject({ level: "ok", message: expect.stringContaining("0 locales") });
    expect(check.details).toBeUndefined();
  });

  // Found by the review of T14: the whole check used to vanish when /store/locales failed.
  it.each([
    ["HTTP 404", json({ message: "Not found" }, 404), "HTTP 404"],
    ["a timeout", timedOut, "Medusa does not answer (no answer within 15 s)"],
    ["a refusal", refused, "Medusa is not running"],
  ])("still reports, with the reason, when /store/locales fails with %s", (_name, bad, reason) => {
    const { check, regions: live } = medusaMarketsCheck(url, { regions, locales: bad });
    expect(check).toMatchObject({ id: "medusa-markets", level: "warn" });
    expect(check.details?.join("\n")).toContain(reason);
    expect(live).toHaveLength(2);
  });
});

describe("orphanRegionsCheck and searchCurrencies", () => {
  const europe: LiveRegion = { name: "Europe", currency: "eur", countries: ["cy"] };
  const brazil: LiveRegion = { name: "Brazil", currency: "brl", countries: ["br"] };
  const germany: LiveRegion = { name: "Germany", currency: "eur", countries: ["de"] };

  it("is silent with no leftover region, and names each leftover one", () => {
    expect(orphanRegionsCheck([])).toBeUndefined();
    const check = orphanRegionsCheck([brazil]);
    expect(check).toMatchObject({ id: "medusa-orphans", level: "warn" });
    expect(check?.message).toContain("a region");
    expect(check?.details).toEqual(['"Brazil" (brl): br']);
    expect(orphanRegionsCheck([brazil, europe])?.message).toContain("regions that");
  });

  it("asks about the currencies of the regions in the file, not of a leftover one", () => {
    expect(searchCurrencies([europe, brazil], [brazil])).toEqual(["eur"]);
  });

  it("keeps a currency that a leftover region shares with one in the file", () => {
    expect(searchCurrencies([europe, germany], [germany])).toEqual(["eur"]);
  });

  it("asks once about a currency two regions share, and never about a blank one", () => {
    const blank: LiveRegion = { name: "Odd", currency: "", countries: ["xx"] };
    expect(searchCurrencies([europe, germany, blank], [])).toEqual(["eur"]);
  });
});

describe("searchFieldOf and searchIndexCheck", () => {
  const present = { state: "present" } as const;
  const missing = { state: "missing" } as const;

  it("reads the field of the currency out of Medusa's answer", () => {
    const facets = json({
      results: [{ facets: { min_price_eur: { type: "stats" } } }],
    });
    expect(searchFieldOf("eur", facets)).toEqual({ state: "present" });
    expect(searchFieldOf("brl", facets)).toEqual({ state: "missing" });
    expect(searchFieldOf("eur", refused)).toEqual({
      state: "unknown",
      detail: "Medusa did not answer",
    });
  });

  it("is ok, naming the currencies, when every field is there", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: present },
      { currency: "usd", state: present },
    ]);
    expect(check).toMatchObject({ id: "search-index", level: "ok" });
    expect(check.message).toBe("min_price_<currency> exists for eur, usd.");
  });

  it("warns about the currencies the index lacks, and says to migrate", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: present },
      { currency: "brl", state: missing },
    ]);
    expect(check.level).toBe("warn");
    expect(check.message).toContain(
      "regions in brl, but the search index has no price fields for it",
    );
    expect(check.fix).toContain("medusa db:migrate");
  });

  it("warns, with what Medusa said, when the answer does not tell", () => {
    const check = searchIndexCheck([
      { currency: "eur", state: { state: "unknown", detail: "HTTP 500" } },
    ]);
    expect(check.level).toBe("warn");
    expect(check.details).toEqual(["eur: HTTP 500"]);
  });

  // Found by the review of T14: an empty list used to give a green tick for "exists for .".
  it("does not vouch for a currency list that is empty", () => {
    const check = searchIndexCheck([]);
    expect(check.level).toBe("warn");
    expect(check.message).toContain("not checked");
    expect(check.message).not.toContain("exists for");
  });
});

describe("meilisearchLocalesCheck (T94)", () => {
  const host = "http://localhost:7701";
  const locales = json({ locales: [{ code: "en-US" }, { code: "el-GR" }] });
  const stats = (indexes: Record<string, number>) =>
    json({
      indexes: Object.fromEntries(
        Object.entries(indexes).map(([uid, n]) => [uid, { numberOfDocuments: n }]),
      ),
    });
  const run = (over: Partial<Parameters<typeof meilisearchLocalesCheck>[0]>) =>
    meilisearchLocalesCheck({ host, prefix: undefined, locales, stats: stats({}), ...over });

  it("is ok when the newest version has documents for every store locale", () => {
    const check = run({
      stats: stats({
        "product_v2__en-US": 8,
        "product_v2__el-GR": 8,
        // The previous version, kept by Medusa after the swap, does not count.
        "product_v1__en-US": 8,
      }),
    });
    expect(check).toMatchObject({ id: "search-locales", level: "ok" });
    expect(check.message).toContain("product_v2");
  });

  it("warns for a store locale with no index, or an empty one, in the newest version", () => {
    const missing = run({ stats: stats({ "product_v3__en-US": 8, "product_v2__el-GR": 8 }) });
    expect(missing.level).toBe("warn");
    expect(missing.message).toContain("el-GR");
    expect(missing.details).toEqual(["no index product_v3__el-GR"]);

    expect(missing.message).toContain("searches the default locale's index");

    // An index that exists answers alone: empty or short, it misses products (PR 139's review, 3).
    const empty = run({ stats: stats({ "product_v3__en-US": 8, "product_v3__el-GR": 0 }) });
    expect(empty.details).toEqual(["product_v3__el-GR: 0 of 8"]);
    expect(empty.message).toContain("miss products");
    expect(empty.message).not.toContain("default locale");
    const short = run({ stats: stats({ "product_v3__en-US": 8, "product_v3__el-GR": 1 }) });
    expect(short).toMatchObject({ level: "warn", details: ["product_v3__el-GR: 1 of 8"] });
  });

  it("reads only the indexes of MEILISEARCH_INDEX_PREFIX", () => {
    const indexes = stats({
      "shop_product_v1__en-US": 3,
      "shop_product_v1__el-GR": 3,
      "product_v9__en-US": 1,
    });
    expect(run({ prefix: "shop", stats: indexes }).level).toBe("ok");
    expect(run({ stats: indexes }).details).toEqual(["no index product_v9__el-GR"]);
  });

  it("warns when there is no product index at all", () => {
    const check = run({ stats: stats({ movies: 4 }) });
    expect(check.level).toBe("warn");
    expect(check.message).toContain("no product index");
  });

  it("is an error when Meilisearch refuses the key, and a warning when it does not answer", () => {
    expect(run({ stats: { kind: "response", status: 403, text: "{}" } })).toMatchObject({
      level: "error",
    });
    expect(run({ stats: { kind: "refused" } }).message).toContain("not checked");
  });

  it("does not guess the store's locales", () => {
    expect(run({ locales: undefined }).message).toContain("not checked");
    expect(run({ locales: { kind: "refused" } }).message).toContain("not checked");
  });

  it("reads Meilisearch's stats", () => {
    expect(
      readMeilisearchStats({
        status: 200,
        body: { indexes: { a: { numberOfDocuments: 2 }, b: {} } },
      }),
    ).toEqual({
      a: 2,
      b: 0,
    });
    expect(readMeilisearchStats({ status: 401, body: {} })).toContain("refused");
    expect(readMeilisearchStats({ status: 200, body: {} })).toContain("no `indexes`");
  });
});

describe("--online: Resend's sender domain (T98)", () => {
  const ok = (body: unknown, status = 200): HttpResult => ({
    kind: "response",
    status,
    text: JSON.stringify(body),
  });
  const domains = ok({
    object: "list",
    has_more: false,
    data: [
      { id: "1", name: "shop.example", status: "verified" },
      { id: "2", name: "news.example", status: "pending" },
      { id: "3", name: "half.example", status: "partially_verified" },
    ],
  });
  const dev = { backend: { NODE_ENV: "development" }, storefront: { NODE_ENV: "development" } };
  const prod = { backend: { NODE_ENV: "production" }, storefront: { NODE_ENV: "production" } };

  it("reads the domain of an address, with or without a name", () => {
    expect(senderDomain("orders@Shop.Example")).toBe("shop.example");
    expect(senderDomain("Shop <orders@shop.example>")).toBe("shop.example");
    expect(senderDomain(" onboarding@resend.dev ")).toBe("resend.dev");
    expect(senderDomain("not an address")).toBeUndefined();
    expect(senderDomain("a@localhost")).toBeUndefined();
    expect(senderDomain(undefined)).toBeUndefined();
  });

  it("is ok for a verified domain, and for one whose sending is verified", () => {
    for (const from of ["orders@shop.example", "x@half.example"]) {
      const check = resendDomainCheck(["backend"], from, domains, prod);
      expect(check.level, from).toBe("ok");
      expect(check.id).toBe("resend-domain-backend");
      expect(resendDomainCheck(["backend", "storefront"], from, domains, prod)).toMatchObject({
        id: "resend-domain-backend-storefront",
        title: "Resend sender domain (apps/backend and apps/storefront)",
      });
    }
  });

  it("warns in development and fails in production for a domain not verified or not there", () => {
    for (const from of ["orders@news.example", "orders@other.example"]) {
      expect(resendDomainCheck(["storefront"], from, domains, dev).level).toBe("warn");
      expect(resendDomainCheck(["storefront"], from, domains, prod).level).toBe("error");
    }
    expect(resendDomainCheck(["backend"], "o@news.example", domains, dev).message).toContain(
      "not verified (pending)",
    );
    expect(resendDomainCheck(["backend"], "o@other.example", domains, dev).message).toContain(
      "not a domain of this Resend account",
    );
  });

  it("calls Resend's test sender out without asking Resend: a warning in development, an error in production", () => {
    const check = resendDomainCheck(["backend"], "onboarding@resend.dev", undefined, dev);
    expect(check.level).toBe("warn");
    expect(check.message).toContain("test sender");
    expect(check.fix).toMatch(/^Fine for development/);
    expect(resendDomainCheck(["backend"], "onboarding@resend.dev", undefined, prod).level).toBe(
      "error",
    );
  });

  it("takes production as the apps' stage says: a Vercel preview is development (PR 135 review, item 6)", () => {
    const preview = { storefront: { NODE_ENV: "production", VERCEL_ENV: "preview" } };
    expect(resendDomainCheck(["storefront"], "o@news.example", domains, preview).level).toBe(
      "warn",
    );
    const live = { storefront: { NODE_ENV: "production", VERCEL_ENV: "production" } };
    expect(resendDomainCheck(["storefront"], "o@news.example", domains, live).level).toBe("error");
    // One of two apps in production is enough.
    const mixed = { backend: { NODE_ENV: "production" }, storefront: { NODE_ENV: "development" } };
    expect(
      resendDomainCheck(["backend", "storefront"], "onboarding@resend.dev", undefined, mixed).level,
    ).toBe("error");
  });

  it("makes Resend's test sender an accepted note on staging, which --strict leaves alone (M7 D133)", () => {
    for (const staging of [
      { backend: { NODE_ENV: "production", DEPLOY_ENV: "staging" } },
      { backend: { VERCEL_ENV: "preview", DEPLOY_ENV: "production" } },
    ]) {
      const check = resendDomainCheck(["backend"], "onboarding@resend.dev", undefined, staging);
      expect(check.level).toBe("note");
      expect(check.fix).toMatch(/^Accepted on staging/);
    }
    // Production by name: an error, as before.
    expect(
      resendDomainCheck(["backend"], "onboarding@resend.dev", undefined, {
        backend: { NODE_ENV: "production", DEPLOY_ENV: "production" },
      }).level,
    ).toBe("error");
    // An unverified domain of your own stays a warning on staging: only the test sender is accepted.
    expect(
      resendDomainCheck(["backend"], "o@news.example", domains, {
        backend: { DEPLOY_ENV: "staging" },
      }).level,
    ).toBe("warn");
    // Staging beside production (one app each): production wins.
    expect(
      resendDomainCheck(["backend", "storefront"], "onboarding@resend.dev", undefined, {
        backend: { DEPLOY_ENV: "staging" },
        storefront: { DEPLOY_ENV: "production" },
      }).level,
    ).toBe("error");
  });

  it("is an error for a sender that is not an address", () => {
    expect(resendDomainCheck(["backend"], "Shop", domains, dev).level).toBe("error");
  });

  it("does not guess when the key can only send, or Resend does not answer", () => {
    const restricted = ok(
      {
        statusCode: 401,
        name: "restricted_api_key",
        message: "This API key is restricted to only send emails",
      },
      401,
    );
    expect(resendDomainState("shop.example", restricted)).toEqual({ kind: "restricted" });
    expect(resendDomainCheck(["backend"], "o@shop.example", restricted, prod).level).toBe("warn");
    const down: HttpResult = { kind: "unreachable", reason: "no answer within 15 s" };
    expect(resendDomainCheck(["backend"], "o@shop.example", down, prod)).toMatchObject({
      level: "warn",
      message: "not checked: Resend does not answer (no answer within 15 s).",
    });
    expect(resendDomainState("shop.example", ok({ error: "x" }, 500))).toEqual({
      kind: "unknown",
      reason: "Resend answered HTTP 500",
    });
  });
});

describe("Sentry's DSN (T96)", () => {
  const dsn = "https://0123abcd@o42.ingest.de.sentry.io/4507";
  const withDsn = (backend: string | undefined, storefront: string | undefined): AppEnvs => ({
    backend: backend === undefined ? {} : { SENTRY_DSN: backend },
    storefront: storefront === undefined ? {} : { NEXT_PUBLIC_SENTRY_DSN: storefront },
  });

  it("reads a DSN, its envelope URL and what may be printed (never the key)", () => {
    expect(parseSentryDsn(` ${dsn} `)).toEqual({
      publicKey: "0123abcd",
      envelopeUrl: "https://o42.ingest.de.sentry.io/api/4507/envelope/",
      label: "o42.ingest.de.sentry.io, project 4507",
    });
    // A self-hosted Sentry under a path, and the local sink the live spec uses.
    expect(parseSentryDsn("https://k@sentry.example.com/errors/7")?.envelopeUrl).toBe(
      "https://sentry.example.com/errors/api/7/envelope/",
    );
    expect(parseSentryDsn("http://e2e@127.0.0.1:8970/1")?.envelopeUrl).toBe(
      "http://127.0.0.1:8970/api/1/envelope/",
    );
    for (const value of [
      undefined,
      "",
      "sentry",
      "https://o42.ingest.sentry.io/4507",
      "https://k@host/abc",
    ])
      expect(parseSentryDsn(value)).toBeUndefined();
  });

  it("says nothing without a DSN or with good ones, and errors on one that is not a DSN", () => {
    const ids = (envs: AppEnvs) =>
      configChecks(envs, getIntegrationStatus(envs), { nodeEnv: undefined, vercel: false })
        .filter((check) => check.id.startsWith("sentry"))
        .map((check) => [check.id, check.level, check.details]);
    expect(ids(withDsn(undefined, undefined))).toEqual([]);
    expect(ids(withDsn(dsn, dsn))).toEqual([]);
    const checks = ids(withDsn("https://o42.ingest.sentry.io/4507", dsn));
    expect(checks).toEqual([
      ["sentry-dsn", "error", ["apps/backend: SENTRY_DSN is not https://<key>@<host>/<project>"]],
    ]);
    expect(JSON.stringify(checks)).not.toContain("o42.ingest.sentry.io/4507");
  });

  it("warns about a traces' rate that is not a rate", () => {
    const envs: AppEnvs = {
      backend: { SENTRY_TRACES_SAMPLE_RATE: "10%" },
      storefront: { SENTRY_TRACES_SAMPLE_RATE: "0.2" },
    };
    const check = configChecks(envs, getIntegrationStatus(envs), {
      nodeEnv: undefined,
      vercel: false,
    }).find((c) => c.id === "sentry-traces-rate");
    expect([check?.level, check?.details]).toEqual(["warn", ["apps/backend"]]);
  });

  it("--online: Sentry accepts the empty envelope, refuses the key, or does not answer", () => {
    const parsed = parseSentryDsn(dsn)!;
    const answer = (status: number): HttpResult => ({ kind: "response", status, text: "{}" });
    const ok = sentryEnvelopeCheck(["backend", "storefront"], parsed, answer(200));
    expect([ok.id, ok.level, ok.title]).toEqual([
      "sentry-envelope-backend-storefront",
      "ok",
      "Sentry accepts the DSN (apps/backend and apps/storefront)",
    ]);
    expect(sentryEnvelopeCheck(["backend"], parsed, answer(403)).level).toBe("error");
    expect(sentryEnvelopeCheck(["backend"], parsed, answer(404)).level).toBe("error");
    expect(sentryEnvelopeCheck(["backend"], parsed, answer(429)).level).toBe("warn");
    expect(sentryEnvelopeCheck(["backend"], parsed, { kind: "refused" }).level).toBe("warn");
    for (const status of [200, 403, 429])
      expect(
        JSON.stringify(sentryEnvelopeCheck(["backend"], parsed, answer(status))),
      ).not.toContain("0123abcd");
  });

  it("posts an envelope with a header and no item", () => {
    const envelope = emptyEnvelope(` ${dsn} `);
    expect(envelope.endsWith("\n")).toBe(true);
    expect(envelope.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(envelope)).toMatchObject({ dsn });
  });
});

describe("PostHog's keys (T97)", () => {
  // Made-up keys of the right shape: not a project of anyone's.
  const key = "phc_TestOnlyNotARealProjectKey0001";
  const other = "phc_TestOnlyNotARealProjectKey0002";
  const withKeys = (
    backend: Record<string, string>,
    storefront: Record<string, string>,
  ): AppEnvs => ({ backend, storefront });
  const posthog = (envs: AppEnvs) =>
    configChecks(envs, getIntegrationStatus(envs), dev)
      .filter((check) => check.id.startsWith("posthog"))
      .map((check) => [check.id, check.level, check.details]);

  it("says nothing without keys or with one project's key in both apps", () => {
    expect(posthog(withKeys({}, {}))).toEqual([]);
    expect(
      posthog(withKeys({ POSTHOG_EVENTS_API_KEY: key }, { NEXT_PUBLIC_POSTHOG_KEY: ` ${key} ` })),
    ).toEqual([]);
  });

  it("errors on a key that is not a project key, and never prints it", () => {
    const checks = posthog(
      withKeys(
        // Built here, so `check:keys` does not read a personal key's shape in this file.
        { POSTHOG_EVENTS_API_KEY: `phx_${"FAKE".repeat(6)}` },
        { NEXT_PUBLIC_POSTHOG_KEY: "nope", NEXT_PUBLIC_POSTHOG_HOST: "eu.i.posthog.com" },
      ),
    );
    expect(checks).toEqual([
      [
        "posthog-key",
        "error",
        [
          "apps/backend: POSTHOG_EVENTS_API_KEY is a personal API key (phx_…), a secret: use the project's key (phc_…)",
          "apps/storefront: NEXT_PUBLIC_POSTHOG_KEY is not a project API key (phc_…)",
          "apps/storefront: NEXT_PUBLIC_POSTHOG_HOST is not a host such as https://eu.i.posthog.com",
        ],
      ],
    ]);
    expect(JSON.stringify(checks)).not.toContain("FAKEFAKE");
  });

  it("warns when the two apps send to two projects", () => {
    expect(
      posthog(withKeys({ POSTHOG_EVENTS_API_KEY: key }, { NEXT_PUBLIC_POSTHOG_KEY: other })),
    ).toEqual([["posthog-projects", "warn", undefined]]);
  });

  it("reads each app's host, else the EU's, without a trailing slash", () => {
    const envs = withKeys(
      { POSTHOG_HOST: "https://us.i.posthog.com/" },
      { NEXT_PUBLIC_POSTHOG_HOST: " " },
    );
    expect(posthogHost(envs, "backend")).toBe("https://us.i.posthog.com");
    expect(posthogHost(envs, "storefront")).toBe(POSTHOG_EU);
  });

  it("--online: PostHog takes the key, refuses it, or does not answer", () => {
    const answer = (status: number): HttpResult => ({ kind: "response", status, text: "{}" });
    const ok = posthogFlagsCheck(["backend", "storefront"], POSTHOG_EU, answer(200));
    expect([ok.id, ok.level, ok.title]).toEqual([
      "posthog-flags-backend-storefront",
      "ok",
      "PostHog accepts the key (apps/backend and apps/storefront)",
    ]);
    expect(posthogFlagsCheck(["backend"], POSTHOG_EU, answer(401)).level).toBe("error");
    expect(posthogFlagsCheck(["backend"], POSTHOG_EU, answer(403)).level).toBe("error");
    expect(posthogFlagsCheck(["backend"], POSTHOG_EU, answer(500)).level).toBe("warn");
    expect(posthogFlagsCheck(["backend"], POSTHOG_EU, { kind: "refused" }).level).toBe("warn");
  });
});

describe("configChecks: scheduled publishing by Medusa's worker (M7 D148, 1; T111)", () => {
  const withSecret = (backend: string, storefront = "cron") => ({
    backend: { ...bootstrapped.backend, CRON_SECRET: backend },
    storefront: { ...bootstrapped.storefront, CRON_SECRET: storefront },
  });

  it("is ok with the storefront's CRON_SECRET and PAYLOAD_SERVER_URL in the backend", () => {
    const check = find(run(withSecret(" cron ")), "payload-jobs-tick");
    expect(check?.level).toBe("ok");
    expect(check?.message).toContain("http://localhost:8000/api/payload-jobs/run");
  });

  it("is an accepted note without it in development, an error on a deployment", () => {
    expect(find(run(bootstrapped), "payload-jobs-tick")?.level).toBe("note");
    const deployed = find(run(bootstrapped, { ...dev, deployed: true }), "payload-jobs-tick");
    expect(deployed?.level).toBe("error");
    expect(deployed?.details).toEqual(["not set: CRON_SECRET (apps/backend)"]);
    const noServer = {
      ...withSecret("cron"),
      backend: { ...withSecret("cron").backend, PAYLOAD_SERVER_URL: "" },
    };
    expect(find(run(noServer, { ...dev, deployed: true }), "payload-jobs-tick")?.details).toEqual([
      "not set: PAYLOAD_SERVER_URL (apps/backend)",
    ]);
  });

  it("is an error when both apps' files differ, and is not compared with --app", () => {
    expect(find(run(withSecret("other")), "payload-jobs-tick")?.level).toBe("error");
    const backendOnly = configChecks(
      withSecret("other"),
      getIntegrationStatus(withSecret("other"), { app: "backend" }),
      { ...dev, app: "backend" },
    );
    expect(find(backendOnly, "payload-jobs-tick")?.level).toBe("ok");
  });
});

describe("configChecks: Payload's files on a deployment (M7 D148, 2; T111)", () => {
  const r2 = {
    S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
    S3_ACCESS_KEY_ID: "id",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_BUCKET: "b",
    S3_PUBLIC_URL: "https://media.example.com",
  };

  it("is an error on a deployment without R2's keys, the private bucket included", () => {
    const media = { ...bootstrapped, storefront: { ...bootstrapped.storefront, ...r2 } };
    const check = find(run(media, { ...dev, deployed: true }), "vercel-storage");
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual(["not set: S3_PRIVATE_BUCKET"]);
    const all = {
      ...bootstrapped,
      storefront: { ...bootstrapped.storefront, ...r2, S3_PRIVATE_BUCKET: "p" },
    };
    expect(find(run(all, { ...dev, deployed: true }), "vercel-storage")?.level).toBe("ok");
  });
});
