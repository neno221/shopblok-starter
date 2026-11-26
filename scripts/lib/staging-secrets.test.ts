// `pnpm staging:secrets` (M7 D134, T114) against stand-ins for Vercel, Railway and Stripe: what it
// writes where, that a second run keeps what is there, that it refuses another project before its
// first write, and that its output holds no value it has seen.
import { beforeEach, describe, expect, it } from "vitest";
import { SECRETS, fingerprint, parseFingerprints, postgresTls } from "./deploy-secrets.ts";
import {
  RAILWAY_API,
  STRIPE_API,
  STRIPE_WEBHOOK_PATH,
  VERCEL_API,
  parseArgs,
  runStagingSecrets,
  withTls,
  type Fetch,
} from "./staging-secrets.ts";

const RAILWAY_PROJECT = "rw-project-1";
const VERCEL_PROJECT = "prj_staging";
const SERVICES = ["medusa", "medusa-worker", "meilisearch", "payload-postgres", "redis"];
const PAYLOAD_PUBLIC_URL =
  "postgresql://postgres:pg-password-1234@shuttle.proxy.rlwy.net:15140/railway";

type VercelEnv = { id: string; key: string; type: string; target: string[]; value: string };

/** The three platforms' state, and every request that changed it. */
function platforms() {
  const state = {
    railway: {
      projectId: RAILWAY_PROJECT,
      environmentName: "staging",
      variables: new Map<string, Record<string, string>>(
        SERVICES.map((name): [string, Record<string, string>] => [
          name,
          name === "payload-postgres" ? { DATABASE_PUBLIC_URL: PAYLOAD_PUBLIC_URL } : {},
        ]),
      ),
      domain: "medusa-staging.up.railway.app" as string | undefined,
    },
    vercel: {
      teams: ["team_1"],
      project: {
        id: VERCEL_PROJECT,
        link: { org: "neno221", repo: "shopblok-starter" },
        rootDirectory: "apps/storefront",
      },
      envs: [] as VercelEnv[],
    },
    stripe: { endpoints: [] as { id: string; url: string; secret: string }[] },
    writes: [] as string[],
    seen: [] as string[],
  };
  let ids = 0;

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetch: Fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? init.body : "";
    state.seen.push(`${method} ${url}`);
    if (url === RAILWAY_API) {
      const { query, variables } = JSON.parse(body) as {
        query: string;
        variables: Record<string, unknown>;
      };
      const serviceName = (id: unknown) => String(id).replace(/^svc-/, "");
      if (query.includes("projectToken"))
        return reply({
          data: { projectToken: { projectId: state.railway.projectId, environmentId: "env-1" } },
        });
      if (query.includes("environment(id"))
        return reply({
          data: { environment: { id: "env-1", name: state.railway.environmentName } },
        });
      if (query.includes("project(id"))
        return reply({
          data: {
            project: {
              services: { edges: SERVICES.map((name) => ({ node: { id: `svc-${name}`, name } })) },
            },
          },
        });
      if (query.includes("domains("))
        return reply({
          data: {
            domains: {
              serviceDomains: state.railway.domain ? [{ domain: state.railway.domain }] : [],
              customDomains: [],
            },
          },
        });
      if (query.includes("variables("))
        return reply({
          data: { variables: state.railway.variables.get(serviceName(variables.serviceId)) },
        });
      if (query.includes("variableCollectionUpsert")) {
        const input = variables.input as {
          projectId: string;
          environmentId: string;
          serviceId: string;
          variables: Record<string, string>;
          skipDeploys: boolean;
        };
        expect(input.projectId).toBe(RAILWAY_PROJECT);
        expect(input.skipDeploys).toBe(true);
        const name = serviceName(input.serviceId);
        state.railway.variables.set(name, {
          ...state.railway.variables.get(name),
          ...input.variables,
        });
        state.writes.push(`railway ${name}`);
        return reply({ data: { variableCollectionUpsert: true } });
      }
      return reply({ errors: [{ message: `unknown query ${query}` }] });
    }
    if (url.startsWith(VERCEL_API)) {
      const parsed = new URL(url);
      const path = parsed.pathname;
      if (path === "/v2/teams") return reply({ teams: state.vercel.teams.map((id) => ({ id })) });
      expect(parsed.searchParams.get("teamId")).toBe("team_1");
      if (path === `/v9/projects/${VERCEL_PROJECT}`) return reply(state.vercel.project);
      if (path.startsWith("/v9/projects/")) return reply({ error: "not found" }, 404);
      if (path === `/v10/projects/${VERCEL_PROJECT}/env` && method === "GET")
        return reply({ envs: state.vercel.envs.map(({ value: _value, ...rest }) => rest) });
      const single = /^\/v1\/projects\/prj_staging\/env\/(.+)$/.exec(path);
      if (single) {
        const entry = state.vercel.envs.find((each) => each.id === single[1]);
        // Vercel never returns a sensitive value.
        return reply(entry?.type === "sensitive" ? { ...entry, value: "" } : entry);
      }
      if (path === `/v10/projects/${VERCEL_PROJECT}/env` && method === "POST") {
        expect(parsed.searchParams.get("upsert")).toBe("true");
        for (const entry of JSON.parse(body) as Omit<VercelEnv, "id">[]) {
          state.vercel.envs = state.vercel.envs.filter((each) => each.key !== entry.key);
          state.vercel.envs.push({ id: `env_${++ids}`, ...entry });
        }
        state.writes.push("vercel");
        return reply({ created: [] });
      }
      return reply({ error: `unknown ${method} ${path}` }, 404);
    }
    if (url.startsWith(STRIPE_API)) {
      const path = new URL(url).pathname;
      if (path === "/v1/webhook_endpoints" && method === "GET")
        return reply({ data: state.stripe.endpoints.map(({ id, url }) => ({ id, url })) });
      if (path === "/v1/webhook_endpoints" && method === "POST") {
        const form = new URLSearchParams(body);
        const endpoint = {
          id: `we_${++ids}`,
          url: form.get("url")!,
          secret: `whsec_${"s".repeat(20)}${ids}`,
        };
        expect(form.getAll("enabled_events[]")).toContain("payment_intent.succeeded");
        state.stripe.endpoints.push(endpoint);
        state.writes.push("stripe create");
        return reply(endpoint);
      }
      const removal = /^\/v1\/webhook_endpoints\/(.+)$/.exec(path);
      if (removal && method === "DELETE") {
        state.stripe.endpoints = state.stripe.endpoints.filter((each) => each.id !== removal[1]);
        state.writes.push("stripe delete");
        return reply({ deleted: true });
      }
    }
    return reply({ error: `unexpected ${method} ${url}` }, 500);
  };
  return { state, fetch };
}

const session = {
  VERCEL_TOKEN: "vercel-token-abcdefgh",
  RAILWAY_TOKEN: "railway-token-abcdefgh",
  STAGING_VERCEL_PROJECT_ID: VERCEL_PROJECT,
  STAGING_RAILWAY_PROJECT_ID: RAILWAY_PROJECT,
  STRIPE_API_KEY: `sk_test_${"a".repeat(24)}`,
  NEXT_PUBLIC_STRIPE_KEY: `pk_test_${"b".repeat(24)}`,
  RESEND_API_KEY: `re_${"c".repeat(24)}`,
  RESEND_FROM_EMAIL: "Shop <onboarding@resend.dev>",
  STAGING_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  STAGING_S3_ACCESS_KEY_ID: "r2-access-key-id-1234",
  STAGING_S3_SECRET_ACCESS_KEY: "r2-secret-access-key-1234",
  STAGING_S3_BUCKET: "shopblok-staging",
  STAGING_S3_PRIVATE_BUCKET: "shopblok-staging-private",
  STAGING_S3_PUBLIC_URL: "https://pub-1234.r2.dev",
};

let counter = 0;
/** A known, recognisable value per secret, so the test can look for it in the output. */
const generate = () => `generated-secret-${String(++counter).padStart(4, "0")}-${"x".repeat(40)}`;

async function run(
  fetch: Fetch,
  argv: string[] = [],
  env: Record<string, string> = session,
): Promise<{ code: number; output: string }> {
  const lines: string[] = [];
  const code = await runStagingSecrets({
    argv,
    env,
    fetch,
    log: (line) => lines.push(line),
    generate,
  });
  return { code, output: lines.join("\n") };
}

/** Every value the platforms now hold, and every value the session held. */
function values(state: ReturnType<typeof platforms>["state"]): string[] {
  return [
    ...[...state.railway.variables.values()].flatMap((each) => Object.values(each)),
    ...state.vercel.envs.map((each) => each.value),
    ...state.stripe.endpoints.map((each) => each.secret),
    ...Object.values(session),
  ].filter((each) => each.length >= 8 && !/^shopblok-staging/.test(each));
}

function expectNoValue(output: string, state: ReturnType<typeof platforms>["state"]) {
  for (const each of values(state)) expect(output, "a value was printed").not.toContain(each);
}

describe("pnpm staging:secrets (D134)", () => {
  let world: ReturnType<typeof platforms>;
  beforeEach(() => {
    world = platforms();
    counter = 0;
  });

  it("sets every secret in its homes, sealed apart from the fingerprints, and prints no value", async () => {
    const { code, output } = await run(world.fetch);
    expect(code, output).toBe(0);
    const { railway, vercel, stripe } = world.state;
    const medusa = railway.variables.get("medusa")!;
    const worker = railway.variables.get("medusa-worker")!;
    const vercelValue = (key: string) => vercel.envs.find((each) => each.key === key);
    for (const spec of SECRETS)
      for (const home of spec.homes) {
        const held =
          home.app === "storefront"
            ? vercelValue(home.variable)?.value
            : railway.variables.get(home.app === "meilisearch" ? "meilisearch" : "medusa")![
                home.variable
              ];
        expect(held, `${spec.name} in ${home.app}`).toMatch(/^generated-secret-/);
        if (home.app === "backend") expect(worker[home.variable]).toBe(held);
      }
    // A shared secret is one value in both platforms.
    expect(medusa.CRON_SECRET).toBe(vercelValue("CRON_SECRET")?.value);
    expect(railway.variables.get("meilisearch")!.MEILI_MASTER_KEY).toBe(medusa.MEILISEARCH_API_KEY);
    // Vercel's types: secrets and keys sensitive; the fingerprints plain, in both environments.
    for (const entry of vercel.envs) {
      expect(entry.target).toEqual(["production", "preview"]);
      expect(entry.type).toBe(
        entry.key === "SHOPBLOK_SECRET_FINGERPRINTS" ? "encrypted" : "sensitive",
      );
    }
    // The fingerprints match what was set, the same on both platforms.
    const prints = parseFingerprints(vercelValue("SHOPBLOK_SECRET_FINGERPRINTS")?.value) as Map<
      string,
      string
    >;
    expect(medusa.SHOPBLOK_SECRET_FINGERPRINTS).toBe(
      vercelValue("SHOPBLOK_SECRET_FINGERPRINTS")?.value,
    );
    expect(prints.get("CRON_SECRET")).toBe(fingerprint("CRON_SECRET", medusa.CRON_SECRET!));
    // The integrations' keys, R2's under the apps' names; Payload's database with TLS.
    expect(medusa.STRIPE_API_KEY).toBe(session.STRIPE_API_KEY);
    expect(medusa.S3_PRIVATE_BUCKET).toBe(session.STAGING_S3_PRIVATE_BUCKET);
    expect(vercelValue("S3_BUCKET")?.value).toBe(session.STAGING_S3_BUCKET);
    expect(vercelValue("NEXT_PUBLIC_STRIPE_KEY")?.value).toBe(session.NEXT_PUBLIC_STRIPE_KEY);
    expect(vercelValue("STRIPE_API_KEY")).toBeUndefined();
    const database = vercelValue("PAYLOAD_DATABASE_URL")?.value;
    expect(postgresTls(database)).toEqual({ tls: true, mode: "require", libpq: true });
    // Stripe's webhook, for Medusa's public address, its secret in both Medusa services.
    expect(stripe.endpoints.map((each) => each.url)).toEqual([
      `https://medusa-staging.up.railway.app${STRIPE_WEBHOOK_PATH}`,
    ]);
    expect(worker.STRIPE_WEBHOOK_SECRET).toBe(stripe.endpoints[0]!.secret);
    expect(output).toMatch(/missing {2}NEXT_PUBLIC_POSTHOG_KEY/);
    expectNoValue(output, world.state);
  });

  it("keeps everything on a second run: no new secret and no new webhook", async () => {
    await run(world.fetch);
    const before = structuredClone([...world.state.railway.variables]);
    world.state.writes = [];
    const { code, output } = await run(world.fetch);
    expect(code, output).toBe(0);
    for (const spec of SECRETS) expect(output).toContain(`kept     ${spec.name}`);
    expect(output).toMatch(/kept {5}STRIPE_WEBHOOK_SECRET/);
    expect(world.state.writes).not.toContain("stripe create");
    expect([...world.state.railway.variables]).toEqual(before);
    expectNoValue(output, world.state);
  });

  it("rotates one secret by its rule, in both apps, and changes only its fingerprint", async () => {
    await run(world.fetch);
    const old = world.state.railway.variables.get("medusa")!;
    const { code, output } = await run(world.fetch, ["--rotate=REVALIDATE_SECRET"]);
    expect(code, output).toBe(0);
    const now = world.state.railway.variables.get("medusa")!;
    expect(now.REVALIDATE_SECRET).not.toBe(old.REVALIDATE_SECRET);
    expect(now.JWT_SECRET).toBe(old.JWT_SECRET);
    expect(world.state.vercel.envs.find((each) => each.key === "REVALIDATE_SECRET")?.value).toBe(
      now.REVALIDATE_SECRET,
    );
    const before = parseFingerprints(old.SHOPBLOK_SECRET_FINGERPRINTS) as Map<string, string>;
    const after = parseFingerprints(now.SHOPBLOK_SECRET_FINGERPRINTS) as Map<string, string>;
    for (const [name, print] of after)
      if (name === "REVALIDATE_SECRET") expect(print).not.toBe(before.get(name));
      else expect(print).toBe(before.get(name));
    expect(output).toMatch(/redeploy both apps/);
    expectNoValue(output, world.state);
  });

  it("rolls Stripe's webhook when its secret was never stored", async () => {
    world.state.stripe.endpoints.push({
      id: "we_old",
      url: `https://medusa-staging.up.railway.app${STRIPE_WEBHOOK_PATH}`,
      secret: "whsec_lost_lost_lost_lost",
    });
    const { code, output } = await run(world.fetch);
    expect(code, output).toBe(0);
    expect(world.state.writes).toContain("stripe delete");
    expect(world.state.stripe.endpoints.map((each) => each.id)).not.toContain("we_old");
    expect(world.state.railway.variables.get("medusa")!.STRIPE_WEBHOOK_SECRET).toBe(
      world.state.stripe.endpoints[0]!.secret,
    );
  });

  it("writes nothing on --dry-run", async () => {
    const { code, output } = await run(world.fetch, ["--dry-run"]);
    expect(code, output).toBe(0);
    expect(world.state.writes).toEqual([]);
    expect(output).toMatch(/nothing written/);
    expectNoValue(output, world.state);
  });

  describe("refuses before its first write", () => {
    const refused = async (env: Record<string, string> = session) => {
      const result = await run(world.fetch, [], env);
      expect(result.code).toBe(1);
      expect(world.state.writes).toEqual([]);
      expect(world.state.seen.filter((each) => each.startsWith("POST https://api.vercel"))).toEqual(
        [],
      );
      expectNoValue(result.output, world.state);
      return result.output;
    };

    it("another Railway project than STAGING_RAILWAY_PROJECT_ID", async () => {
      world.state.railway.projectId = "rw-other-project";
      expect(await refused()).toMatch(/another Railway project/);
    });

    it("a Railway environment other than staging", async () => {
      world.state.railway.environmentName = "production";
      expect(await refused()).toMatch(/"production" environment/);
    });

    it("a Vercel project that does not build this repository's storefront", async () => {
      world.state.vercel.project = {
        ...world.state.vercel.project,
        link: { org: "neno221", repo: "shopbloks-next" },
      };
      expect(await refused()).toMatch(/does not build/);
    });

    it("a Vercel project id that is not the one named", async () => {
      expect(await refused({ ...session, STAGING_VERCEL_PROJECT_ID: "prj_other" })).toMatch(/404/);
    });

    it("a live Stripe key", async () => {
      expect(await refused({ ...session, STRIPE_API_KEY: `sk_live_${"z".repeat(24)}` })).toMatch(
        /test keys only/,
      );
      expect(world.state.seen).toEqual([]);
    });

    it("a missing token", async () => {
      const { VERCEL_TOKEN: _token, ...rest } = session;
      expect(await refused(rest)).toMatch(/VERCEL_TOKEN/);
    });
  });
});

describe("parseArgs", () => {
  it("takes the table's names for --rotate, and the lock-out one only with --force", () => {
    expect(parseArgs(["--rotate=CRON_SECRET"])).toMatchObject({ rotate: "CRON_SECRET" });
    expect(parseArgs(["--rotate=NOPE"])).toHaveProperty("error");
    expect(parseArgs(["--rotate=AUTH_MFA_ENCRYPTION_KEY"])).toHaveProperty("error");
    expect(parseArgs(["--rotate=AUTH_MFA_ENCRYPTION_KEY", "--force"])).toMatchObject({
      force: true,
    });
    expect(parseArgs(["--force"])).toHaveProperty("error");
  });
});

describe("withTls", () => {
  it("requires TLS the way node-postgres reads libpq's sslmode", () => {
    const url = withTls(`${PAYLOAD_PUBLIC_URL}?sslmode=disable`);
    expect(new URL(url).searchParams.get("sslmode")).toBe("require");
    expect(new URL(url).searchParams.get("uselibpqcompat")).toBe("true");
  });
});
