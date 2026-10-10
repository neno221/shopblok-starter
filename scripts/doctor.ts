// `pnpm run doctor` (T14): is this setup healthy, and which integrations are on? Run with plain
// `node scripts/doctor.ts` (Node 22.18+ strips the types, so no enums or parameter properties here),
// on Linux, macOS and Windows. Never `pnpm doctor`: that is pnpm's own command.
//
//   pnpm run doctor [--online] [--json] [--strict]
//
// It writes nothing: no file, no row, no migration. The one command it runs that touches the
// database is `payload run` (to read the `markets` global), and that runs as production does, which
// never creates a missing database. The decisions are in scripts/lib/ (doctor-checks.ts,
// integrations.ts, markets-check.ts) with tests; this file looks at the machine and wires them up.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  addressOf,
  dockerUnavailableWarning,
  inspectTargets,
  isLocalHost,
  targetsFrom,
  type Finding,
  type Target,
} from "./lib/checks.ts";
import {
  classifyPayloadAuth,
  classifySearchField,
  compareWithMedusa,
  configChecks,
  explainPayloadFailure,
  orphanRegions,
  readLocales,
  readRegions,
  type Context,
} from "./lib/doctor-checks.ts";
import { getEnvValue } from "./lib/env-file.ts";
import { retryWhileSilent, run } from "./lib/exec.ts";
import { jsonOf, request, type HttpResult } from "./lib/http.ts";
import {
  getIntegrationStatus,
  INTEGRATION_KEYS,
  type AppEnvs,
  type EnvLike,
  type IntegrationStatus,
} from "./lib/integrations.ts";
import { loadExports } from "./lib/load-exports.ts";
import {
  compareMarkets,
  MARKETS_FIX,
  readBackendMarkets,
  readMarketMap,
  type BackendMarkets,
  type MarketMapData,
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
    env[key] = process.env[key] ?? getEnvValue(text, key);
  }
  return env;
}

// ---------------------------------------------------------------------------------------------
// Services

/** Postgres and Redis must be up for anything to work; the others are not used before M3 and M6. */
function isRequired(target: Target, statuses: readonly IntegrationStatus[]): boolean {
  if (target.kind === "postgres" || target.kind === "redis") return true;
  if (target.kind === "meilisearch") {
    return statuses.find((status) => status.id === "meilisearch")?.state === "live";
  }
  return false;
}

function checkIdOf(target: Target, all: readonly Target[]): string {
  if (target.kind === "postgres") {
    return all.filter((t) => t.kind === "postgres").length > 1
      ? `postgres-${target.label.includes("payload") ? "payload" : "medusa"}`
      : "postgres";
  }
  return target.kind;
}

function serviceChecks(
  findings: readonly Finding[],
  targets: readonly Target[],
  statuses: readonly IntegrationStatus[],
): Check[] {
  const checks: Check[] = findings.map((finding) => {
    const { target } = finding;
    // A service that is optional for now and fails to answer is a warning, not a stopped setup.
    const level =
      finding.level === "error" && !isRequired(target, statuses) ? "warn" : finding.level;
    const unchecked = finding.dockerReason !== undefined;
    return {
      id: checkIdOf(target, targets),
      title: target.label,
      // The one Docker warning below carries the sentence; this line only says the port answers.
      level: unchecked ? "ok" : level,
      message: unchecked
        ? `answers at ${addressOf(target)} (its owner is not checked: Docker is not available)`
        : level === "ok"
          ? finding.message.replace(`${target.label} at `, "")
          : finding.message,
    };
  });
  const noDocker = dockerUnavailableWarning(findings);
  if (noDocker) {
    checks.push({
      id: "docker",
      title: "Docker",
      level: "warn",
      message: noDocker,
      fix: "Start Docker to check that the ports are this project's (D15).",
    });
  }
  return checks;
}

// ---------------------------------------------------------------------------------------------
// The two apps

const trimSlash = (url: string): string => url.replace(/\/+$/, "");

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^\[(.*)\]$/, "$1");
  } catch {
    return undefined;
  }
}

/**
 * A server that should be running. Not running on this machine is a warning, because a fresh
 * `pnpm bootstrap` runs doctor before anything is started (a doctor that complained then would break
 * bootstrap); a server that answers with an error, or a remote one that does not answer, is an error.
 */
function serverCheck(
  id: string,
  title: string,
  url: string,
  result: HttpResult,
  starts: string,
): Check {
  const host = hostOf(url);
  const local = host !== undefined && isLocalHost(host);
  if (result.kind === "response") {
    // A redirect is an answer too: the storefront may send `/` to a market.
    return result.status < 400
      ? { id, title, level: "ok", message: `answers at ${url} (HTTP ${result.status})` }
      : {
          id,
          title,
          level: "error",
          message: `${url} answers HTTP ${result.status}.`,
          fix: `Look at the server's log. ${starts}`,
        };
  }
  if (result.kind === "refused" && local) {
    return {
      id,
      title,
      level: "warn",
      message: `not running at ${url}.`,
      fix: starts,
    };
  }
  return {
    id,
    title,
    level: "error",
    message:
      result.kind === "refused"
        ? `nothing is listening at ${url}.`
        : `${url} does not answer (${result.reason}).`,
    // "Start it with pnpm dev" is for a server on this machine.
    fix: local ? starts : `Check that ${url} is the right address and that the server is up.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Markets

type MapSource = "global" | "fixtures";

async function loadFixturesMap(): Promise<MarketMapData | string> {
  const loaded = await loadExports(fixturesFile, ["markets"]);
  if ("error" in loaded) return `could not read packages/fixtures/src/markets.ts (${loaded.error})`;
  return readMarketMap(loaded.exports.markets);
}

/** `payload run`: the `markets` global, as `getMarketMap()` reads it. Runs as production (no database is created). */
async function readMarketsGlobal(): Promise<
  { ok: true; map: MarketMapData; problems: string[] } | { ok: false; cause: string; fix: string }
> {
  // Payload's CLI sometimes exits 0 in silence (see `exitedInSilence`): read-only, so run it again.
  const result = await retryWhileSilent(() =>
    run(
      "pnpm",
      [
        "--filter",
        "@shopblok/storefront",
        "exec",
        "payload",
        "run",
        "src/scripts/doctor-payload.ts",
      ],
      {
        cwd: root,
        // NODE_ENV=production only to switch off Payload's creation of a missing database
        // (`disableCreateDatabase` in payload.config.ts): doctor must not write.
        env: { NODE_ENV: "production", NO_COLOR: "1" },
        timeoutMs: 60_000,
      },
    ),
  );
  const found = extractMarker<{ map: unknown; problems: string[] }>(result.output, "doctorPayload");
  if (result.code === 0 && found !== undefined) {
    const map = readMarketMap(found.map);
    if (typeof map === "string")
      return {
        ok: false,
        cause: map,
        fix: "Doctor and the storefront disagree about the global's shape.",
      };
    return { ok: true, map, problems: found.problems };
  }
  if (result.prompt !== undefined) {
    return { ok: false, cause: `Payload asked "${result.prompt}"`, fix: "Run `pnpm bootstrap`." };
  }
  if (result.timedOut) {
    return {
      ok: false,
      cause: "Payload did not start within 60 s",
      fix: "Check that the database answers (`pnpm infra:up`).",
    };
  }
  return { ok: false, ...explainPayloadFailure(result.output) };
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
    vercel: ["VERCEL", "VERCEL_ENV", "VERCEL_URL"].some(
      (name) => (envs.storefront[name] ?? "").trim() !== "",
    ),
  };

  // Mailpit's ports are Docker Compose's variables: the shell or the root `.env`.
  const composeText = readText(path.join(root, ".env"));
  const pick = (name: string) => process.env[name] ?? getEnvValue(composeText, name);
  const targets = targetsFrom({
    DATABASE_URL: envs.backend.DATABASE_URL,
    PAYLOAD_DATABASE_URL: envs.storefront.PAYLOAD_DATABASE_URL,
    REDIS_URL: envs.backend.REDIS_URL,
    MEILISEARCH_HOST: envs.backend.MEILISEARCH_HOST,
    MAILPIT_SMTP_PORT: pick("MAILPIT_SMTP_PORT"),
    MAILPIT_UI_PORT: pick("MAILPIT_UI_PORT"),
  });

  const medusaUrl = trimSlash(
    (envs.storefront.MEDUSA_BACKEND_URL || envs.backend.MEDUSA_BACKEND_URL || "").trim() ||
      "http://localhost:9000",
  );
  const storefrontUrl = trimSlash(
    (envs.storefront.NEXT_PUBLIC_BASE_URL ?? "").trim() || "http://localhost:8000",
  );

  // Looking at the machine: the services, the two servers and the backend's own file, together.
  const [findings, medusaHealth, storefrontHome, backendFile, fixtures] = await Promise.all([
    inspectTargets(targets, root),
    request(`${medusaUrl}/health`, { timeoutMs: 5000 }),
    // The first request to `next dev` compiles the page, which takes several seconds.
    request(storefrontUrl, { timeoutMs: 30_000 }),
    loadExports(backendConfigFile, ["SUPPORTED_CURRENCIES", "MARKET_REGIONS", "SUPPORTED_LOCALES"]),
    loadFixturesMap(),
  ]);

  const checks: Check[] = [];
  checks.push(...serviceChecks(findings, targets, statuses));
  checks.push(
    serverCheck("medusa", "Medusa backend", medusaUrl, medusaHealth, "Start it with `pnpm dev`."),
    serverCheck(
      "storefront",
      "Storefront",
      storefrontUrl,
      storefrontHome,
      "Start it with `pnpm dev`.",
    ),
  );
  checks.push(...configChecks(envs, statuses, context));

  // The markets global: only when the payload database is there to be asked.
  const payloadTarget = targets.find((t) => t.kind === "postgres" && t.label.includes("payload"));
  const payloadFinding = findings.find((f) => f.target === payloadTarget);
  let map: MarketMapData | undefined;
  let source: MapSource = "fixtures";
  if (payloadFinding?.level === "error") {
    checks.push({
      id: "markets-global",
      title: "Markets global",
      level: "warn",
      message: "not read: the Postgres check above failed, so Payload was not started.",
    });
  } else {
    const read = await readMarketsGlobal();
    if (!read.ok) {
      checks.push({
        id: "markets-global",
        title: "Markets global",
        level: "error",
        message: `could not read it: ${read.cause}.`,
        fix: read.fix,
      });
    } else if (read.map.countries.length === 0) {
      checks.push({
        id: "markets-global",
        title: "Markets global",
        level: "warn",
        message:
          "the `markets` global is empty, so development and `next build` use the seeded fixtures (and say so); a production server answers 500 on every page.",
        fix: "Run `pnpm bootstrap`, which fills it, or add the countries in the Payload admin.",
      });
    } else {
      map = read.map;
      source = "global";
      checks.push(
        read.problems.length === 0
          ? {
              id: "markets-global",
              title: "Markets global",
              level: "ok",
              message: `${read.map.countries.filter((c) => c.enabled).length} open countries, ${read.map.languages.length} languages.`,
            }
          : {
              id: "markets-global",
              title: "Markets global",
              level: "warn",
              message:
                "the global is filled in but cannot serve a shop as it is (the storefront keeps the last good map, or the fixtures in development).",
              details: read.problems,
              fix: "Fix it in the Payload admin under Globals → Markets.",
            },
      );
    }
  }

  // D17 and D19: the backend's list against the storefront's map.
  let backend: BackendMarkets | undefined;
  if ("error" in backendFile) {
    checks.push({
      id: "markets-sync",
      title: "Markets: backend and storefront",
      level: "warn",
      message: `could not read apps/backend/src/config/markets.ts (${backendFile.error}).`,
    });
  } else {
    const read = readBackendMarkets(backendFile.exports);
    if (typeof read === "string") {
      checks.push({
        id: "markets-sync",
        title: "Markets: backend and storefront",
        level: "warn",
        message: `apps/backend/src/config/markets.ts is not what doctor expects: ${read}.`,
      });
    } else {
      backend = read;
    }
  }
  if (backend !== undefined) {
    if (map === undefined) {
      if (typeof fixtures === "string") {
        checks.push({
          id: "markets-sync",
          title: "Markets: backend and storefront",
          level: "warn",
          message: fixtures,
        });
      } else {
        map = fixtures;
      }
    }
    if (map !== undefined) {
      const problems = compareMarkets(backend, map);
      const where = source === "global" ? "the markets global" : "the seeded fixtures";
      checks.push(
        problems.length === 0
          ? {
              id: "markets-sync",
              title: "Markets: backend and storefront",
              level: "ok",
              message: `apps/backend/src/config/markets.ts and ${where} list the same countries and languages.`,
            }
          : {
              id: "markets-sync",
              title: "Markets: backend and storefront",
              level: "warn",
              message: `apps/backend/src/config/markets.ts and ${where} disagree (D17).`,
              details: problems,
              fix: MARKETS_FIX,
            },
      );
    }
  }

  if (options.online) {
    checks.push(...(await onlineChecks(envs, medusaUrl, map, backend)));
  }

  const report: Report = { integrations: statuses, checks };
  console.log(options.json ? renderJson(report, options) : renderText(report, options));
  return exitCodeOf(report, options);
}

// ---------------------------------------------------------------------------------------------
// --online

async function onlineChecks(
  envs: AppEnvs,
  medusaUrl: string,
  map: MarketMapData | undefined,
  config: BackendMarkets | undefined,
): Promise<Check[]> {
  const checks: Check[] = [];

  // 1. The backend → Payload link: the key the Medusa sync will use.
  const payloadUrl = trimSlash((envs.backend.PAYLOAD_SERVER_URL ?? "").trim());
  const payloadKey = (envs.backend.PAYLOAD_API_KEY ?? "").trim();
  if (payloadUrl === "" || payloadKey === "") {
    checks.push({
      id: "payload-auth",
      title: "Payload accepts the integrations key",
      level: "warn",
      message: "not checked: PAYLOAD_SERVER_URL or PAYLOAD_API_KEY is not set in the backend.",
      fix: "Run `pnpm bootstrap`.",
    });
  } else {
    const answer = await request(`${payloadUrl}/api/integrations/me`, {
      headers: { Authorization: `integrations API-Key ${payloadKey}` },
      timeoutMs: 30_000,
    });
    if (answer.kind !== "response") {
      checks.push({
        id: "payload-auth",
        title: "Payload accepts the integrations key",
        level: "warn",
        message: `not checked: ${payloadUrl} ${answer.kind === "refused" ? "is not running" : `does not answer (${answer.reason})`}.`,
        fix: "Start the storefront (Payload is embedded in it) with `pnpm dev`.",
      });
    } else {
      const verdict = classifyPayloadAuth({ status: answer.status, body: jsonOf(answer) });
      checks.push(
        verdict === "ok"
          ? {
              id: "payload-auth",
              title: "Payload accepts the integrations key",
              level: "ok",
              message: `GET ${payloadUrl}/api/integrations/me answers as the integrations user.`,
            }
          : {
              id: "payload-auth",
              title: "Payload accepts the integrations key",
              level: "error",
              message:
                verdict === "rejected"
                  ? `Payload at ${payloadUrl} does not accept PAYLOAD_API_KEY.`
                  : `GET ${payloadUrl}/api/integrations/me answered HTTP ${answer.status}, not a user.`,
              fix: "Run `pnpm bootstrap`: it sets the key again on the `integrations` user (a wiped database or a new PAYLOAD_SECRET invalidates it).",
            },
      );
    }
  }

  // 2. Medusa itself, with the storefront's key: regions, locales, and the search index.
  const key = (envs.storefront.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "").trim();
  if (key === "") {
    checks.push({
      id: "medusa-markets",
      title: "Medusa matches the storefront's map",
      level: "warn",
      message: "not checked: the storefront has no publishable key.",
      fix: "Run `pnpm bootstrap`.",
    });
    return checks;
  }
  const headers = { "x-publishable-api-key": key };
  const regionsAnswer = await request(
    `${medusaUrl}/store/regions?fields=id,name,currency_code,*countries`,
    { headers, timeoutMs: 15_000 },
  );
  if (regionsAnswer.kind !== "response") {
    checks.push({
      id: "medusa-markets",
      title: "Medusa matches the storefront's map",
      level: "warn",
      message: `not checked: Medusa at ${medusaUrl} ${regionsAnswer.kind === "refused" ? "is not running" : `does not answer (${regionsAnswer.reason})`}.`,
      fix: "Start it with `pnpm dev`.",
    });
    return checks;
  }
  const regions = readRegions({ status: regionsAnswer.status, body: jsonOf(regionsAnswer) });
  if (typeof regions === "string") {
    checks.push({
      id: "medusa-markets",
      title: "Medusa matches the storefront's map",
      level: "error",
      message: `GET /store/regions with the storefront's key failed: ${regions}.`,
      fix: "The key belongs to the database. Run `pnpm bootstrap` (it writes the current key), then build the storefront again.",
    });
    return checks;
  }
  const localesAnswer = await request(`${medusaUrl}/store/locales`, { headers, timeoutMs: 15_000 });
  const locales = readLocales({
    status: localesAnswer.kind === "response" ? localesAnswer.status : 0,
    body: jsonOf(localesAnswer),
  });

  if (map !== undefined && typeof locales !== "string") {
    const problems = compareWithMedusa({ regions, locales }, map);
    checks.push(
      problems.length === 0
        ? {
            id: "medusa-markets",
            title: "Medusa matches the storefront's map",
            level: "ok",
            message: `${regions.length} regions and ${locales.length} locales cover every open country and language.`,
          }
        : {
            id: "medusa-markets",
            title: "Medusa matches the storefront's map",
            level: "warn",
            message: "the running Medusa does not have what the storefront's map expects (D17).",
            details: problems,
            fix: "Run `pnpm bootstrap`: it seeds the regions and locales from apps/backend/src/config/markets.ts.",
          },
    );
  }

  // Regions left behind by a market that was taken out of the file: not a search-index problem.
  const orphans = config === undefined ? [] : orphanRegions(regions, config);
  if (orphans.length > 0) {
    checks.push({
      id: "medusa-orphans",
      title: "Medusa regions left over",
      level: "warn",
      message: `Medusa has ${orphans.length === 1 ? "a region" : "regions"} that apps/backend/src/config/markets.ts does not list: the seed adds regions and never removes one.`,
      details: orphans.map(
        (region) => `"${region.name}" (${region.currency}): ${region.countries.join(", ")}`,
      ),
      fix: "Delete them in the Medusa admin (Settings → Regions), or add the market back to the file.",
    });
  }

  // 3. Every region's currency needs price fields in the search index (T08, D17). A leftover
  // region's currency is not in the file, so the index does not have it and should not.
  const orphanCurrencies = new Set(orphans.map((region) => region.currency));
  const currencies = [
    ...new Set(
      regions
        .map((region) => region.currency)
        .filter((currency) => currency !== "" && !orphanCurrencies.has(currency)),
    ),
  ];
  const missing: string[] = [];
  const unknown: string[] = [];
  const answers = await Promise.all(
    currencies.map(async (currency) => {
      const field = `min_price_${currency}`;
      const answer = await request(`${medusaUrl}/store/search`, {
        method: "POST",
        headers,
        timeoutMs: 15_000,
        body: {
          entity: "product",
          filters: { q: "" },
          pagination: { take: 0 },
          search_options: { facets: [{ field, type: "stats" }] },
        },
      });
      return { currency, field, answer };
    }),
  );
  for (const { currency, field, answer } of answers) {
    if (answer.kind !== "response") {
      unknown.push(`${currency}: Medusa did not answer`);
      continue;
    }
    const state = classifySearchField(field, { status: answer.status, body: jsonOf(answer) });
    if (state.state === "missing") missing.push(currency);
    else if (state.state === "unknown") unknown.push(`${currency}: ${state.detail}`);
  }
  if (missing.length > 0) {
    checks.push({
      id: "search-index",
      title: "Search index currencies",
      level: "warn",
      message: `Medusa has regions in ${missing.join(", ")}, but the search index has no price fields for ${missing.length === 1 ? "it" : "them"}, so price filtering and sorting in ${missing.length === 1 ? "that currency" : "those currencies"} fail.`,
      fix: "Run `medusa db:migrate` (or `pnpm bootstrap`, which does) and restart the backend: a new currency only reaches the index through a migration (D17, T08).",
    });
  } else if (unknown.length > 0) {
    checks.push({
      id: "search-index",
      title: "Search index currencies",
      level: "warn",
      message:
        "could not tell whether the search index has a price field for every region's currency.",
      details: unknown,
    });
  } else {
    checks.push({
      id: "search-index",
      title: "Search index currencies",
      level: "ok",
      message: `min_price_<currency> exists for ${currencies.join(", ")}.`,
    });
  }
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
