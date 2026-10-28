// `pnpm run doctor` (T14): is this setup healthy, and which integrations are on? Run with plain
// `node scripts/doctor.ts` (Node 22.18+ strips the types, so no enums or parameter properties here),
// on Linux, macOS and Windows. Never `pnpm doctor`: that is pnpm's own command.
//
//   pnpm run doctor [--online] [--json] [--strict]
//
// It writes nothing: no file, no row, no migration. The one command it runs that touches the
// database is `payload run` (to read the `markets` global), and that runs as production does, which
// never creates a missing database. The decisions are in scripts/lib/ (doctor-checks.ts,
// doctor-services.ts, integrations.ts, markets-check.ts) with tests; this file looks at the machine
// and wires them up.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inspectTargets, targetsFrom } from "./lib/checks.ts";
import {
  configChecks,
  explainPayloadRun,
  medusaMarketsCheck,
  orphanRegions,
  orphanRegionsCheck,
  payloadAuthCheck,
  PAYLOAD_RUN_TIMEOUT_MS,
  searchCurrencies,
  searchFieldOf,
  searchIndexCheck,
  type Context,
} from "./lib/doctor-checks.ts";
import { payloadDatabaseFailed, serverCheck, serviceChecks } from "./lib/doctor-services.ts";
import { envValue } from "./lib/env-file.ts";
import { runPayload } from "./lib/exec.ts";
import { request, type HttpResult } from "./lib/http.ts";
import {
  getIntegrationStatus,
  INTEGRATION_KEYS,
  isSet,
  type AppEnvs,
  type EnvLike,
} from "./lib/integrations.ts";
import { loadExports } from "./lib/load-exports.ts";
import {
  marketsGlobalCheck,
  marketsSyncCheck,
  readMarketMap,
  type BackendMarkets,
  type MarketMapData,
  type MarketsGlobalRead,
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
             Medusa's regions, locales and search index match the storefront's market map
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
const fixturesFile = path.join(root, "packages", "fixtures", "src", "markets.ts");

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

async function loadFixturesMap(): Promise<MarketMapData | string> {
  const loaded = await loadExports(fixturesFile, ["markets"]);
  if ("error" in loaded) return `could not read packages/fixtures/src/markets.ts (${loaded.error})`;
  return readMarketMap(loaded.exports.markets);
}

/** `payload run`: the `markets` global, as `getMarketMap()` reads it. Runs as production (no database is created). */
async function readMarketsGlobal(): Promise<MarketsGlobalRead> {
  // `runPayload` repeats the run when Payload's CLI exits 0 in silence (see `exitedInSilence`);
  // this one only reads, so that is safe.
  const result = await runPayload(["run", "src/scripts/doctor-payload.ts"], {
    cwd: root,
    // NODE_ENV=production only to switch off Payload's creation of a missing database
    // (`disableCreateDatabase` in payload.config.ts): doctor must not write.
    env: { NODE_ENV: "production", NO_COLOR: "1" },
    timeoutMs: PAYLOAD_RUN_TIMEOUT_MS,
  });
  const found = extractMarker<{ map: unknown; problems: string[] }>(result.output, "doctorPayload");
  if (result.code === 0 && found !== undefined) {
    const map = readMarketMap(found.map);
    if (typeof map === "string") {
      return {
        ok: false,
        cause: map,
        fix: "Doctor and the storefront disagree about the global's shape.",
      };
    }
    return { ok: true, map, problems: found.problems };
  }
  return { ok: false, ...explainPayloadRun(result) };
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
  // the markets global. Payload's read (the slowest, about 2.5 s) waits only for the Postgres
  // check, not for the storefront, which may take several seconds to compile its first page.
  const serviceFindings = inspectTargets(targets, root);
  const marketsRead = serviceFindings.then(async (findings): Promise<MarketsGlobalRead> =>
    payloadDatabaseFailed(findings, targets) ? { skipped: true } : readMarketsGlobal(),
  );
  // The `--online` requests need only the env, so they go out now, with the rest.
  const online = options.online ? startOnlineRequests(envs, medusaUrl) : undefined;
  const [findings, medusaHealth, storefrontHome, backendFile, fixtures, read] = await Promise.all([
    serviceFindings,
    request(`${medusaUrl}/health`, { timeoutMs: 5000 }),
    // The first request to `next dev` compiles the page, which takes several seconds.
    request(storefrontUrl, { timeoutMs: 30_000 }),
    loadExports(backendConfigFile, ["SUPPORTED_CURRENCIES", "MARKET_REGIONS", "SUPPORTED_LOCALES"]),
    loadFixturesMap(),
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

  const globalMarkets = marketsGlobalCheck(read);
  const sync = marketsSyncCheck({ backendFile, fixtures, global: globalMarkets.map });
  checks.push(globalMarkets.check, sync.check);

  if (online !== undefined) {
    checks.push(...(await onlineChecks(online, medusaUrl, sync.map, sync.backend)));
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
  map: MarketMapData | undefined,
  config: BackendMarkets | undefined,
): Promise<Check[]> {
  const [payloadAnswer, medusaAnswers] = await Promise.all([online.payload, online.medusa]);
  const medusa = medusaMarketsCheck(medusaUrl, medusaAnswers, map);
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
