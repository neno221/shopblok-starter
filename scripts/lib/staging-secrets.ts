// `pnpm staging:secrets` (M7 D134, T114): generates staging's secrets and writes them, with the
// integrations' test keys and Payload's database address, straight into Railway's `staging`
// environment and Vercel's Production and Preview environments, through their APIs. The runner is
// here, with every platform call behind `fetch`, so its test drives it against stand-ins for
// Vercel, Railway and Stripe; `scripts/staging-secrets.ts` is the command.
//
// What it promises:
// - it acts only on the projects in STAGING_VERCEL_PROJECT_ID and STAGING_RAILWAY_PROJECT_ID, on
//   Railway's `staging` environment, and checks both before its first write;
// - it prints names and outcomes only: every line goes through `maskKeys` (scripts/mask-keys.ts's
//   masking) with every value it has generated, copied or been given;
// - it never reads a secret back: whether a secret is set already is told by the fingerprints
//   (SHOPBLOK_SECRET_FINGERPRINTS, a plain variable on Vercel, no secret) and Vercel's names. The
//   two values it has to read are the ones it copies: Payload's database address from Railway
//   (to Vercel) and Stripe's new webhook secret (to Railway), neither of which it prints or keeps.
import {
  FINGERPRINTS_VARIABLE,
  SECRETS,
  fingerprint,
  formatFingerprints,
  generateValue,
  parseFingerprints,
  postgresTls,
  type SecretSpec,
} from "./deploy-secrets.ts";
import { deployVariables } from "./deploy-variables.ts";
import { maskKeys } from "./no-keys.ts";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type Env = Readonly<Record<string, string | undefined>>;

export const VERCEL_API = "https://api.vercel.com";
export const RAILWAY_API = "https://backboard.railway.com/graphql/v2";
export const STRIPE_API = "https://api.stripe.com";

/** The Railway environment this script writes to; any other is refused (D134). */
export const RAILWAY_ENVIRONMENT = "staging";
/** Railway's services, as `.railway/railway.ts` names them. */
export const RAILWAY_SERVICES = {
  backend: ["medusa", "medusa-worker"],
  meilisearch: ["meilisearch"],
  payloadDatabase: "payload-postgres",
  server: "medusa",
} as const;
/** What staging's Vercel project builds (G11): this repository's storefront. */
export const STOREFRONT_REPOSITORY = "neno221/shopblok-starter";
export const STOREFRONT_ROOT = "apps/storefront";
/** Vercel's environments a staging variable is written to (D132: Production is staging). */
export const VERCEL_TARGETS = ["production", "preview"] as const;

/** Where Medusa's Stripe provider takes its webhooks, and the events it handles. */
export const STRIPE_WEBHOOK_PATH = "/hooks/payment/stripe_stripe";
export const STRIPE_EVENTS = [
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.partially_funded",
] as const;
/** The fingerprints' record that the webhook's secret is stored (it is no table secret). */
export const WEBHOOK_RECORD = "STRIPE_WEBHOOK_SECRET";

export const HELP = `pnpm staging:secrets [--dry-run] [--rotate=<NAME> [--force]]

Generates staging's secrets and sets them, the integrations' test keys and Payload's database
address in Railway's staging environment and Vercel's Production and Preview (D134). Prints names
only. Needs VERCEL_TOKEN, RAILWAY_TOKEN (the staging environment's project token),
STAGING_VERCEL_PROJECT_ID and STAGING_RAILWAY_PROJECT_ID, and acts on those two projects only.

  --dry-run        say what it would do; writes nothing
  --rotate=<NAME>  a new value for one secret of the table, by its rotation rule
                   (AUTH_MFA_ENCRYPTION_KEY locks out enrolled admins: only with --force)
  -h, --help       this text`;

export type Options = { dryRun: boolean; rotate: string | undefined; force: boolean };

export function parseArgs(argv: readonly string[]): Options | "help" | { error: string } {
  const options: Options = { dryRun: false, rotate: undefined, force: false };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg.startsWith("--rotate=")) options.rotate = arg.slice("--rotate=".length).trim();
    else if (arg === "-h" || arg === "--help") return "help";
    else return { error: `Unknown option ${arg}` };
  }
  if (options.rotate !== undefined) {
    const spec = SECRETS.find((each) => each.name === options.rotate);
    if (spec === undefined)
      return {
        error: `--rotate takes one of the table's names: ${SECRETS.map((each) => each.name).join(", ")}.`,
      };
    if (spec.rotation === "lock-out" && !options.force)
      return {
        error: `${spec.name}: ${spec.effect}. Run it again with --force if that is what you want.`,
      };
  }
  if (options.force && options.rotate === undefined)
    return { error: "--force goes with --rotate only." };
  return options;
}

/** A step that cannot go on: its message names what is wrong, never a value. */
export class Refusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Refusal";
  }
}

const value = (env: Env, name: string): string | undefined => env[name]?.trim() || undefined;

// ---------------------------------------------------------------------------------------------
// What to write

export type Target =
  { platform: "railway"; service: string } | { platform: "vercel"; sensitive: boolean };

export type Write = { variable: string; value: string; targets: Target[] };

const railway = (services: readonly string[]): Target[] =>
  services.map((service) => ({ platform: "railway", service }));
const vercel = (sensitive = true): Target[] => [{ platform: "vercel", sensitive }];

function targetsOf(home: SecretSpec["homes"][number]): Target[] {
  if (home.app === "backend") return railway(RAILWAY_SERVICES.backend);
  if (home.app === "meilisearch") return railway(RAILWAY_SERVICES.meilisearch);
  return vercel();
}

export type SecretDecision = { spec: SecretSpec; action: "kept" | "set" | "rotate" };

/**
 * Which secrets get a new value: one with no fingerprint, or whose Vercel copy is missing by name,
 * is set; one with both is kept; `--rotate` sets its one again. A Railway copy that went missing
 * while its fingerprint stayed is what `doctor --app=backend` reports at the next predeploy
 * ("not set, but fingerprinted"), and `--rotate` sets it again.
 */
export function decideSecrets(input: {
  prints: ReadonlyMap<string, string>;
  vercelNames: ReadonlySet<string>;
  rotate: string | undefined;
}): SecretDecision[] {
  return SECRETS.map((spec) => {
    if (input.rotate === spec.name) return { spec, action: "rotate" };
    const onVercel = spec.homes
      .filter((home) => home.app === "storefront")
      .every((home) => input.vercelNames.has(home.variable));
    return { spec, action: input.prints.has(spec.name) && onVercel ? "kept" : "set" };
  });
}

/** The writes for the secrets that get a value, one per home, and their new fingerprints. */
export function secretWrites(
  decisions: readonly SecretDecision[],
  prints: ReadonlyMap<string, string>,
  generate: (spec: SecretSpec) => string = generateValue,
): { writes: Write[]; prints: Map<string, string> } {
  const next = new Map(prints);
  const writes: Write[] = [];
  for (const { spec, action } of decisions) {
    if (action === "kept") continue;
    const secret = generate(spec);
    next.set(spec.name, fingerprint(spec.name, secret));
    for (const home of spec.homes)
      writes.push({
        variable: home.variable,
        value: secret,
        targets: targetsOf(home),
      });
  }
  return { writes, prints: next };
}

/**
 * The integrations' keys the session holds, under each app's names (`deployVariables()`'s
 * `integration` rows): R2's from `STAGING_S3_*`, every other from the same name. A key the session
 * lacks is `missing` (that integration stays on its fallback). Stripe's webhook secret and
 * Payload's database address have their own steps.
 */
export function integrationWrites(env: Env): { writes: Write[]; missing: string[] } {
  const rows = deployVariables().filter(
    (each) =>
      each.source === "integration" &&
      each.name !== WEBHOOK_RECORD &&
      each.name !== "PAYLOAD_DATABASE_URL",
  );
  const byName = new Map<string, Target[]>();
  for (const row of rows) {
    const targets = row.app === "backend" ? railway(RAILWAY_SERVICES.backend) : vercel();
    byName.set(row.name, [...(byName.get(row.name) ?? []), ...targets]);
  }
  const writes: Write[] = [];
  const missing: string[] = [];
  for (const [variable, targets] of byName) {
    const from = variable.startsWith("S3_") ? `STAGING_${variable}` : variable;
    const found = value(env, from);
    if (found === undefined) missing.push(from);
    else writes.push({ variable, value: found, targets });
  }
  return { writes, missing };
}

/** Only test keys reach staging (D115): a live Stripe key is refused before anything is written. */
export function liveKeyRefusal(env: Env): string | undefined {
  const secret = value(env, "STRIPE_API_KEY");
  const publishable = value(env, "NEXT_PUBLIC_STRIPE_KEY");
  if (secret !== undefined && !/^(sk|rk)_test_/.test(secret))
    return "STRIPE_API_KEY is not a test key (sk_test_ or rk_test_): staging takes test keys only.";
  if (publishable !== undefined && !publishable.startsWith("pk_test_"))
    return "NEXT_PUBLIC_STRIPE_KEY is not a test key (pk_test_): staging takes test keys only.";
  return undefined;
}

/**
 * Payload's database address for Vercel (D136, 4): Railway's public one (through the TCP proxy),
 * with TLS required the way node-postgres reads it (`sslmode=require&uselibpqcompat=true`,
 * libpq's meaning: encrypted, Railway's certificate not verified).
 */
export function withTls(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("sslmode", "require");
  parsed.searchParams.set("uselibpqcompat", "true");
  const result = parsed.toString();
  const tls = postgresTls(result);
  if (tls === "invalid" || !tls.tls) throw new Refusal("Payload's database address has no TLS.");
  return result;
}

// ---------------------------------------------------------------------------------------------
// The platforms

async function json(response: Response, what: string): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) throw new Refusal(`${what} answered ${response.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Refusal(`${what} answered with no JSON.`);
  }
}

type Json = Record<string, unknown>;
const record = (input: unknown): Json =>
  typeof input === "object" && input !== null ? (input as Json) : {};

export class RailwayApi {
  private readonly fetch: Fetch;
  private readonly token: string;
  constructor(fetch: Fetch, token: string) {
    this.fetch = fetch;
    this.token = token;
  }

  async query(query: string, variables: Json = {}): Promise<Json> {
    const response = await this.fetch(RAILWAY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Project-Access-Token": this.token },
      body: JSON.stringify({ query, variables }),
    });
    const body = record(await json(response, "Railway"));
    // Railway answers 200 with `errors` too.
    if (Array.isArray(body.errors) && body.errors.length > 0)
      throw new Refusal(
        `Railway refused: ${body.errors.map((each) => String(record(each).message)).join("; ")}`,
      );
    return record(body.data);
  }

  /** The project and environment the project token is for. */
  async scope(): Promise<{ projectId: string; environmentId: string; environmentName: string }> {
    const token = record(
      (await this.query("query { projectToken { projectId environmentId } }")).projectToken,
    );
    const projectId = String(token.projectId ?? "");
    const environmentId = String(token.environmentId ?? "");
    const environment = record(
      (
        await this.query("query ($id: String!) { environment(id: $id) { id name } }", {
          id: environmentId,
        })
      ).environment,
    );
    return { projectId, environmentId, environmentName: String(environment.name ?? "") };
  }

  async services(projectId: string): Promise<Map<string, string>> {
    const project = record(
      (
        await this.query(
          "query ($id: String!) { project(id: $id) { services { edges { node { id name } } } } }",
          { id: projectId },
        )
      ).project,
    );
    const edges = record(project.services).edges;
    const services = new Map<string, string>();
    for (const edge of Array.isArray(edges) ? edges : []) {
      const node = record(record(edge).node);
      services.set(String(node.name), String(node.id));
    }
    return services;
  }

  /** One variable of one service, rendered (Payload's database address). Never printed. */
  async variable(
    scope: { projectId: string; environmentId: string },
    serviceId: string,
    name: string,
  ): Promise<string | undefined> {
    const data = await this.query(
      "query ($projectId: String!, $environmentId: String!, $serviceId: String) { variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) }",
      { ...scope, serviceId },
    );
    const found = record(data.variables)[name];
    return typeof found === "string" && found.trim() !== "" ? found : undefined;
  }

  /** The service's public domain (Railway's or a custom one), for Stripe's webhook. */
  async publicDomain(
    scope: { projectId: string; environmentId: string },
    serviceId: string,
  ): Promise<string | undefined> {
    const data = await this.query(
      "query ($projectId: String!, $environmentId: String!, $serviceId: String!) { domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) { serviceDomains { domain } customDomains { domain } } }",
      { ...scope, serviceId },
    );
    const domains = record(data.domains);
    const first = (list: unknown) =>
      Array.isArray(list) ? String(record(list[0]).domain ?? "") || undefined : undefined;
    return first(domains.customDomains) ?? first(domains.serviceDomains);
  }

  /** Writes without redeploying (`skipDeploys`): the deployments pick them up on the next one. */
  async upsert(
    scope: { projectId: string; environmentId: string },
    serviceId: string,
    variables: Record<string, string>,
  ): Promise<void> {
    await this.query(
      "mutation ($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }",
      { input: { ...scope, serviceId, variables, replace: false, skipDeploys: true } },
    );
  }
}

export type VercelEnvEntry = { id: string; key: string; type: string; target: string[] };

export class VercelApi {
  private teamId: string | undefined;
  private readonly fetch: Fetch;
  private readonly token: string;
  constructor(fetch: Fetch, token: string) {
    this.fetch = fetch;
    this.token = token;
  }

  private url(path: string, query: Record<string, string> = {}): string {
    const url = new URL(path, VERCEL_API);
    if (this.teamId !== undefined) url.searchParams.set("teamId", this.teamId);
    for (const [key, each] of Object.entries(query)) url.searchParams.set(key, each);
    return url.toString();
  }

  private async call(path: string, init: RequestInit = {}, query: Record<string, string> = {}) {
    const response = await this.fetch(this.url(path, query), {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
    });
    return record(await json(response, "Vercel"));
  }

  /** The team the token is scoped to (CLOUD.md: one team), or none for a personal account. */
  async resolveTeam(): Promise<void> {
    const teams = (await this.call("/v2/teams")).teams;
    const list = Array.isArray(teams) ? teams.map((each) => String(record(each).id)) : [];
    if (list.length > 1)
      throw new Refusal(
        "VERCEL_TOKEN reaches more than one team: scope it to the staging project's team (CLOUD.md).",
      );
    this.teamId = list[0];
  }

  /** The project's id, and the repository and folder it builds from. */
  async project(id: string): Promise<{ id: string; repository: string; rootDirectory: string }> {
    const found = await this.call(`/v9/projects/${encodeURIComponent(id)}`);
    const link = record(found.link);
    return {
      id: String(found.id ?? ""),
      repository: `${String(link.org ?? "")}/${String(link.repo ?? "")}`,
      rootDirectory: String(found.rootDirectory ?? ""),
    };
  }

  async envs(projectId: string): Promise<VercelEnvEntry[]> {
    const envs = (await this.call(`/v10/projects/${encodeURIComponent(projectId)}/env`)).envs;
    return (Array.isArray(envs) ? envs : []).map((each) => {
      const entry = record(each);
      return {
        id: String(entry.id),
        key: String(entry.key),
        type: String(entry.type),
        target: Array.isArray(entry.target) ? entry.target.map(String) : [],
      };
    });
  }

  /** One plain variable's value: only ever the fingerprints, which are no secret. */
  async plainValue(projectId: string, entry: VercelEnvEntry): Promise<string | undefined> {
    if (entry.type === "sensitive" || entry.key !== FINGERPRINTS_VARIABLE) return undefined;
    const found = await this.call(
      `/v1/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(entry.id)}`,
    );
    return typeof found.value === "string" ? found.value : undefined;
  }

  async upsert(
    projectId: string,
    entries: { key: string; value: string; sensitive: boolean }[],
  ): Promise<void> {
    await this.call(
      `/v10/projects/${encodeURIComponent(projectId)}/env`,
      {
        method: "POST",
        body: JSON.stringify(
          entries.map((entry) => ({
            key: entry.key,
            value: entry.value,
            // Vercel's Secret (write-only, never returned) or Config (readable: the fingerprints).
            type: entry.sensitive ? "sensitive" : "encrypted",
            visibility: entry.sensitive ? "secret" : "config",
            target: [...VERCEL_TARGETS],
          })),
        ),
      },
      { upsert: "true" },
    );
  }
}

export class StripeApi {
  private readonly fetch: Fetch;
  private readonly key: string;
  constructor(fetch: Fetch, key: string) {
    this.fetch = fetch;
    this.key = key;
  }

  private async call(path: string, method = "GET", form?: URLSearchParams) {
    const response = await this.fetch(`${STRIPE_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      ...(form === undefined ? {} : { body: form.toString() }),
    });
    return record(await json(response, "Stripe"));
  }

  /** Every endpoint at `url` (an earlier roll that failed half-way can leave two). */
  async findEndpoints(url: string): Promise<string[]> {
    const list = (await this.call("/v1/webhook_endpoints?limit=100")).data;
    return (Array.isArray(list) ? list : [])
      .map(record)
      .filter((each) => each.url === url)
      .map((each) => String(each.id));
  }

  /** A new endpoint; Stripe returns its signing secret this once. */
  async create(url: string): Promise<{ id: string; secret: string }> {
    const form = new URLSearchParams({
      url,
      description: "Shopblok staging (pnpm staging:secrets)",
    });
    for (const event of STRIPE_EVENTS) form.append("enabled_events[]", event);
    const created = await this.call("/v1/webhook_endpoints", "POST", form);
    return { id: String(created.id), secret: String(created.secret ?? "") };
  }

  async remove(id: string): Promise<void> {
    await this.call(`/v1/webhook_endpoints/${encodeURIComponent(id)}`, "DELETE");
  }
}

// ---------------------------------------------------------------------------------------------
// The run

export type RunInput = {
  argv: readonly string[];
  env: Env;
  fetch: Fetch;
  log: (line: string) => void;
  /** For the test: a known value per secret. */
  generate?: (spec: SecretSpec) => string;
};

/** The names a set of writes lands on, for one line of output. */
function where(targets: readonly Target[]): string {
  const services = targets.flatMap((each) => (each.platform === "railway" ? [each.service] : []));
  const onVercel = targets.some((each) => each.platform === "vercel");
  return [
    ...(services.length > 0 ? [`Railway ${services.join(", ")}`] : []),
    ...(onVercel ? [`Vercel ${VERCEL_TARGETS.join(", ")}`] : []),
  ].join("; ");
}

export async function runStagingSecrets(input: RunInput): Promise<number> {
  const known = new Set<string>();
  const remember = (secret: string | undefined) => {
    if (secret !== undefined && secret.trim() !== "") known.add(secret.trim());
  };
  const say = (line: string) => input.log(maskKeys(line, [...known]));

  const parsed = parseArgs(input.argv);
  if (parsed === "help") {
    say(HELP);
    return 0;
  }
  if ("error" in parsed) {
    say(`staging:secrets: ${parsed.error}\n\n${HELP}`);
    return 2;
  }
  const options = parsed;
  const env = input.env;
  // Everything the session holds that could be a value goes into the mask first.
  for (const [name, each] of Object.entries(env))
    if (/TOKEN|KEY|SECRET|PASSWORD|DSN|EMAIL|_URL$|^STAGING_S3_/.test(name)) remember(each);

  try {
    const required = [
      "VERCEL_TOKEN",
      "RAILWAY_TOKEN",
      "STAGING_VERCEL_PROJECT_ID",
      "STAGING_RAILWAY_PROJECT_ID",
    ];
    const absent = required.filter((name) => value(env, name) === undefined);
    if (absent.length > 0)
      throw new Refusal(`${absent.join(", ")} not set in this session (CLOUD.md, G11).`);
    const live = liveKeyRefusal(env);
    if (live !== undefined) throw new Refusal(live);

    // 1. Which projects: both checked before anything is written.
    const railwayApi = new RailwayApi(input.fetch, value(env, "RAILWAY_TOKEN")!);
    const vercelApi = new VercelApi(input.fetch, value(env, "VERCEL_TOKEN")!);
    const wantRailway = value(env, "STAGING_RAILWAY_PROJECT_ID")!;
    const wantVercel = value(env, "STAGING_VERCEL_PROJECT_ID")!;
    const scope = await railwayApi.scope();
    if (scope.projectId !== wantRailway)
      throw new Refusal(
        "RAILWAY_TOKEN is for another Railway project than STAGING_RAILWAY_PROJECT_ID: nothing was written.",
      );
    if (scope.environmentName !== RAILWAY_ENVIRONMENT)
      throw new Refusal(
        `RAILWAY_TOKEN is for Railway's "${scope.environmentName}" environment, not "${RAILWAY_ENVIRONMENT}": nothing was written.`,
      );
    await vercelApi.resolveTeam();
    // The token reaches other projects too (CLOUD.md): the id must name one that builds this
    // repository's storefront, so a wrong id (another shop's project) stops here.
    const project = await vercelApi.project(wantVercel);
    if (project.id !== wantVercel)
      throw new Refusal(
        "Vercel answered for another project than STAGING_VERCEL_PROJECT_ID: nothing was written.",
      );
    if (project.repository !== STOREFRONT_REPOSITORY || project.rootDirectory !== STOREFRONT_ROOT)
      throw new Refusal(
        `STAGING_VERCEL_PROJECT_ID names a Vercel project that does not build ${STOREFRONT_REPOSITORY}'s ${STOREFRONT_ROOT}: nothing was written.`,
      );
    const projectScope = { projectId: scope.projectId, environmentId: scope.environmentId };
    say(
      `staging:secrets: Railway's ${RAILWAY_ENVIRONMENT} environment and Vercel's project, as named in the session.`,
    );

    // 2. What is there, by name.
    const services = await railwayApi.services(scope.projectId);
    const needed = [
      ...RAILWAY_SERVICES.backend,
      ...RAILWAY_SERVICES.meilisearch,
      RAILWAY_SERVICES.payloadDatabase,
    ];
    const lacking = needed.filter((name) => !services.has(name));
    if (lacking.length > 0)
      throw new Refusal(
        `Railway's project has no ${lacking.join(", ")}: run \`railway config apply\` first (DEPLOY.md).`,
      );
    const envs = await vercelApi.envs(wantVercel);
    const vercelNames = new Set(envs.map((each) => each.key));
    const printsEntry = envs.find((each) => each.key === FINGERPRINTS_VARIABLE);
    const printsText =
      printsEntry === undefined ? undefined : await vercelApi.plainValue(wantVercel, printsEntry);
    const parsedPrints = parseFingerprints(printsText);
    if (typeof parsedPrints === "string")
      throw new Refusal(
        `${FINGERPRINTS_VARIABLE} on Vercel is broken (${parsedPrints}); it is never set by hand.`,
      );

    // 3. The plan.
    const decisions = decideSecrets({ prints: parsedPrints, vercelNames, rotate: options.rotate });
    const secrets = secretWrites(decisions, parsedPrints, input.generate);
    for (const write of secrets.writes) remember(write.value);
    const integrations = integrationWrites(env);
    for (const write of integrations.writes) remember(write.value);

    say(options.dryRun ? "\nWould do (--dry-run, nothing written):" : "\nSecrets:");
    for (const { spec, action } of decisions) {
      const homes = where(spec.homes.flatMap(targetsOf));
      if (action === "kept") say(`  kept     ${spec.name}`);
      else if (action === "rotate") say(`  rotate   ${spec.name} (${homes}): ${spec.effect}`);
      else say(`  set      ${spec.name} (${homes})`);
    }
    say("Integrations' keys (from the session):");
    for (const write of integrations.writes)
      say(`  set      ${write.variable}  → ${where(write.targets)}`);
    for (const name of integrations.missing)
      say(`  missing  ${name} (that integration stays on its fallback)`);

    // Payload's database address, copied with TLS.
    const payloadUrl = await railwayApi.variable(
      projectScope,
      services.get(RAILWAY_SERVICES.payloadDatabase)!,
      "DATABASE_PUBLIC_URL",
    );
    remember(payloadUrl);
    const databaseWrites: Write[] = [];
    if (payloadUrl === undefined)
      say(
        "  missing  PAYLOAD_DATABASE_URL: payload-postgres has no DATABASE_PUBLIC_URL (its TCP proxy, G11)",
      );
    else {
      const copied = withTls(payloadUrl);
      remember(copied);
      databaseWrites.push({ variable: "PAYLOAD_DATABASE_URL", value: copied, targets: vercel() });
      say(
        `  set      PAYLOAD_DATABASE_URL (Railway's payload-postgres, with TLS)  → ${where(vercel())}`,
      );
    }

    // Stripe's webhook, found by its URL.
    const stripeKey = value(env, "STRIPE_API_KEY");
    const domain = await railwayApi.publicDomain(
      projectScope,
      services.get(RAILWAY_SERVICES.server)!,
    );
    let webhook:
      { url: string; endpoints: string[]; action: "kept" | "create" | "roll" } | undefined;
    if (stripeKey === undefined)
      say("  missing  STRIPE_WEBHOOK_SECRET: no STRIPE_API_KEY in the session");
    else if (domain === undefined)
      say("  missing  STRIPE_WEBHOOK_SECRET: Medusa's server has no public domain yet (G11)");
    else {
      const url = `https://${domain}${STRIPE_WEBHOOK_PATH}`;
      const endpoints = await new StripeApi(input.fetch, stripeKey).findEndpoints(url);
      const action =
        endpoints.length === 0 ? "create" : parsedPrints.has(WEBHOOK_RECORD) ? "kept" : "roll";
      webhook = { url, endpoints, action };
      say(
        action === "kept"
          ? `  kept     ${WEBHOOK_RECORD} (Stripe's endpoint for Medusa's server exists, its secret is stored)`
          : action === "create"
            ? `  create   Stripe's webhook endpoint for Medusa's server, and ${WEBHOOK_RECORD}`
            : `  roll     Stripe's webhook endpoint for Medusa's server (its stored secret is gone): a new endpoint and ${WEBHOOK_RECORD}`,
      );
    }

    if (options.dryRun) {
      say("\nstaging:secrets --dry-run: nothing written.");
      return 0;
    }

    // 4. The writes. Stripe's new endpoint first, since its secret joins the Railway writes and
    // the prints; a rolled endpoint's old ones go only after every write has landed, so a failed
    // write leaves the endpoint Medusa's server verifies with (PR 149's review, item 4).
    const writes = [...secrets.writes, ...integrations.writes, ...databaseWrites];
    const prints = secrets.prints;
    const stripe = stripeKey === undefined ? undefined : new StripeApi(input.fetch, stripeKey);
    if (webhook !== undefined && webhook.action !== "kept" && stripe !== undefined) {
      const created = await stripe.create(webhook.url);
      remember(created.secret);
      if (created.secret === "")
        throw new Refusal("Stripe returned no signing secret for the new endpoint.");
      writes.push({
        variable: WEBHOOK_RECORD,
        value: created.secret,
        targets: railway(RAILWAY_SERVICES.backend),
      });
      prints.set(WEBHOOK_RECORD, fingerprint(WEBHOOK_RECORD, created.secret));
    }
    const printsValue = formatFingerprints(prints);
    writes.push({
      variable: FINGERPRINTS_VARIABLE,
      value: printsValue,
      targets: [...railway(RAILWAY_SERVICES.backend), ...vercel(false)],
    });

    const byService = new Map<string, Record<string, string>>();
    const toVercel: { key: string; value: string; sensitive: boolean }[] = [];
    for (const write of writes)
      for (const target of write.targets) {
        if (target.platform === "railway")
          byService.set(target.service, {
            ...byService.get(target.service),
            [write.variable]: write.value,
          });
        else
          toVercel.push({ key: write.variable, value: write.value, sensitive: target.sensitive });
      }
    for (const [service, variables] of byService) {
      await railwayApi.upsert(projectScope, services.get(service)!, variables);
      say(`Railway ${service}: ${Object.keys(variables).length} variables set (no redeploy).`);
    }
    if (toVercel.length > 0) {
      await vercelApi.upsert(wantVercel, toVercel);
      say(`Vercel: ${toVercel.length} variables set (${VERCEL_TARGETS.join(", ")}).`);
    }
    if (webhook?.action === "roll" && stripe !== undefined) {
      for (const endpoint of webhook.endpoints) await stripe.remove(endpoint);
      say(
        `Stripe: the old webhook endpoint removed. Redeploy Medusa's server now: until it runs with the new ${WEBHOOK_RECORD}, its signature check refuses Stripe's events, which Stripe retries (for up to three days).`,
      );
    }
    const rotated = decisions.find((each) => each.action === "rotate");
    const redeploy = (spec: SecretSpec): string => {
      const apps = new Set(spec.homes.map((home) => home.app));
      return [
        ...(apps.has("meilisearch") ? ["Meilisearch"] : []),
        ...(apps.has("backend") ? ["Medusa's server and worker"] : []),
        ...(apps.has("storefront") ? ["Vercel's Production"] : []),
      ].join(", then ");
    };
    say(
      rotated !== undefined
        ? `\nRotated ${rotated.spec.name}: redeploy ${redeploy(rotated.spec)} now (DEPLOY.md, "Rotating a secret").`
        : "\nDone. Seal the new Railway variables in its dashboard (DEPLOY.md, G11), then deploy.",
    );
    return 0;
  } catch (error) {
    say(`staging:secrets: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
