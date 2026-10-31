// `pnpm run doctor` (T14): is this setup healthy, and which integrations are on? Run with plain
// `node scripts/doctor.ts` (Node 22.18+ strips the types, so no enums or parameter properties here),
// on Linux, macOS and Windows. Never `pnpm doctor`: that is pnpm's own command.
//
//   pnpm run doctor [--online] [--json] [--strict]
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
import {
  configChecks,
  explainMedusaRun,
  medusaMarketsCheck,
  MEDUSA_RUN_TIMEOUT_MS,
  orphanRegions,
  orphanRegionsCheck,
  payloadAuthCheck,
  searchCurrencies,
  searchFieldOf,
  searchIndexCheck,
  type Context,
} from "./lib/doctor-checks.ts";
import { databaseFailed, serverCheck, serviceChecks } from "./lib/doctor-services.ts";
import { envValue } from "./lib/env-file.ts";
import { run } from "./lib/exec.ts";
import { jsonOf, request, type HttpResult } from "./lib/http.ts";
import {
  getIntegrationStatus,
  INTEGRATION_KEYS,
  isSet,
  type AppEnvs,
  type EnvLike,
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

const HELP = `pnpm run doctor [--online] [--json] [--strict]

Checks the setup and says which integrations are on. Writes nothing. (Run it as \`pnpm run doctor\`:
\`pnpm doctor\` is pnpm's own command.)

  --online   also call the running servers with the keys: Payload accepts the integrations key, and
             Medusa's regions, locales and search index match the market map (and, with a local
             backend running, the markets are read from GET /admin/markets as the bootstrap admin)
  --json     print the result as JSON (no secrets in it) and nothing else
  --strict   a warning fails the run too (the go-live check: SPEC §16, item 8)
  -h, --help this text

Exit codes: 0 no error (and, with --strict, no warning), 1 an error, 2 a bad option.`;

type Options = ReportOptions & { json: boolean };

function parseArgs(argv: string[]): Options | { error: string } | "help" {
  const options: Options = { online: false, json: false, strict: false };
  for (const arg of argv) {
    if (arg === "--online") options.online = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "-h" || arg === "--help") return "help";
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
  const result = await run(
    "pnpm",
    ["--filter", "@shopblok/backend", "exec", "medusa", "exec", "./src/scripts/doctor-markets.ts"],
    { cwd: root, env: { NO_COLOR: "1" }, timeoutMs: MEDUSA_RUN_TIMEOUT_MS },
  );
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

  const backendText = readText(backendEnvFile);
  const storefrontText = readText(storefrontEnvFile);
  const envs: AppEnvs = {
    backend: readAppEnv(backendText),
    storefront: readAppEnv(storefrontText),
  };
  const statuses = getIntegrationStatus(envs);
  const context: Context = {
    nodeEnv: envs.backend.NODE_ENV?.trim() || undefined,
    vercel: ["VERCEL", "VERCEL_ENV", "VERCEL_URL"].some((name) => isSet(envs.storefront, name)),
  };

  // Mailpit's ports are Docker Compose's variables: the shell or the root `.env`.
  const composeText = readText(path.join(root, ".env"));
  const targets = targetsFrom({
    DATABASE_URL: envs.backend.DATABASE_URL,
    PAYLOAD_DATABASE_URL: envs.storefront.PAYLOAD_DATABASE_URL,
    REDIS_URL: envs.backend.REDIS_URL,
    MEILISEARCH_HOST: envs.backend.MEILISEARCH_HOST,
    MAILPIT_SMTP_PORT: envValue(process.env, composeText, "MAILPIT_SMTP_PORT"),
    MAILPIT_UI_PORT: envValue(process.env, composeText, "MAILPIT_UI_PORT"),
  });

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
    async ([findings, health]): Promise<MarketsRead> => {
      if (databaseFailed(findings, targets, "medusa")) return { skipped: true };
      if (options.online && health.kind === "response" && health.status === 200) {
        const viaApi = await readMarketsApi(medusaUrl, backendText);
        if (viaApi !== undefined) return viaApi;
      }
      return readMarketsExec();
    },
  );
  // The `--online` requests need only the env, so they go out now, with the rest.
  const online = options.online ? startOnlineRequests(envs, medusaUrl) : undefined;
  const [findings, medusaHealth, storefrontHome, backendFile, read] = await Promise.all([
    serviceFindings,
    medusaHealthRequest,
    // The first request to `next dev` compiles the page, which takes several seconds.
    request(storefrontUrl, { timeoutMs: 30_000 }),
    loadExports(backendConfigFile, ["SUPPORTED_CURRENCIES", "MARKET_REGIONS", "SUPPORTED_LOCALES"]),
    marketsRead,
  ]);

  const checks = serviceChecks(findings, targets, statuses);
  checks.push(
    serverCheck("medusa", "Medusa backend", medusaUrl, medusaHealth, "Start it with `pnpm dev`."),
    serverCheck(
      "storefront",
      "Storefront",
      storefrontUrl,
      storefrontHome,
      "Start it with `pnpm dev`.",
    ),
    ...configChecks(envs, statuses, context),
  );

  const markets = marketsCheck(read);
  checks.push(markets.check);

  if (online !== undefined) {
    // `config/markets.ts` is the regions' seed input: the leftover-regions check reads it.
    const seeded = "error" in backendFile ? undefined : readBackendMarkets(backendFile.exports);
    checks.push(
      ...(await onlineChecks(online, medusaUrl, typeof seeded === "object" ? seeded : undefined)),
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
};

/**
 * The backend → Payload link, and Medusa's regions and locales with the storefront's key. They are
 * independent of each other and of everything `main` looks at, so they are all asked at once.
 */
function startOnlineRequests(envs: AppEnvs, medusaUrl: string): OnlineRequests {
  const payloadUrl = trimSlash((envs.backend.PAYLOAD_SERVER_URL ?? "").trim());
  const payloadKey = (envs.backend.PAYLOAD_API_KEY ?? "").trim();
  const key = (envs.storefront.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "").trim();
  const headers = { "x-publishable-api-key": key };
  return {
    payloadUrl,
    headers,
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
  };
}

async function onlineChecks(
  online: OnlineRequests,
  medusaUrl: string,
  config: BackendMarkets | undefined,
): Promise<Check[]> {
  const [payloadAnswer, medusaAnswers] = await Promise.all([online.payload, online.medusa]);
  const medusa = medusaMarketsCheck(medusaUrl, medusaAnswers);
  const checks = [payloadAuthCheck(online.payloadUrl, payloadAnswer), medusa.check];
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
