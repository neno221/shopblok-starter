// `.railway/railway.ts` (M7 D132, D135): the graph Railway's CLI would plan, checked without
// Railway. Evaluated the way the CLI evaluates it, with a context for an environment.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRailwayContext, project, type ResourceNode, type ServiceNode } from "railway/iac";
import { describe, expect, it } from "vitest";
import program, { ENVIRONMENT, REGION, WATCH_PATTERNS } from "../../.railway/railway.ts";
import { corsProblems } from "./cors-check.ts";
import { secretsOf } from "./deploy-secrets.ts";

async function graph(environment = ENVIRONMENT) {
  const definition = await program(
    createRailwayContext({ environment, projectName: "shopblok" }),
    project,
  );
  const resources = (definition.resources ?? []).flat() as ResourceNode[];
  const byName = (name: string) => {
    const found = resources.find((resource) => resource.name === name);
    if (found === undefined) throw new Error(`no ${name}`);
    return found as ServiceNode;
  };
  return { resources, byName };
}

const literal = (node: ServiceNode, name: string) => {
  const value = node.variables?.[name];
  return value?.type === "literal" ? value.value : value;
};

describe(".railway/railway.ts", () => {
  it("refuses any environment but staging", async () => {
    await expect(graph("production")).rejects.toThrow(/staging/);
  });

  it("has the server, the worker, two Postgres, Redis and Meilisearch, all in the EU region", async () => {
    const { resources, byName } = await graph();
    expect(
      resources
        .filter((r) => r.type !== "group")
        .map((r) => `${r.type}.${r.name}`)
        .sort(),
    ).toEqual([
      "database.medusa-postgres",
      "database.payload-postgres",
      "database.redis",
      "service.medusa",
      "service.medusa-worker",
      "service.meilisearch",
      "volume.meilisearch-data",
    ]);
    for (const name of ["medusa", "medusa-worker", "meilisearch", "medusa-postgres", "redis"])
      expect(Object.keys(byName(name).deploy?.multiRegionConfig ?? {}), name).toEqual([REGION]);
  });

  it("watches every file the image is built from: each of .dockerignore's entries (PR 149's review, 8)", () => {
    const dockerignore = readFileSync(
      path.resolve(import.meta.dirname, "..", "..", ".dockerignore"),
      "utf8",
    );
    const entries = dockerignore
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("!") && !line.startsWith("!**/"))
      .map((line) => line.slice(1));
    expect(entries.length).toBeGreaterThan(10);
    for (const entry of entries) expect(WATCH_PATTERNS, entry).toContain(entry);
  });

  it("builds one image for both Medusa services from the Dockerfile, on main after CI passes", async () => {
    const { byName } = await graph();
    for (const name of ["medusa", "medusa-worker"]) {
      const node = byName(name);
      expect(node.build).toMatchObject({
        builder: "DOCKERFILE",
        dockerfilePath: "apps/backend/Dockerfile",
        watchPatterns: WATCH_PATTERNS,
      });
      expect(node.source).toMatchObject({ repo: "neno221/shopblok-starter", branch: "main" });
      expect(node.source?.checkSuites).toBe(true);
      expect(node.deploy?.startCommand).toBe("/usr/local/bin/shopblok start");
      expect(node.deploy?.restartPolicyType).toBe("ON_FAILURE");
    }
  });

  it("gives the server the migrating predeploy and the health check, the worker the wait and no admin", async () => {
    const { byName } = await graph();
    const server = byName("medusa");
    const worker = byName("medusa-worker");
    expect(server.deploy?.preDeployCommand).toEqual(["/usr/local/bin/shopblok predeploy"]);
    expect(server.deploy?.healthcheckPath).toBe("/health");
    expect(literal(server, "MEDUSA_WORKER_MODE")).toBe("server");
    expect(worker.deploy?.preDeployCommand).toEqual(["/usr/local/bin/shopblok predeploy-worker"]);
    expect(worker.deploy?.healthcheckPath).toBeUndefined();
    expect(literal(worker, "MEDUSA_WORKER_MODE")).toBe("worker");
    expect(literal(worker, "DISABLE_MEDUSA_ADMIN")).toBe("true");
    expect(literal(server, "DISABLE_MEDUSA_ADMIN")).toBeUndefined();
  });

  it("runs both as staging, and holds no secret's value: each is preserved for staging:secrets", async () => {
    const { byName } = await graph();
    for (const name of ["medusa", "medusa-worker"]) {
      const node = byName(name);
      expect(literal(node, "DEPLOY_ENV")).toBe("staging");
      for (const { variable } of secretsOf("backend"))
        expect(node.variables?.[variable], `${name}: ${variable}`).toEqual({ type: "preserve" });
    }
    expect(byName("meilisearch").variables?.MEILI_MASTER_KEY).toEqual({ type: "preserve" });
  });

  it("opens only Payload's Postgres through the TCP proxy; Medusa's data stays private", async () => {
    const { byName } = await graph();
    expect(byName("payload-postgres").networking?.tcpProxies).toEqual({ "5432": {} });
    for (const name of ["medusa-postgres", "redis", "meilisearch", "medusa-worker"])
      expect(byName(name).networking?.tcpProxies, name).toBeUndefined();
  });

  it("points Medusa at its private database and Redis, not at public addresses", async () => {
    const { byName } = await graph();
    const server = byName("medusa");
    expect(server.variables?.DATABASE_URL).toEqual({
      type: "reference",
      resource: "database.medusa-postgres",
      output: "DATABASE_URL",
    });
    expect(server.variables?.REDIS_URL).toMatchObject({ resource: "database.redis" });
    expect(literal(server, "MEILISEARCH_HOST")).toContain("RAILWAY_PRIVATE_DOMAIN");
  });

  it("gives Medusa CORS lists that pass doctor's check once G11's shared variables are in (T109)", async () => {
    const { byName } = await graph();
    const shared: Record<string, string> = {
      "${{shared.STOREFRONT_URL}}": "https://shopblok.vercel.app",
      "${{shared.STOREFRONT_PREVIEW_ORIGINS}}": String.raw`/^https:\/\/(shopblok-ch|shopblok-[a-z0-9-]+-acme)\.vercel\.app$/`,
    };
    const resolve = (value: unknown) =>
      Object.entries(shared)
        .reduce((text, [ref, to]) => text.split(ref).join(to), String(value))
        .replace(/\$\{\{(?:[\w-]+\.)?RAILWAY_PUBLIC_DOMAIN\}\}/g, "shopblok-server.up.railway.app");
    for (const name of ["medusa", "medusa-worker"]) {
      const node = byName(name);
      for (const list of ["STORE_CORS", "AUTH_CORS", "ADMIN_CORS"])
        expect(corsProblems(list, resolve(literal(node, list)))).toEqual([]);
      expect(resolve(literal(node, "ADMIN_CORS"))).toBe("https://shopblok-server.up.railway.app");
    }
  });
});
