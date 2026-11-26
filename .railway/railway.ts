// Railway's staging environment as code (M7 D132, D135; T114). Railway retired `railway.json`
// (Config as Code: new services cannot use it, and existing files stop being read on 2026-12-01),
// so the deploy configuration D135 names lives here, in Railway's Infrastructure as Code:
//
//   railway config plan      (reads only: what would change in the linked environment)
//   railway config apply     (after you read the plan; DEPLOY.md, "Railway")
//
// The CLI evaluates this file with the `railway` package (the root's devDependency). It describes
// the staging environment only, and refuses any other, so a plan linked to another environment by
// mistake stops before it shows a change. No value of a secret is here: every secret is
// `preserve()`, which keeps what `pnpm staging:secrets` set (sealed, D134), and the addresses Railway
// knows are references (`${{…}}`) it fills in itself. `scripts/lib/railway-config.test.ts` checks
// the graph.
import {
  database,
  defineRailway,
  github,
  group,
  image,
  preserve,
  project,
  redis,
  service,
  volume,
  type VariableValue,
} from "railway/iac";

/** The environment this file describes; any other is refused (D134: only staging is ever changed). */
export const ENVIRONMENT = "staging";

/** Railway's EU West region (Amsterdam), D132. */
export const REGION = "europe-west4-drams3a";

/** This repository, from which Railway builds Medusa's image on each push to `main`. */
export const REPOSITORY = "neno221/shopblok-starter";

/**
 * The files Medusa's image is built from (`.dockerignore`'s list): a push that changes none of
 * them builds nothing. A storefront-only change never redeploys Medusa.
 */
export const WATCH_PATTERNS = [
  "apps/backend/**",
  "packages/config/**",
  "packages/emails/**",
  "packages/fixtures/**",
  "packages/i18n/**",
  "packages/integrations/**",
  "packages/medusa-markets/**",
  "packages/registry/**",
  "packages/ui/**",
  "packages/*/package.json",
  "apps/*/package.json",
  "scripts/*.ts",
  "scripts/lib/**",
  "scripts/package.json",
  "scripts/tsconfig.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".dockerignore",
];

/** The image's entry point (`apps/backend/docker/shopblok.sh`); Railway's start command replaces it. */
const SHOPBLOK = "/usr/local/bin/shopblok";

/**
 * The variables Medusa's server and worker share. The secrets and the integrations' keys are
 * `preserve()`: `pnpm staging:secrets` sets them in both services (D134), and a plan never shows
 * or changes them. `STOREFRONT_URL` and `STOREFRONT_PREVIEW_ORIGINS` are the environment's shared
 * variables (G11 sets them once, DEPLOY.md): the storefront's Production address, and a pattern
 * for its previews' addresses in Medusa's CORS syntax (`/regex/`).
 */
function medusaEnv(refs: {
  database: VariableValue;
  redis: VariableValue;
  meilisearchHost: string;
  backendUrl: string;
}): Record<string, string | VariableValue> {
  const secret = preserve();
  return {
    NODE_ENV: "production",
    DEPLOY_ENV: ENVIRONMENT,
    PORT: "9000",
    DATABASE_URL: refs.database,
    REDIS_URL: refs.redis,
    MEILISEARCH_HOST: refs.meilisearchHost,
    MEDUSA_BACKEND_URL: refs.backendUrl,
    STOREFRONT_URL: "${{shared.STOREFRONT_URL}}",
    STORE_CORS: "${{shared.STOREFRONT_URL}},${{shared.STOREFRONT_PREVIEW_ORIGINS}}",
    ADMIN_CORS: refs.backendUrl,
    AUTH_CORS: `\${{shared.STOREFRONT_URL}},\${{shared.STOREFRONT_PREVIEW_ORIGINS}},${refs.backendUrl}`,
    PAYLOAD_SERVER_URL: "${{shared.STOREFRONT_URL}}",
    PAYLOAD_USER_COLLECTION: "integrations",
    // D134's secrets, set and sealed by `pnpm staging:secrets`.
    JWT_SECRET: secret,
    COOKIE_SECRET: secret,
    PAYLOAD_API_KEY: secret,
    REVALIDATE_SECRET: secret,
    STOREFRONT_SIGNING_SECRET: secret,
    CRON_SECRET: secret,
    AUTH_MFA_ENCRYPTION_KEY: secret,
    MEILISEARCH_API_KEY: secret,
    SHOPBLOK_SECRET_FINGERPRINTS: secret,
    // The integrations' test keys (D115), copied by `pnpm staging:secrets` from the session.
    STRIPE_API_KEY: secret,
    STRIPE_WEBHOOK_SECRET: secret,
    RESEND_API_KEY: secret,
    RESEND_FROM_EMAIL: secret,
    POSTHOG_EVENTS_API_KEY: secret,
    SENTRY_DSN: secret,
    S3_ENDPOINT: secret,
    S3_REGION: secret,
    S3_BUCKET: secret,
    S3_PRIVATE_BUCKET: secret,
    S3_ACCESS_KEY_ID: secret,
    S3_SECRET_ACCESS_KEY: secret,
    S3_PUBLIC_URL: secret,
    SENTRY_ENVIRONMENT: ENVIRONMENT,
  };
}

/** The build both Medusa services share: one image (D135), built from the repo root. */
const medusaBuild = {
  builder: "DOCKERFILE" as const,
  dockerfilePath: "apps/backend/Dockerfile",
  watchPatterns: WATCH_PATTERNS,
};

export default defineRailway((ctx) => {
  if (ctx.environment !== undefined && !ctx.isEnvironment(ENVIRONMENT))
    throw new Error(
      `.railway/railway.ts describes the "${ENVIRONMENT}" environment only, not "${ctx.environment}": link the staging environment (railway link) and plan again.`,
    );

  // Medusa's data: private, no public address (D132).
  const medusaDb = database("medusa-postgres", "postgres", {
    // Railway's Postgres with TLS, on the major version the compose stack runs (infra/).
    image: "ghcr.io/railwayapp-templates/postgres-ssl:17",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
    region: REGION,
  });
  const cache = redis("redis", { region: REGION });
  const searchData = volume("meilisearch-data", { region: REGION, sizeMB: 1024 });
  const search = service("meilisearch", {
    source: image("getmeili/meilisearch:v1.56.2"),
    volumeMounts: { "/meili_data": searchData },
    replicas: { [REGION]: 1 },
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    env: {
      MEILI_ENV: "production",
      MEILI_NO_ANALYTICS: "true",
      // Set and sealed by `pnpm staging:secrets`, with the backend's MEILISEARCH_API_KEY (D134).
      MEILI_MASTER_KEY: preserve(),
    },
  });

  // Payload's data: reached by Vercel over the internet, so only through Railway's TCP proxy, and
  // with TLS required in its connection string (D136, 4; `doctor`'s payload-database-tls check).
  const payloadDb = database("payload-postgres", "postgres", {
    image: "ghcr.io/railwayapp-templates/postgres-ssl:17",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
    region: REGION,
  });
  payloadDb.networking = { tcpProxies: { "5432": {} } };

  const searchHost = "http://${{meilisearch.RAILWAY_PRIVATE_DOMAIN}}:7700";
  const shared = {
    source: github(REPOSITORY, { branch: "main", checkSuites: true }),
    build: medusaBuild,
    replicas: { [REGION]: 1 },
  };

  // The HTTP server: the store API, Medusa Admin, Stripe's webhooks. The predeploy migrates, then
  // runs `doctor --app=backend --strict --online` (and, while SEED_ON_DEPLOY=medusa, the seed's
  // Medusa half), so a half-set key fails the deployment instead of starting it.
  const server = service("medusa", {
    ...shared,
    start: `${SHOPBLOK} start`,
    preDeploy: `${SHOPBLOK} predeploy`,
    healthcheck: "/health",
    healthcheckTimeout: 300,
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      preDeployTimeoutSeconds: 900,
      drainingSeconds: 30,
    },
    env: {
      ...medusaEnv({
        database: medusaDb.env.DATABASE_URL,
        redis: cache.env.REDIS_URL,
        meilisearchHost: searchHost,
        backendUrl: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      }),
      MEDUSA_WORKER_MODE: "server",
      // Staging's first deployment only (D148, 5; DEPLOY.md): the seed's Medusa half.
      SEED_ON_DEPLOY: preserve(),
      SEED_DEMO: preserve(),
      SEED_ADMIN_EMAIL: preserve(),
    },
  });

  // The worker: subscribers and scheduled jobs, no HTTP traffic and no admin (D132).
  const worker = service("medusa-worker", {
    ...shared,
    start: `${SHOPBLOK} start`,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10, drainingSeconds: 60 },
    env: {
      ...medusaEnv({
        database: medusaDb.env.DATABASE_URL,
        redis: cache.env.REDIS_URL,
        meilisearchHost: searchHost,
        // The links in the e-mails the worker sends point at the server's public address.
        backendUrl: "https://${{medusa.RAILWAY_PUBLIC_DOMAIN}}",
      }),
      MEDUSA_WORKER_MODE: "worker",
      DISABLE_MEDUSA_ADMIN: "true",
    },
  });

  return project(ctx.projectName ?? "shopblok", {
    resources: [
      group("Medusa", [server, worker, medusaDb, cache, search, searchData]),
      group("Payload", [payloadDb]),
    ],
  });
});
