// `pnpm bootstrap` (T13): everything a fresh clone needs before `pnpm dev` works, in the order that
// matters, and safe to run again. Run with plain `node scripts/bootstrap.ts` (Node 22.18+ strips the
// types, so no enums or parameter properties here), on Linux, macOS and Windows.
//
//   pnpm bootstrap [--ci] [--no-demo] [--verbose]
//
// Every step ends as `✓ done`, `= unchanged` or `↷ skipped`. A second run on a finished setup has no
// `✓ done` in it. The decisions (what counts as unchanged, which port is whose) are in scripts/lib/
// with tests; this file runs the steps. The Payload half is apps/storefront/src/scripts/bootstrap-payload.ts.
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  dockerUnavailableWarning,
  inspectTargets,
  isLocalHost,
  satisfies,
  targetsFrom,
  type Finding,
} from "./lib/checks.ts";
import {
  changedAnything,
  generatePassword,
  generateSecret,
  envValue,
  getEnvValue,
  mergeEnv,
  type EnvChange,
} from "./lib/env-file.ts";
import { run, runPayload, type RunResult } from "./lib/exec.ts";
import {
  classifyMigrate,
  classifyPayloadMigrate,
  classifySeed,
  classifyUser,
  extractMarker,
  redact,
  tail,
} from "./lib/output.ts";

// ---------------------------------------------------------------------------------------------
// Options and places

const HELP = `pnpm bootstrap [--ci] [--no-demo] [--verbose]

Sets up a fresh clone: .env files, migrations, seeds, the admin users, the publishable key and the
\`markets\` global. Needs the compose stack (\`pnpm infra:up\`). Safe to run again.

  --ci         never prompt: commands get no stdin and CI=true, no live status line
  --no-demo    skip the demo catalog (development only anyway, D7)
  --verbose    show each command's output as it runs
  -h, --help   this text`;

type Options = { ci: boolean; demo: boolean; verbose: boolean };

function parseArgs(argv: string[]): Options | { error: string } | "help" {
  const options: Options = { ci: false, demo: true, verbose: false };
  for (const arg of argv) {
    if (arg === "--ci") options.ci = true;
    else if (arg === "--no-demo") options.demo = false;
    else if (arg === "--verbose") options.verbose = true;
    else if (arg === "-h" || arg === "--help") return "help";
    else return { error: `Unknown option ${arg}` };
  }
  return options;
}

const root = path.resolve(import.meta.dirname, "..");
const backendDir = path.join(root, "apps", "backend");
const storefrontDir = path.join(root, "apps", "storefront");

type EnvFile = { label: string; file: string; example: string };
const backendEnv: EnvFile = {
  label: "apps/backend/.env",
  file: path.join(backendDir, ".env"),
  example: path.join(backendDir, ".env.example"),
};
const storefrontEnv: EnvFile = {
  label: "apps/storefront/.env",
  file: path.join(storefrontDir, ".env"),
  example: path.join(storefrontDir, ".env.example"),
};

const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const PUBLISHABLE_KEY = "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY";

// ---------------------------------------------------------------------------------------------
// Steps

type Status = "done" | "unchanged" | "skipped";
type StepResult = { status: Status; detail?: string; notes?: string[] };

/** A step that cannot go on. Carries what to show: the cause, what to try, and the command's output. */
class StepError extends Error {
  hint: string | undefined;
  output: string | undefined;
  constructor(message: string, extra: { hint?: string; output?: string } = {}) {
    super(message);
    this.name = "StepError";
    this.hint = extra.hint;
    this.output = extra.output;
  }
}

/** What steps hand to later steps. */
type State = {
  admin: { email: string; password: string | undefined };
  payloadApiKey: string | undefined;
  publishableKeyChanged: boolean;
};

type Context = { options: Options; state: State };

const readText = (file: string): string | undefined =>
  existsSync(file) ? readFileSync(file, "utf8") : undefined;

function writeEnvFile(file: string, text: string): void {
  writeFileSync(file, text, { mode: 0o600 });
  // `mode` only applies to a file that is created; an older .env keeps whatever it had.
  try {
    chmodSync(file, 0o600);
  } catch {
    // Windows has no such modes.
  }
}

/** The current text of an .env file, or of its example while the file doesn't exist yet. */
function envTextOrExample(env: EnvFile): string {
  return readText(env.file) ?? readText(env.example) ?? "";
}

function describeChanges(changes: readonly EnvChange[]): string {
  return changes
    .filter((change) => change.action !== "kept")
    .map((change) => change.key)
    .join(", ");
}

/** How a Medusa or Payload command is run: from the repo root, with the options of this run. */
function commandOptions(ctx: Context, extraEnv: Record<string, string | undefined> = {}) {
  return {
    cwd: root,
    env: { ...(ctx.options.ci ? { CI: "true" } : {}), NO_COLOR: "1", ...extraEnv },
    stream: ctx.options.verbose,
  };
}

const medusa = (args: string[], ctx: Context) =>
  run("pnpm", ["--filter", "@shopblok/backend", "exec", "medusa", ...args], commandOptions(ctx));

const payload = (args: string[], ctx: Context, extraEnv: Record<string, string | undefined> = {}) =>
  runPayload(args, commandOptions(ctx, extraEnv));

function failed(what: string, result: RunResult, hint?: string): StepError {
  const why = result.prompt
    ? `asked "${result.prompt}", and bootstrap never answers prompts`
    : result.timedOut
      ? "timed out"
      : result.error
        ? `could not start (${result.error})`
        : `exited with code ${result.code}`;
  return new StepError(`${what} ${why}.`, { hint, output: result.output });
}

// ---- 1. Preflight ---------------------------------------------------------------------------

async function preflight(): Promise<StepResult> {
  const notes: string[] = [];
  const problems: string[] = [];

  // Versions: the same ranges package.json declares.
  const engines = (
    JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      engines?: { node?: string; pnpm?: string };
    }
  ).engines;
  if (engines?.node && !satisfies(process.versions.node, engines.node)) {
    problems.push(`Node ${process.versions.node} is outside ${engines.node} (see .nvmrc).`);
  }
  const pnpmVersion = await run("pnpm", ["--version"], { cwd: root, timeoutMs: 60_000 });
  const pnpmText = pnpmVersion.output.trim().split(/\r?\n/).at(-1) ?? "";
  if (pnpmVersion.code !== 0) {
    problems.push(`pnpm did not run (${pnpmVersion.error ?? pnpmText}).`);
  } else if (engines?.pnpm && !satisfies(pnpmText, engines.pnpm)) {
    problems.push(
      `pnpm ${pnpmText} is outside ${engines.pnpm}. Run \`npm install -g pnpm@12.10.1\`; with Corepack on, \`corepack disable\` first.`,
    );
  }

  // The ports the apps are configured for: what is in the shell wins over the .env files, which win
  // over their examples (dotenv never overrides a variable that is already set).
  const backendText = envTextOrExample(backendEnv);
  const storefrontText = envTextOrExample(storefrontEnv);
  // Mailpit's ports are Docker Compose's variables (infra/docker-compose.yml): the shell or the
  // root `.env`, which Compose reads, set them.
  const composeText = readText(path.join(root, ".env")) ?? "";
  const pick = (name: string, text: string) => envValue(process.env, text, name);
  const targets = targetsFrom({
    DATABASE_URL: pick("DATABASE_URL", backendText),
    PAYLOAD_DATABASE_URL: pick("PAYLOAD_DATABASE_URL", storefrontText),
    REDIS_URL: pick("REDIS_URL", backendText),
    MEILISEARCH_HOST: pick("MEILISEARCH_HOST", backendText),
    MAILPIT_SMTP_PORT: pick("MAILPIT_SMTP_PORT", composeText),
    MAILPIT_UI_PORT: pick("MAILPIT_UI_PORT", composeText),
  });

  const findings: Finding[] = await inspectTargets(targets, root);

  for (const finding of findings) {
    if (finding.level === "error") problems.push(finding.message);
  }
  const noDocker = dockerUnavailableWarning(findings);
  if (noDocker) notes.push(noDocker);
  if (problems.length > 0) {
    throw new StepError(problems.join("\n"), {
      hint: "Nothing was written. Fix the above and run `pnpm bootstrap` again.",
    });
  }

  // "Postgres :15432, Mailpit :1025/:8025": one entry per service, with each of its ports.
  const ports = new Map<string, string[]>();
  for (const finding of findings.filter((f) => f.level === "ok")) {
    const name = finding.target.label.split(" (")[0] ?? finding.target.label;
    const list = ports.get(name) ?? [];
    list.push(`:${finding.target.port}`);
    ports.set(name, [...new Set(list)]);
  }
  const detail = [...ports].map(([name, list]) => `${name} ${list.join("/")}`).join(", ");
  return { status: "unchanged", detail, notes };
}

// ---- 2. Env files ---------------------------------------------------------------------------

function envFiles(): StepResult {
  const created: string[] = [];
  const written: string[] = [];
  const notes: string[] = [];

  const texts = new Map<EnvFile, string>();
  for (const env of [backendEnv, storefrontEnv]) {
    const existing = readText(env.file);
    if (existing === undefined) {
      const example = readText(env.example);
      if (example === undefined) throw new StepError(`${env.label}.example is missing.`);
      texts.set(env, example);
      created.push(env.label);
    } else {
      texts.set(env, existing);
    }
  }

  // REVALIDATE_SECRET is one secret shared by both apps (SPEC §15): take the one that exists.
  const backendShared = getEnvValue(texts.get(backendEnv) ?? "", "REVALIDATE_SECRET") || undefined;
  const storefrontShared =
    getEnvValue(texts.get(storefrontEnv) ?? "", "REVALIDATE_SECRET") || undefined;
  if (backendShared && storefrontShared && backendShared !== storefrontShared) {
    notes.push(
      "REVALIDATE_SECRET differs between apps/backend/.env and apps/storefront/.env; Medusa's revalidation calls will be refused until they match. Not changed.",
    );
  }
  const shared = backendShared ?? storefrontShared ?? generateSecret();

  const wanted: [EnvFile, Record<string, string>][] = [
    [
      backendEnv,
      {
        JWT_SECRET: generateSecret(),
        COOKIE_SECRET: generateSecret(),
        REVALIDATE_SECRET: shared,
      },
    ],
    [
      storefrontEnv,
      {
        PAYLOAD_SECRET: generateSecret(),
        PREVIEW_SECRET: generateSecret(),
        CRON_SECRET: generateSecret(),
        REVALIDATE_SECRET: shared,
      },
    ],
  ];

  for (const [env, values] of wanted) {
    const before = texts.get(env) ?? "";
    const merged = mergeEnv(before, values);
    const keys = describeChanges(merged.changes);
    if (keys !== "") written.push(`${env.label}: ${keys}`);
    if (merged.text !== before || created.includes(env.label)) {
      writeEnvFile(env.file, merged.text);
    }
  }

  // The proxy fetches /next/markets from this address (T11), so the server must reach it itself.
  const baseUrl = getEnvValue(readText(storefrontEnv.file) ?? "", "NEXT_PUBLIC_BASE_URL");
  try {
    if (baseUrl && !isLocalHost(new URL(baseUrl).hostname)) {
      notes.push(
        `NEXT_PUBLIC_BASE_URL is ${baseUrl}: the proxy fetches the market map from it, so this server must be able to reach that address itself.`,
      );
    }
  } catch {
    notes.push(`NEXT_PUBLIC_BASE_URL (${baseUrl}) is not a URL.`);
  }

  if (created.length === 0 && written.length === 0) return { status: "unchanged", notes };
  const parts = [];
  if (created.length > 0) parts.push(`created ${created.join(", ")}`);
  if (written.length > 0) parts.push(`set ${written.join("; ")}`);
  return { status: "done", detail: parts.join("; "), notes };
}

// ---- 3. Medusa migrations -------------------------------------------------------------------

async function medusaMigrations(ctx: Context): Promise<StepResult> {
  // D17: this runs on every bootstrap and before the seeds. A currency added to
  // apps/backend/src/config/markets.ts changes the search index schema, and only db:migrate plans
  // the new index version (the next server start fills it).
  const result = await medusa(["db:migrate", "--execute-safe-links", "--execute-safe-search"], ctx);
  if (result.code !== 0) {
    throw failed(
      "`medusa db:migrate`",
      result,
      "Is Postgres up and DATABASE_URL right in apps/backend/.env?",
    );
  }
  const outcome = classifyMigrate(result.output);
  if (!outcome.changed) return { status: "unchanged" };
  return {
    status: "done",
    detail: outcome.searchIndexMigrated ? "search index rebuilt on the next start" : undefined,
  };
}

// ---- 4. Medusa seeds ------------------------------------------------------------------------

async function medusaSeeds(ctx: Context): Promise<StepResult> {
  const notes: string[] = [];
  const parts: string[] = [];
  let changed = false;

  // `medusa exec` exits 0 when the app cannot load its config (T07), so a run counts only when its
  // output says it finished.
  const seed = async (script: string, extra: string[] = []) => {
    const result = await medusa(["exec", `./src/scripts/${script}`, ...extra], ctx);
    const outcome = classifySeed(result.output);
    if (result.code !== 0 || !outcome.finished) {
      throw failed(
        `\`medusa exec ${script}\``,
        result,
        result.code === 0
          ? 'It exited 0 but never printed "Finished executing script.": the app could not load its config (check apps/backend/.env).'
          : undefined,
      );
    }
    notes.push(...outcome.warnings);
    return outcome;
  };

  const markets = await seed("seed-markets.ts");
  changed ||= markets.changed;
  parts.push(markets.changed ? "markets seeded" : "markets unchanged");

  // `medusa exec` takes only positional arguments, so the script reads `skip` (T07 item 4).
  const demo = await seed("seed-demo-catalog.ts", ctx.options.demo ? [] : ["skip"]);
  if (demo.skipped) {
    parts.push("demo catalog skipped");
  } else {
    changed ||= demo.changed;
    parts.push(demo.changed ? "demo catalog seeded" : "demo catalog unchanged");
  }

  return {
    status: changed ? "done" : "unchanged",
    detail: changed ? parts.join(", ") : undefined,
    notes,
  };
}

// ---- 5. Medusa admin user -------------------------------------------------------------------

async function adminUser(ctx: Context): Promise<StepResult> {
  const text = readText(backendEnv.file) ?? "";
  const email = getEnvValue(text, "DEV_ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL;
  const storedPassword = getEnvValue(text, "DEV_ADMIN_PASSWORD") || undefined;
  const password = storedPassword ?? generatePassword();
  ctx.state.admin = { email, password: storedPassword };

  // The password is on the command line, which `medusa user` requires; it is a development account.
  // `--password=<value>` and not `-p <value>`: the CLI (yargs) takes a value that starts with `-`
  // (a generated password can) for a flag, and the user would be made with an empty password.
  const result = await medusa(["user", `--email=${email}`, `--password=${password}`], ctx);
  const outcome = classifyUser(result.code, result.output);

  if (outcome === "failed") throw failed("`medusa user`", result);

  if (outcome === "exists") {
    if (storedPassword) return { status: "unchanged", detail: email };
    return {
      status: "unchanged",
      detail: email,
      notes: [
        `${email} already exists, and apps/backend/.env has no DEV_ADMIN_PASSWORD: bootstrap cannot know its password, so it writes none.`,
      ],
    };
  }

  const merged = mergeEnv(text, { DEV_ADMIN_EMAIL: email, DEV_ADMIN_PASSWORD: password });
  if (merged.text !== text) writeEnvFile(backendEnv.file, merged.text);
  ctx.state.admin = { email, password };
  return {
    status: "done",
    detail: `${email}, password in apps/backend/.env as DEV_ADMIN_PASSWORD`,
  };
}

// ---- 6. Publishable key ---------------------------------------------------------------------

async function publishableKey(ctx: Context): Promise<StepResult> {
  const result = await medusa(["exec", "./src/scripts/print-publishable-key.ts"], ctx);
  // Medusa's log lines share stdout with the script's one JSON line (T07), the way Payload's do.
  const found = extractMarker<unknown>(result.output, "publishableKey");
  const key = typeof found === "string" && found.startsWith("pk_") ? found : undefined;
  if (result.code !== 0 || key === undefined) {
    throw failed(
      "`print-publishable-key.ts`",
      result,
      key === undefined && result.code === 0
        ? 'It printed no {"publishableKey":…} line. Run the seeds first (step 4).'
        : undefined,
    );
  }

  // The key belongs to this database. A database that was wiped has a new one, so a key from the
  // earlier database is replaced (the only value bootstrap overwrites).
  const text = readText(storefrontEnv.file) ?? "";
  const merged = mergeEnv(text, { [PUBLISHABLE_KEY]: key }, { replace: [PUBLISHABLE_KEY] });
  const action = merged.changes[0]?.action ?? "kept";
  if (merged.text !== text) writeEnvFile(storefrontEnv.file, merged.text);
  if (!changedAnything(merged.changes)) return { status: "unchanged" };

  ctx.state.publishableKeyChanged = true;
  return {
    status: "done",
    detail:
      action === "replaced"
        ? "replaced the key of an earlier database"
        : "written to apps/storefront/.env",
    notes: [
      `${PUBLISHABLE_KEY} is written into the storefront by \`next build\`: build again (or restart \`next dev\`) after this change.`,
    ],
  };
}

// ---- 7. Payload migrations ------------------------------------------------------------------

async function payloadMigrations(ctx: Context): Promise<StepResult> {
  const result = await payload(["migrate"], ctx);
  if (result.code !== 0 || result.prompt) {
    const pushed = /dev mode|dynamically pushed/i.test(result.output);
    throw failed(
      "`payload migrate`",
      result,
      pushed
        ? "The payload database was changed by Payload's dev push (PAYLOAD_DB_PUSH=true), so `payload migrate` asks before it goes on, and bootstrap never answers prompts. Reset it with `pnpm infra:reset`, or answer the prompt yourself: `pnpm --filter @shopblok/storefront exec payload migrate`."
        : "Is Postgres up and PAYLOAD_DATABASE_URL right in apps/storefront/.env?",
    );
  }
  return { status: classifyPayloadMigrate(result.output).changed ? "done" : "unchanged" };
}

// ---- 8. Payload: first users and the markets global -----------------------------------------

type PayloadOutcome = {
  admin: "created" | "exists";
  generatedAdminPassword?: string;
  integration: "created" | "unchanged" | "rekeyed";
  markets: "seeded" | "unchanged";
  problems: string[];
};

async function payloadBootstrap(ctx: Context): Promise<StepResult> {
  const text = readText(backendEnv.file) ?? "";
  // The key lives only here: Payload stores a hash of it and never gives it back.
  const apiKey = getEnvValue(text, "PAYLOAD_API_KEY") || randomUUID();
  ctx.state.payloadApiKey = apiKey;

  const result = await payload(["run", "src/scripts/bootstrap-payload.ts"], ctx, {
    BOOTSTRAP_ADMIN_EMAIL: ctx.state.admin.email,
    BOOTSTRAP_ADMIN_PASSWORD: ctx.state.admin.password,
    BOOTSTRAP_PAYLOAD_API_KEY: apiKey,
  });
  const outcome = extractMarker<PayloadOutcome>(result.output, "bootstrapPayload");
  if (result.code !== 0 || outcome === undefined) {
    throw failed(
      "`payload run bootstrap-payload.ts`",
      result,
      result.code === 0 ? 'It printed no {"bootstrapPayload":…} result line.' : undefined,
    );
  }

  const notes = outcome.problems.map(
    (problem) => `The markets global is not usable as it is: ${problem}. Left as it is.`,
  );
  if (outcome.generatedAdminPassword) {
    notes.push(
      `The Medusa admin already existed without a stored password, so the Payload admin ${ctx.state.admin.email} was created with this password: ${outcome.generatedAdminPassword}`,
    );
  }

  const did: string[] = [];
  if (outcome.admin === "created") did.push("Payload admin created");
  if (outcome.integration === "created") did.push("integrations user created");
  if (outcome.integration === "rekeyed") did.push("integrations user given a new API key");
  if (outcome.markets === "seeded") did.push("markets global seeded");

  return did.length > 0
    ? { status: "done", detail: did.join(", "), notes }
    : { status: "unchanged", notes };
}

// ---- 9. Payload key -------------------------------------------------------------------------

function payloadKey(ctx: Context): StepResult {
  const apiKey = ctx.state.payloadApiKey;
  if (apiKey === undefined)
    throw new StepError("Step 8 did not run, so there is no Payload API key.");

  const text = readText(backendEnv.file) ?? "";
  const storefrontText = readText(storefrontEnv.file) ?? "";
  const baseUrl = getEnvValue(storefrontText, "NEXT_PUBLIC_BASE_URL") || "http://localhost:8000";
  const merged = mergeEnv(
    text,
    { PAYLOAD_API_KEY: apiKey, PAYLOAD_SERVER_URL: baseUrl },
    { replace: ["PAYLOAD_API_KEY"] },
  );
  if (merged.text !== text) writeEnvFile(backendEnv.file, merged.text);

  const notes: string[] = [];
  const serverUrl = getEnvValue(merged.text, "PAYLOAD_SERVER_URL");
  if (serverUrl && serverUrl !== baseUrl) {
    notes.push(
      `PAYLOAD_SERVER_URL (${serverUrl}) differs from the storefront's NEXT_PUBLIC_BASE_URL (${baseUrl}). Not changed.`,
    );
  }
  if (!changedAnything(merged.changes)) return { status: "unchanged", notes };
  return { status: "done", detail: describeChanges(merged.changes), notes };
}

// ---- 11. Payload content seed (T59) ---------------------------------------------------------

type SeedCounts = { created: number; updated: number; unchanged: number };

async function contentSeed(ctx: Context): Promise<StepResult> {
  const result = await payload(["run", "src/scripts/seed-content.ts"], ctx);
  const counts = extractMarker<SeedCounts>(result.output, "seedContent");
  if (result.code !== 0 || counts === undefined) {
    throw failed(
      "`payload run seed-content.ts`",
      result,
      result.code === 0 ? 'It printed no {"seedContent":…} result line.' : undefined,
    );
  }
  // An editor's change is never overwritten (`seededUpdate`), so "unchanged" covers those too.
  const did = [
    counts.created > 0 ? `${counts.created} created` : "",
    counts.updated > 0 ? `${counts.updated} updated` : "",
  ].filter(Boolean);
  return did.length > 0 ? { status: "done", detail: did.join(", ") } : { status: "unchanged" };
}

// ---- 12. Doctor -----------------------------------------------------------------------------

async function doctor(ctx: Context): Promise<StepResult> {
  // Doctor writes nothing, and a server that is not running yet is only a warning for it, so a
  // fresh bootstrap passes; a doctor error (Redis down, a wrong key) fails the run.
  const result = await run("pnpm", ["run", "doctor"], {
    cwd: root,
    env: ctx.options.ci ? { CI: "true" } : {},
    stream: true,
  });
  if (result.code !== 0) {
    // Its output is on the screen already (`stream`): don't print the last lines of it again.
    throw failed(
      "`pnpm run doctor`",
      { ...result, output: "" },
      "Doctor's table above says what is wrong.",
    );
  }
  return { status: "unchanged" };
}

// ---------------------------------------------------------------------------------------------
// Running

type Step = {
  number: number;
  name: string;
  run: (ctx: Context) => Promise<StepResult> | StepResult;
};

const STEPS: Step[] = [
  { number: 1, name: "Preflight", run: () => preflight() },
  { number: 2, name: "Env files", run: () => envFiles() },
  { number: 3, name: "Medusa migrations", run: medusaMigrations },
  { number: 4, name: "Medusa seeds", run: medusaSeeds },
  { number: 5, name: "Medusa admin user", run: adminUser },
  { number: 6, name: "Publishable key", run: publishableKey },
  { number: 7, name: "Payload migrations", run: payloadMigrations },
  { number: 8, name: "Payload users and markets", run: payloadBootstrap },
  { number: 9, name: "Payload key", run: payloadKey },
  {
    // Not built yet (SPEC §5 item 6): T60 builds the Medusa → Payload sync.
    number: 10,
    name: "Medusa → Payload sync",
    run: () => ({ status: "skipped", detail: "arrives with T60" }),
  },
  { number: 11, name: "Payload content seed", run: contentSeed },
  { number: 12, name: "Doctor", run: doctor },
];

const LABEL: Record<Status, string> = {
  done: "✓ done",
  unchanged: "= unchanged",
  skipped: "↷ skipped",
};
const TOTAL = 12;

const KEY_CHANGED_NOTE =
  "The publishable key changed: rebuild the storefront (`pnpm build`) or restart `pnpm dev`.";

function line(step: Step, result: StepResult, seconds: number): string {
  const detail = result.detail ? ` (${result.detail})` : "";
  const time = seconds >= 1 ? ` [${seconds.toFixed(1)} s]` : "";
  return `[${step.number}/${TOTAL}] ${step.name} … ${LABEL[result.status]}${detail}${time}`;
}

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
  const ctx: Context = {
    options,
    state: {
      admin: { email: DEFAULT_ADMIN_EMAIL, password: undefined },
      payloadApiKey: undefined,
      publishableKeyChanged: false,
    },
  };

  const started = Date.now();
  const counts: Record<Status, number> = { done: 0, unchanged: 0, skipped: 0 };
  // On a terminal, show which step is running; a log file only gets the result lines.
  const live = process.stdout.isTTY && !options.ci && !options.verbose;

  for (const step of STEPS) {
    const stepStarted = Date.now();
    if (live) process.stdout.write(`[${step.number}/${TOTAL}] ${step.name} …`);
    try {
      const result = await step.run(ctx);
      counts[result.status]++;
      if (live) process.stdout.write("\r\u001b[2K");
      console.log(line(step, result, (Date.now() - stepStarted) / 1000));
      for (const note of result.notes ?? []) console.log(`      ! ${note}`);
    } catch (error) {
      if (live) process.stdout.write("\r\u001b[2K");
      console.error(`[${step.number}/${TOTAL}] ${step.name} … ✗ failed`);
      if (error instanceof StepError) {
        console.error(error.message.replace(/^/gm, "      "));
        if (error.hint) console.error(error.hint.replace(/^/gm, "      "));
        if (error.output && !options.verbose) {
          console.error(
            `      Last lines of its output:\n${redact(tail(error.output, 25)).replace(/^/gm, "        ")}`,
          );
        }
      } else {
        console.error(
          `      ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        );
      }
      console.error(
        step.number === 1
          ? "\nbootstrap stopped before it changed anything. Run `pnpm bootstrap` again after fixing this."
          : `\nbootstrap stopped at step ${step.number}. The steps before it are done; run \`pnpm bootstrap\` again after fixing this.`,
      );
      // The key is already in the database and the env file, whatever step failed after it: a
      // second run finds it unchanged and would not say so.
      if (ctx.state.publishableKeyChanged) console.error(KEY_CHANGED_NOTE);
      return 1;
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nbootstrap finished in ${seconds} s: ${counts.done} done, ${counts.unchanged} unchanged, ${counts.skipped} skipped.`,
  );
  if (ctx.state.publishableKeyChanged) console.log(KEY_CHANGED_NOTE);
  // With no stored password (the Medusa admin existed before bootstrap wrote one) there is none to
  // point to: step 5 and step 8 said what happened.
  const passwordNote =
    ctx.state.admin.password === undefined
      ? "password not stored (see the notes under steps 5 and 8)"
      : "password in apps/backend/.env (DEV_ADMIN_PASSWORD)";
  console.log(
    [
      "Next: `pnpm dev`, then",
      "  storefront        http://localhost:8000  (Payload admin: /admin)",
      "  Medusa admin      http://localhost:9000/app",
      `  admin login       ${ctx.state.admin.email}, ${passwordNote}`,
    ].join("\n"),
  );
  return 0;
}

process.exitCode = await main();
