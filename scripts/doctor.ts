// `pnpm run doctor` (T14): is this setup healthy, and which integrations are on? Run with plain
// `node scripts/doctor.ts` (Node 22.18+ strips the types, so no enums or parameter properties here),
// on Linux, macOS and Windows. Never `pnpm doctor`: that is pnpm's own command.
//
//   pnpm run doctor [--online] [--json] [--strict] [--only=<ids>] [--app=backend|storefront]
//
// `--app` (M7 D135) is the deploys' mode: Railway's predeploy runs `--app=backend` inside Medusa's
// image (bundled to /app/doctor/doctor.mjs, `apps/backend/Dockerfile`) and Vercel's build runs
// `--app=storefront`, each with its own platform's variables only.
//
// It writes nothing: no file, no row, no migration. The one command it runs that touches the
// database is `medusa exec src/scripts/doctor-markets.ts` (to read the markets module; M4b D97),
// which only reads, and with `--online` and a local backend running, `GET /admin/markets` stands in
// for it. The decisions are in scripts/lib/ (doctor-checks.ts, doctor-services.ts,
// markets-check.ts) and `@shopblok/integrations`, with tests; this file looks at the machine and
// wires them up.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inspectTargets, isLocalHost, targetsFrom } from "./lib/checks.ts";
import { secretsOf } from "./lib/deploy-secrets.ts";
import {
  configChecks,
  explainMedusaRun,
  medusaMarketsCheck,
  meilisearchLocalesCheck,
  MEDUSA_RUN_TIMEOUT_MS,
  orphanRegions,
  orphanRegionsCheck,
  payloadAuthCheck,
  resendDomainCheck,
  SENTRY_DSN_KEYS,
  emptyEnvelope,
  parseSentryDsn,
  sentryEnvelopeCheck,
  POSTHOG_KEYS,
  POSTHOG_PROJECT_KEY,
  posthogFlagsCheck,
  posthogHost,
  searchCurrencies,
  searchFieldOf,
  searchIndexCheck,
  senderDomain,
  productionStage,
  type Context,
  type SentryDsn,
} from "./lib/doctor-checks.ts";
import {
  siteDomains,
  STRIPE_API,
  stripeDomainsCheck,
  stripeKeyCheck,
  stripeModesCheck,
  stripeRegionsCheck,
  stripeWebhookCheck,
  type RegionProviders,
} from "./lib/stripe-checks.ts";
import { databaseFailed, serverCheck, serviceChecks } from "./lib/doctor-services.ts";
import {
  firstKey,
  PAYLOAD_EXPORTS_PREFIX,
  PRIVATE_PREFIX,
  r2BucketCheck,
  r2Buckets,
  r2CorsCheck,
  r2PrivateCheck,
} from "./lib/r2-checks.ts";
import { SITEVERIFY_URL, turnstileSecretCheck } from "./lib/rate-limit-checks.ts";
import { s3Url, signS3, type S3Keys } from "./lib/s3.ts";
import { envValue } from "./lib/env-file.ts";
import { run } from "./lib/exec.ts";
import { jsonOf, request, type HttpResult } from "./lib/http.ts";
import {
  getIntegrationStatus,
  INTEGRATION_KEYS,
  isSet,
  type AppEnvs,
  type AppName,
  type EnvLike,
  type IntegrationId,
  type IntegrationStatus,
} from "@shopblok/integrations";
import { loadExports } from "./lib/load-exports.ts";
import {
  marketsCheck,
  readAdminMarkets,
  readBackendMarkets,
  readMarketsOverview,
  type BackendMarkets,
  type MarketsRead,
} from "./lib/markets-check.ts";
import { extractMarker, redact } from "./lib/output.ts";
import {
  exitCodeOf,
  renderJson,
  renderText,
  type Check,
  type Report,
  type ReportOptions,
} from "./lib/report.ts";

// ---------------------------------------------------------------------------------------------
// Options and places

const HELP = `pnpm run doctor [--online] [--json] [--strict] [--only=<ids>] [--app=backend|storefront]

Checks the setup and says which integrations are on. Writes nothing. (Run it as \`pnpm run doctor\`:
\`pnpm doctor\` is pnpm's own command.)

  --online   also call the running servers with the keys: Payload accepts the integrations key, and
             Medusa's regions, locales and search index match the market map (and, with a local
             backend running, the markets are read from GET /admin/markets as the bootstrap admin);
             with Resend's keys, RESEND_FROM_EMAIL's domain is verified with Resend; with a
             Sentry DSN, Sentry accepts an empty envelope with it; with a PostHog key, PostHog
             takes it (a feature-flags request, which records no event); with R2's keys,
             both buckets answer, their CORS rules let Payload's admin and Medusa Admin's
             import upload (where the token may read them), and a private file is refused
             without a signature (reads only)
  --json     print the result as JSON (no secrets in it) and nothing else
  --strict   a warning fails the run too (the go-live check: SPEC §16, item 8), but for one these
             keys cannot clear, which says what to check by hand (R2's CORS rules with an Object
             Read & Write token)
  --app=backend, --app=storefront
             one app's checks only, from its own variables (the shell's, else its .env), as each
             platform's deploy runs them (DEPLOY.md): the checks that compare the two apps are
             skipped, and each shared secret is compared with SHOPBLOK_SECRET_FINGERPRINTS instead;
             on a deployment, Payload's database must require TLS
  --only=stripe,posthog
             report and judge only these integrations' checks (CI's integrations-live job: the
             integrations whose keys it holds); the integrations table stays whole
  -h, --help this text

Exit codes: 0 no error (and, with --strict, no warning but those to check by hand), 1 an error,
2 a bad option. With --only, only those integrations' checks count.`;

type Options = ReportOptions & { json: boolean; app?: AppName };

/** `--only=stripe,posthog`: integration ids from the table, at least one; or what is wrong. */
function parseOnly(list: string): IntegrationId[] | string {
  const known = getIntegrationStatus({ backend: {}, storefront: {} }).map((status) => status.id);
  const ids = list
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
  const unknown = ids.filter((id) => !(known as string[]).includes(id));
  if (ids.length === 0) return `--only needs integration ids (${known.join(", ")})`;
  if (unknown.length > 0)
    return `--only: no integration ${unknown.join(", ")} (one of ${known.join(", ")})`;
  return [...new Set(ids)] as IntegrationId[];
}

function parseArgs(argv: string[]): Options | { error: string } | "help" {
  const options: Options = { online: false, json: false, strict: false };
  for (const arg of argv) {
    if (arg === "--online") options.online = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg.startsWith("--only=")) {
      const only = parseOnly(arg.slice("--only=".length));
      if (typeof only === "string") return { error: only };
      options.only = only;
    } else if (arg.startsWith("--app=")) {
      const app = arg.slice("--app=".length);
      if (app !== "backend" && app !== "storefront")
        return { error: `--app is backend or storefront (not "${app}")` };
      options.app = app;
    } else if (arg === "-h" || arg === "--help") return "help";
    else return { error: `Unknown option ${arg}` };
  }
  return options;
}

const root = path.resolve(import.meta.dirname, "..");
const backendEnvFile = path.join(root, "apps", "backend", ".env");
const storefrontEnvFile = path.join(root, "apps", "storefront", ".env");
const backendConfigFile = path.join(root, "apps", "backend", "src", "config", "markets.ts");

const readText = (file: string): string => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** Every variable doctor reads, for one app: the shell wins over the `.env` file, as in dotenv. */
const EXTRA_KEYS = [
  "NODE_ENV",
  "DEPLOY_ENV",
  "E2E_TEST_ROUTES",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "PAYLOAD_SECRET",
  "PREVIEW_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "PAYLOAD_API_KEY",
  "PAYLOAD_SERVER_URL",
  "MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_BASE_URL",
  "DATABASE_URL",
  "PAYLOAD_DATABASE_URL",
  "MAILPIT_SMTP_PORT",
  "MAILPIT_UI_PORT",
  // M7 D134: the generated secrets, compared with their fingerprints by `--app`.
  "SHOPBLOK_SECRET_FINGERPRINTS",
  ...secretsOf("backend").map(({ variable }) => variable),
  ...secretsOf("storefront").map(({ variable }) => variable),
];

function readAppEnv(text: string): EnvLike {
  const env: Record<string, string | undefined> = {};
  for (const key of new Set([...INTEGRATION_KEYS, ...EXTRA_KEYS])) {
    env[key] = envValue(process.env, text, key);
  }
  return env;
}

// ---------------------------------------------------------------------------------------------
// The apps

const trimSlash = (url: string): string => url.replace(/\/+$/, "");

// ---------------------------------------------------------------------------------------------
// Markets

/**
 * `medusa exec`: the markets module's overview (what `GET /admin/markets` answers), read from the
 * database, so no server has to run. It only reads, and Medusa never creates a missing database.
 */
async function readMarketsExec(): Promise<MarketsRead> {
  // In Medusa's image (M7 D135) there is no workspace: the build's own `medusa`, in its folder.
  const built = (process.env.DOCTOR_MEDUSA_DIR ?? "").trim();
  const result = await (built !== ""
    ? run(
        path.join(built, "..", "..", "node_modules", ".bin", "medusa"),
        ["exec", "./src/scripts/doctor-markets.js"],
        { cwd: built, env: { NO_COLOR: "1" }, timeoutMs: MEDUSA_RUN_TIMEOUT_MS },
      )
    : run(
        "pnpm",
        [
          "--filter",
          "@shopblok/backend",
          "exec",
          "medusa",
          "exec",
          "./src/scripts/doctor-markets.ts",
        ],
        { cwd: root, env: { NO_COLOR: "1" }, timeoutMs: MEDUSA_RUN_TIMEOUT_MS },
      ));
  const found = extractMarker<unknown>(result.output, "doctorMarkets");
  if (result.code === 0 && found !== undefined) {
    const overview = readMarketsOverview(found);
    if (typeof overview === "string") {
      return {
        ok: false,
        cause: `the markets module's overview is not what doctor expects (${overview})`,
        fix: "Doctor and the markets plugin disagree about the overview's shape.",
      };
    }
    return { ok: true, source: "medusa-exec", overview };
  }
  return { ok: false, ...explainMedusaRun(result) };
}

/**
 * `--online`: `GET /admin/markets` of the running backend, as the bootstrap admin whose login is in
 * `apps/backend/.env` (`DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`). Only for a backend on this machine:
 * that password is a development credential and never goes to a deployed URL. `undefined` when it
 * cannot be asked (no credentials, not local, a refused login, no answer): `medusa exec` reads then.
 */
async function readMarketsApi(
  medusaUrl: string,
  backendText: string,
): Promise<MarketsRead | undefined> {
  const email = envValue(process.env, backendText, "DEV_ADMIN_EMAIL");
  const password = envValue(process.env, backendText, "DEV_ADMIN_PASSWORD");
  if (!email || !password || !isLocalHost(new URL(medusaUrl).hostname)) return undefined;
  const login = await request(`${medusaUrl}/auth/user/emailpass`, {
    method: "POST",
    body: { email, password },
    timeoutMs: 15_000,
  });
  const token = (jsonOf(login) as { token?: unknown } | undefined)?.token;
  if (login.kind !== "response" || login.status !== 200 || typeof token !== "string") {
    return undefined;
  }
  return readAdminMarkets(
    await request(`${medusaUrl}/admin/markets`, {
      headers: { authorization: `Bearer ${token}` },
      timeoutMs: 30_000,
    }),
  );
}

// ---------------------------------------------------------------------------------------------
// Running

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed === "help") {
    console.log(HELP);
    return 0;
  }
  if ("error" in parsed) {
    console.error(`${parsed.error}\n\n${HELP}`);
    return 2;
  }
  const options = parsed;

  const { app } = options;
  const backendText = app === "storefront" ? "" : readText(backendEnvFile);
  const storefrontText = app === "backend" ? "" : readText(storefrontEnvFile);
  // `--app` (M7 D135): the other app's environment is not there (each platform holds one app's
  // variables), so it is empty, never the shell's: the shell is this app's.
  const envs: AppEnvs = {
    backend: app === "storefront" ? {} : readAppEnv(backendText),
    storefront: app === "backend" ? {} : readAppEnv(storefrontText),
  };
  const statuses = getIntegrationStatus(envs, app === undefined ? {} : { app });
  const context: Context = {
    nodeEnv: envs[app ?? "backend"].NODE_ENV?.trim() || undefined,
    vercel: ["VERCEL", "VERCEL_ENV", "VERCEL_URL"].some((name) => isSet(envs.storefront, name)),
    ...(app === undefined ? {} : { app }),
    deployed: (app === undefined ? (["backend", "storefront"] as const) : [app]).some(
      (each) => productionStage(envs[each]).stage !== undefined,
    ),
  };

  // Mailpit's ports are Docker Compose's variables: the shell or the root `.env`.
  const composeText = readText(path.join(root, ".env"));
  const targets = targetsFrom(
    {
      DATABASE_URL: envs.backend.DATABASE_URL,
      PAYLOAD_DATABASE_URL: envs.storefront.PAYLOAD_DATABASE_URL,
      REDIS_URL: envs.backend.REDIS_URL,
      MEILISEARCH_HOST: envs.backend.MEILISEARCH_HOST,
      MAILPIT_SMTP_PORT: envValue(process.env, composeText, "MAILPIT_SMTP_PORT"),
      MAILPIT_UI_PORT: envValue(process.env, composeText, "MAILPIT_UI_PORT"),
    },
    app,
  );

  const medusaUrl = trimSlash(
    (envs.storefront.MEDUSA_BACKEND_URL || envs.backend.MEDUSA_BACKEND_URL || "").trim() ||
      "http://localhost:9000",
  );
  const storefrontUrl = trimSlash(
    (envs.storefront.NEXT_PUBLIC_BASE_URL ?? "").trim() || "http://localhost:8000",
  );

  // Looking at the machine, all at once: the services, the two servers, the backend's own file and
  // the markets module. Its read (`medusa exec`, about 4 s) waits only for the Postgres check, not
  // for the storefront, which may take several seconds to compile its first page; with `--online`
  // and a backend that answers its health check, `GET /admin/markets` is tried first.
  const serviceFindings = inspectTargets(targets, root);
  const medusaHealthRequest = request(`${medusaUrl}/health`, { timeoutMs: 5000 });
  const marketsRead = Promise.all([serviceFindings, medusaHealthRequest]).then(
    async ([findings, health]): Promise<MarketsRead | undefined> => {
      // The storefront's deploy has no backend to run `medusa exec` in.
      if (app === "storefront") return undefined;
      if (databaseFailed(findings, targets, "medusa")) return { skipped: true };
      if (options.online && health.kind === "response" && health.status === 200) {
        const viaApi = await readMarketsApi(medusaUrl, backendText);
        if (viaApi !== undefined) return viaApi;
      }
      return readMarketsExec();
    },
  );
  // The `--online` requests need only the env, so they go out now, with the rest.
  const online = options.online ? startOnlineRequests(envs, medusaUrl, statuses, app) : undefined;
  const [findings, medusaHealth, storefrontHome, backendFile, read] = await Promise.all([
    serviceFindings,
    medusaHealthRequest,
    // The first request to `next dev` compiles the page, which takes several seconds. A deploy
    // (`--app`) checks before its own server runs, so it never asks its own app.
    app === undefined ? request(storefrontUrl, { timeoutMs: 30_000 }) : Promise.resolve(undefined),
    loadExports(backendConfigFile, ["SUPPORTED_CURRENCIES", "MARKET_REGIONS", "SUPPORTED_LOCALES"]),
    marketsRead,
  ]);

  const checks = serviceChecks(findings, targets, statuses);
  // Railway's predeploy runs before the new backend starts; Vercel's build needs Medusa running.
  if (app !== "backend")
    checks.push(
      serverCheck("medusa", "Medusa backend", medusaUrl, medusaHealth, "Start it with `pnpm dev`."),
    );
  if (storefrontHome !== undefined)
    checks.push(
      serverCheck(
        "storefront",
        "Storefront",
        storefrontUrl,
        storefrontHome,
        "Start it with `pnpm dev`.",
      ),
    );
  checks.push(...configChecks(envs, statuses, context));
  const modes = stripeModesCheck(
    envs.backend.STRIPE_API_KEY,
    envs.storefront.NEXT_PUBLIC_STRIPE_KEY,
  );
  if (modes !== undefined) checks.push(modes);

  if (read !== undefined) checks.push(marketsCheck(read).check);

  if (online !== undefined) {
    // `config/markets.ts` is the regions' seed input: the leftover-regions check reads it.
    const seeded = "error" in backendFile ? undefined : readBackendMarkets(backendFile.exports);
    checks.push(
      ...(await onlineChecks(
        online,
        medusaUrl,
        typeof seeded === "object" ? seeded : undefined,
        app,
      )),
      ...(await online.resend).map(({ apps, from, answer }) =>
        resendDomainCheck(apps, from, answer, envs),
      ),
      ...(await online.sentry).map(({ apps, dsn, answer }) =>
        sentryEnvelopeCheck(apps, dsn, answer),
      ),
      ...(await online.posthog).map(({ apps, host, answer }) =>
        posthogFlagsCheck(apps, host, answer),
      ),
      ...(await online.stripe),
      ...(await online.r2),
      ...(await online.turnstile),
    );
  }

  const report: Report = { integrations: statuses, checks };
  console.log(options.json ? renderJson(report, options) : renderText(report, options));
  return exitCodeOf(report, options);
}

// ---------------------------------------------------------------------------------------------
// --online

type OnlineRequests = {
  payloadUrl: string;
  /** The storefront's publishable key, as Medusa wants it; blank when the storefront has none. */
  headers: Record<string, string>;
  /** `undefined` when there was no URL or key to ask with. */
  payload: Promise<HttpResult | undefined>;
  medusa: Promise<{ regions: HttpResult; locales: HttpResult } | undefined>;
  /** Meilisearch's `GET /stats`, when the backend searches with it (T94). */
  meilisearch: { host: string; prefix: string | undefined; stats: Promise<HttpResult> } | undefined;
  /** Resend's domains, per app whose Resend keys are set (T98); `undefined` for its test sender. */
  resend: Promise<{ apps: AppName[]; from: string | undefined; answer: HttpResult | undefined }[]>;
  /** Sentry's answer to an empty envelope, per DSN (T96). */
  sentry: Promise<{ apps: AppName[]; dsn: SentryDsn; answer: HttpResult }[]>;
  /** PostHog's answer to a feature-flags request, per project key and host (T97). */
  posthog: Promise<{ apps: AppName[]; host: string; answer: HttpResult }[]>;
  /** Stripe's checks (T100): the key, the regions, and in production the webhook and domains. */
  stripe: Promise<Check[]>;
  /** R2's checks (T95): each bucket, their CORS rules, the private files refused. */
  r2: Promise<Check[]>;
  /** Turnstile's secret with Cloudflare's Siteverify (T108), when the storefront holds its keys. */
  turnstile: Promise<Check[]>;
};

/**
 * The backend → Payload link, and Medusa's regions and locales with the storefront's key. They are
 * independent of each other and of everything `main` looks at, so they are all asked at once.
 */
function startOnlineRequests(
  envs: AppEnvs,
  medusaUrl: string,
  statuses: readonly IntegrationStatus[],
  app: AppName | undefined,
): OnlineRequests {
  const payloadUrl = trimSlash((envs.backend.PAYLOAD_SERVER_URL ?? "").trim());
  const payloadKey = (envs.backend.PAYLOAD_API_KEY ?? "").trim();
  const key = (envs.storefront.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "").trim();
  const headers = { "x-publishable-api-key": key };
  const meiliHost = trimSlash((envs.backend.MEILISEARCH_HOST ?? "").trim());
  const meiliKey = (envs.backend.MEILISEARCH_API_KEY ?? "").trim();
  const meiliLive = statuses.find((status) => status.id === "meilisearch")?.state === "live";
  return {
    payloadUrl,
    headers,
    meilisearch: meiliLive
      ? {
          host: meiliHost,
          prefix: (envs.backend.MEILISEARCH_INDEX_PREFIX ?? "").trim() || undefined,
          stats: request(`${meiliHost}/stats`, {
            headers: { Authorization: `Bearer ${meiliKey}` },
            timeoutMs: 15_000,
          }),
        }
      : undefined,
    payload:
      payloadUrl === "" || payloadKey === ""
        ? Promise.resolve(undefined)
        : request(`${payloadUrl}/api/integrations/me`, {
            headers: { Authorization: `integrations API-Key ${payloadKey}` },
            timeoutMs: 30_000,
          }),
    medusa:
      key === ""
        ? Promise.resolve(undefined)
        : Promise.all([
            request(`${medusaUrl}/store/regions?fields=id,name,currency_code,*countries`, {
              headers,
              timeoutMs: 15_000,
            }),
            request(`${medusaUrl}/store/locales`, { headers, timeoutMs: 15_000 }),
          ]).then(([regions, locales]) => ({ regions, locales })),
    resend: resendDomains(envs, statuses),
    sentry: sentryEnvelopes(envs),
    posthog: posthogFlags(envs),
    stripe: stripeChecks(envs, medusaUrl, headers, app),
    r2: r2Checks(envs),
    turnstile: turnstileChecks(envs, statuses, app),
  };
}

/**
 * Turnstile (T108, D143): the storefront's secret posted to Siteverify with a token that is not
 * one, which Cloudflare refuses either way and says why (`turnstileSecretCheck`). Nothing is stored.
 */
async function turnstileChecks(
  envs: AppEnvs,
  statuses: readonly IntegrationStatus[],
  app: AppName | undefined,
): Promise<Check[]> {
  const live = statuses.find((status) => status.id === "turnstile")?.state === "live";
  if (app === "backend" || !live) return [];
  const answer = await request(SITEVERIFY_URL, {
    method: "POST",
    body: {
      secret: (envs.storefront.TURNSTILE_SECRET_KEY ?? "").trim(),
      response: "doctor-check",
    },
    timeoutMs: 15_000,
  });
  return [turnstileSecretCheck(answer)];
}

/** An app's keys for signing R2 requests (doctor's own checks; nothing is written). */
function s3KeysOf(env: Readonly<Record<string, string | undefined>>): S3Keys {
  return {
    endpoint: trimSlash((env.S3_ENDPOINT ?? "").trim()),
    region: (env.S3_REGION ?? "").trim() || "auto",
    accessKeyId: (env.S3_ACCESS_KEY_ID ?? "").trim(),
    secretAccessKey: (env.S3_SECRET_ACCESS_KEY ?? "").trim(),
  };
}

/** A signed `GET` on R2's S3 API (only reads: one listed key, a CORS rule). */
function s3Get(keys: S3Keys, url: string): Promise<HttpResult> {
  return request(url, {
    headers: signS3({ method: "GET", url, keys, now: new Date() }),
    timeoutMs: 15_000,
  });
}

/** An app's URL's origin, or `fallback`'s when the value is blank or not a URL. */
function originOf(value: string | undefined, fallback: string): string {
  try {
    return new URL(value?.trim() || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

/**
 * Cloudflare R2 (T95, D127), for each app whose keys are set: a signed listing of one key in each
 * bucket (an Object Read & Write token may list, not read bucket settings); each bucket's CORS
 * rules, which must let the storefront's origin (`NEXT_PUBLIC_BASE_URL`, where Payload's admin runs)
 * `PUT` to the public bucket and the backend's (`MEDUSA_BACKEND_URL`, Medusa Admin's product import)
 * to the private one (a 403 for that token is a warning); and in the private bucket, one listed
 * file (or a key that does not exist) read without a signature on the S3 API and on
 * `S3_PUBLIC_URL`, which both must refuse. Reads only.
 */
async function r2Checks(envs: AppEnvs): Promise<Check[]> {
  const checks: Promise<Check>[] = [];
  for (const target of r2Buckets(envs)) {
    const app = target.apps[0]!;
    const keys = s3KeysOf(envs[app]);
    checks.push(
      s3Get(
        keys,
        s3Url(keys.endpoint, target.bucket, "", { "list-type": "2", "max-keys": "1" }),
      ).then((answer) => r2BucketCheck(target, answer)),
    );
    // Payload's exports and imports reach the private bucket from its server, never the browser,
    // so only Medusa Admin's product import needs a CORS rule there.
    const uploader =
      target.role === "private"
        ? target.apps.includes("backend")
          ? originOf(envs.backend.MEDUSA_BACKEND_URL, "http://localhost:9000")
          : undefined
        : target.apps.includes("storefront")
          ? originOf(envs.storefront.NEXT_PUBLIC_BASE_URL, "http://localhost:8000")
          : undefined;
    if (uploader !== undefined)
      checks.push(
        s3Get(keys, s3Url(keys.endpoint, target.bucket, "", { cors: "" })).then((answer) =>
          r2CorsCheck(target, uploader, answer),
        ),
      );
    if (target.role === "private") {
      checks.push(
        (async () => {
          // Medusa's private files' prefix, or Payload's exports' for the storefront's bucket alone.
          const prefix = target.apps.includes("backend") ? PRIVATE_PREFIX : PAYLOAD_EXPORTS_PREFIX;
          const listed = await s3Get(
            keys,
            s3Url(keys.endpoint, target.bucket, "", {
              "list-type": "2",
              "max-keys": "1",
              prefix,
            }),
          );
          const key = firstKey(listed);
          const probe = key ?? `${prefix}doctor-probe-${Date.now()}.csv`;
          const publicUrl = trimSlash((envs[app].S3_PUBLIC_URL ?? "").trim());
          const [api, publicDomain] = await Promise.all([
            request(s3Url(keys.endpoint, target.bucket, probe), { timeoutMs: 15_000 }),
            key === undefined || publicUrl === ""
              ? Promise.resolve(undefined)
              : request(`${publicUrl}/${probe.split("/").map(encodeURIComponent).join("/")}`, {
                  timeoutMs: 15_000,
                }),
          ]);
          return r2PrivateCheck({ bucket: target.bucket, key, api, publicDomain });
        })(),
      );
    }
  }
  return Promise.all(checks);
}

/**
 * Stripe (T100, D117): with the backend's secret key, Stripe's `GET /v1/account`; with the
 * storefront's publishable key, whether every region offers Stripe exactly while its keys are set;
 * and on a deployment (staging or production, the backend's `productionStage`, M7 D133: staging takes
 * Stripe's test webhooks and wallets too, D117), the webhook endpoint at the backend's public
 * URL and the payment method domains of the storefront's and the markets' hosts. `STRIPE_BASE_URL`
 * points at a fake.
 */
async function stripeChecks(
  envs: AppEnvs,
  medusaUrl: string,
  headers: Record<string, string>,
  app: AppName | undefined,
): Promise<Check[]> {
  const base = trimSlash(process.env.STRIPE_BASE_URL?.trim() || STRIPE_API);
  const secret = (envs.backend.STRIPE_API_KEY ?? "").trim();
  const stripeOn = secret !== "" && (envs.backend.STRIPE_WEBHOOK_SECRET ?? "").trim() !== "";
  const auth = { Authorization: `Bearer ${secret}` };
  const checks: Promise<Check>[] = [];
  if (secret !== "")
    checks.push(
      request(`${base}/v1/account`, { headers: auth, timeoutMs: 15_000 }).then(stripeKeyCheck),
    );
  if (headers["x-publishable-api-key"] !== "")
    checks.push(
      (async () => {
        const answer = await request(`${medusaUrl}/store/regions?fields=id,name&limit=200`, {
          headers,
          timeoutMs: 15_000,
        });
        const regions = ((jsonOf(answer) as { regions?: { id: string; name: string }[] })
          ?.regions ?? []) as { id: string; name: string }[];
        const listed: RegionProviders[] = await Promise.all(
          regions.map(async (region) => {
            const providers = await request(
              `${medusaUrl}/store/payment-providers?region_id=${encodeURIComponent(region.id)}`,
              { headers, timeoutMs: 15_000 },
            );
            const body = jsonOf(providers) as
              { payment_providers?: { id?: unknown }[] } | undefined;
            return {
              name: region.name,
              providers:
                providers.kind === "response" && providers.status === 200
                  ? (body?.payment_providers ?? []).flatMap((p) =>
                      typeof p?.id === "string" ? [p.id] : [],
                    )
                  : undefined,
            };
          }),
        );
        return stripeRegionsCheck(listed, stripeOn);
      })(),
    );
  if (secret !== "" && productionStage(envs.backend).stage !== undefined) {
    const backendUrl = trimSlash((envs.backend.MEDUSA_BACKEND_URL ?? "").trim());
    checks.push(
      request(`${base}/v1/webhook_endpoints?limit=100`, { headers: auth, timeoutMs: 15_000 }).then(
        (answer) => stripeWebhookCheck(answer, backendUrl),
      ),
    );
  }
  // The payment method domains are the storefront's hosts: only with both apps' variables (the
  // backend's deploy runs before the storefront has them, and the storefront holds no secret key).
  if (secret !== "" && app === undefined && productionStage(envs.backend).stage !== undefined) {
    checks.push(
      (async () => {
        const markets = await request(`${medusaUrl}/store/markets`, { headers, timeoutMs: 15_000 });
        const wanted = siteDomains(
          envs.storefront.NEXT_PUBLIC_BASE_URL,
          (jsonOf(markets) as { markets?: Parameters<typeof siteDomains>[1] })?.markets,
        );
        const answer = await request(`${base}/v1/payment_method_domains?limit=100`, {
          headers: auth,
          timeoutMs: 15_000,
        });
        return stripeDomainsCheck(wanted, answer);
      })(),
    );
  }
  return Promise.all(checks);
}

/**
 * A feature-flags request with each project key the apps have (T97): PostHog answers 200 for its
 * project's key and 401 for any other, and records no event. Apps with the same key and host share
 * one request; a key that is not a project key is the offline check's (`posthogKeyChecks`), and is
 * never sent.
 */
function posthogFlags(envs: AppEnvs): OnlineRequests["posthog"] {
  const asks = new Map<string, { apps: AppName[]; host: string; key: string }>();
  for (const { app, key: name } of POSTHOG_KEYS) {
    const key = (envs[app][name] ?? "").trim();
    if (!POSTHOG_PROJECT_KEY.test(key)) continue;
    const host = posthogHost(envs, app);
    if (!/^https?:\/\/[^/\s]+$/.test(host)) continue;
    const entry = asks.get(`${host} ${key}`) ?? { apps: [], host, key };
    entry.apps.push(app);
    asks.set(`${host} ${key}`, entry);
  }
  return Promise.all(
    [...asks.values()].map(async ({ apps, host, key }) => ({
      apps,
      host,
      answer: await request(`${host}/flags/?v=2`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        text: JSON.stringify({ api_key: key, distinct_id: "shopblok-doctor" }),
        timeoutMs: 15_000,
      }),
    })),
  );
}

/**
 * An empty envelope to each DSN the apps have (T96): Sentry answers 200 and stores nothing when it
 * takes the DSN. Apps with the same DSN share one request; a DSN that is not one is the offline
 * check's (`sentryDsnChecks`).
 */
function sentryEnvelopes(envs: AppEnvs): OnlineRequests["sentry"] {
  const dsns = new Map<string, { apps: AppName[]; dsn: SentryDsn }>();
  for (const { app, name } of SENTRY_DSN_KEYS) {
    const value = (envs[app][name] ?? "").trim();
    const dsn = parseSentryDsn(value);
    if (dsn === undefined) continue;
    const entry = dsns.get(value) ?? { apps: [], dsn };
    entry.apps.push(app);
    dsns.set(value, entry);
  }
  return Promise.all(
    [...dsns.entries()].map(async ([value, { apps, dsn }]) => ({
      apps,
      dsn,
      answer: await request(dsn.envelopeUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-sentry-envelope",
          "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=shopblok-doctor/1`,
        },
        text: emptyEnvelope(value),
        timeoutMs: 15_000,
      }),
    })),
  );
}

/**
 * Resend's `GET /domains`, for the apps whose Resend part is set (both apps send e-mail: Medusa's
 * notifications, Payload's adapter). Apps with the same key and sender share one request and one
 * check; Resend's test sender, which is no account's domain, needs none. `RESEND_BASE_URL` points it
 * at a fake.
 */
function resendDomains(
  envs: AppEnvs,
  statuses: readonly IntegrationStatus[],
): OnlineRequests["resend"] {
  const base = trimSlash(process.env.RESEND_BASE_URL?.trim() || "https://api.resend.com");
  const parts = statuses.find((status) => status.id === "resend")?.parts ?? [];
  const senders = new Map<string, { apps: AppName[]; key: string; from: string | undefined }>();
  for (const { app } of parts.filter((part) => part.configured)) {
    const key = (envs[app].RESEND_API_KEY ?? "").trim();
    const from = envs[app].RESEND_FROM_EMAIL?.trim();
    const id = JSON.stringify([key, from]);
    const sender = senders.get(id) ?? { apps: [], key, from };
    sender.apps.push(app);
    senders.set(id, sender);
  }
  return Promise.all(
    [...senders.values()].map(async ({ apps, key, from }) => {
      const domain = senderDomain(from);
      const answer =
        domain === undefined || domain === "resend.dev"
          ? undefined
          : await request(`${base}/domains`, {
              headers: { Authorization: `Bearer ${key}` },
              timeoutMs: 15_000,
            });
      return { apps, from, answer };
    }),
  );
}

async function onlineChecks(
  online: OnlineRequests,
  medusaUrl: string,
  config: BackendMarkets | undefined,
  app: AppName | undefined,
): Promise<Check[]> {
  const [payloadAnswer, medusaAnswers, meiliStats] = await Promise.all([
    online.payload,
    online.medusa,
    online.meilisearch?.stats,
  ]);
  // `--app=backend`: the backend → Payload link only (Medusa's store API needs the storefront's
  // key, and the search index fills on the new server's first start). `--app=storefront`: Medusa
  // answers the storefront's key; the backend → Payload link is the backend's.
  const checks: Check[] = [];
  if (app !== "storefront")
    checks.push(
      payloadAuthCheck(online.payloadUrl, payloadAnswer, { fromBackendDeploy: app === "backend" }),
    );
  if (app === "backend") return checks;
  const medusa = medusaMarketsCheck(medusaUrl, medusaAnswers);
  checks.push(medusa.check);
  if (online.meilisearch !== undefined && meiliStats !== undefined) {
    checks.push(
      meilisearchLocalesCheck({
        host: online.meilisearch.host,
        prefix: online.meilisearch.prefix,
        locales: medusaAnswers?.locales,
        stats: meiliStats,
      }),
    );
  }
  if (medusa.regions === undefined) return checks;

  // Regions left behind by a market that was taken out of the file: not a search-index problem.
  const orphans = config === undefined ? [] : orphanRegions(medusa.regions, config);
  const orphanCheck = orphanRegionsCheck(orphans);
  if (orphanCheck !== undefined) checks.push(orphanCheck);

  // Every region's currency needs price fields in the search index (T08, D17).
  const entries = await Promise.all(
    searchCurrencies(medusa.regions, orphans).map(async (currency) => {
      const answer = await request(`${medusaUrl}/store/search`, {
        method: "POST",
        headers: online.headers,
        timeoutMs: 15_000,
        body: {
          entity: "product",
          filters: { q: "" },
          pagination: { take: 0 },
          search_options: { facets: [{ field: `min_price_${currency}`, type: "stats" }] },
        },
      });
      return { currency, state: searchFieldOf(currency, answer) };
    }),
  );
  checks.push(searchIndexCheck(entries));
  return checks;
}

try {
  process.exitCode = await main();
} catch (error) {
  // A bug in doctor itself, not a finding: say so plainly and fail.
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`doctor failed unexpectedly:\n${redact(message)}`);
  process.exitCode = 1;
}
