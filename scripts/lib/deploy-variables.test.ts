// The deployments' variable table (M7 T114): held to `.railway/railway.ts`, the secrets table and
// the integrations' keys, so DEPLOY.md, `bootstrap --deployment` and `pnpm staging:secrets` cannot
// drift from what the platforms are given.
import { createRailwayContext, project, type ResourceNode, type ServiceNode } from "railway/iac";
import { describe, expect, it } from "vitest";
import program from "../../.railway/railway.ts";
import { secretsOf } from "./deploy-secrets.ts";
import { deploymentRefusal, deployVariables, formatDeploymentPlan } from "./deploy-variables.ts";

async function railwayVariables(service: string): Promise<string[]> {
  const definition = await program(
    createRailwayContext({ environment: "staging", projectName: "shopblok" }),
    project,
  );
  const node = ((definition.resources ?? []).flat() as ResourceNode[]).find(
    (resource) => resource.name === service,
  ) as ServiceNode;
  return Object.keys(node.variables ?? {}).sort();
}

const names = (app: "backend" | "storefront", sources?: readonly string[]) => [
  ...new Set(
    deployVariables()
      .filter((each) => each.app === app && (!sources || sources.includes(each.source)))
      .map((each) => each.name),
  ),
];

describe("deployVariables", () => {
  it("names exactly what railway.ts gives Medusa's server, by hand-set shared variables aside", async () => {
    const server = await railwayVariables("medusa");
    // The worker's switch is the worker's only; S3_REGION is R2's optional key (`auto` when blank),
    // which railway.ts keeps if set.
    const table = names("backend", ["config", "secret", "integration", "seed"]).filter(
      (name) => name !== "DISABLE_MEDUSA_ADMIN",
    );
    expect(server.filter((name) => name !== "S3_REGION")).toEqual([...table].sort());
  });

  it("gives the worker the same and its admin switch, without the seed's", async () => {
    const worker = await railwayVariables("medusa-worker");
    const seed = names("backend", ["seed"]);
    const table = names("backend", ["config", "secret", "integration"]);
    expect(worker.filter((name) => name !== "S3_REGION")).toEqual([...table].sort());
    expect(seed.some((name) => worker.includes(name))).toBe(false);
  });

  it("lists every generated secret of each app, and the fingerprints", () => {
    for (const app of ["backend", "storefront"] as const) {
      const listed = names(app, ["secret"]);
      for (const { variable } of secretsOf(app)) expect(listed).toContain(variable);
      expect(listed).toContain("SHOPBLOK_SECRET_FINGERPRINTS");
    }
  });

  it("names each variable once per app and source", () => {
    const keys = deployVariables().map((each) => `${each.app}:${each.source}:${each.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("holds names only: no row looks like a value", () => {
    for (const each of deployVariables()) {
      expect(each.name).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(each.note).not.toMatch(/sk_|pk_|re_[A-Za-z0-9]|whsec_|postgres:\/\//);
    }
  });
});

describe("bootstrap --deployment", () => {
  it("prints the names by app, and the first deployment's order", () => {
    const text = formatDeploymentPlan();
    expect(text).toContain("Medusa on Railway");
    expect(text).toContain("The storefront on Vercel");
    expect(text).toContain("SEED_ON_BUILD");
    expect(text).toMatch(/Nothing is written here/);
  });

  it("plain bootstrap refuses on a deployment", () => {
    expect(deploymentRefusal({})).toBeUndefined();
    expect(deploymentRefusal({ DEPLOY_ENV: " " })).toBeUndefined();
    expect(deploymentRefusal({ DEPLOY_ENV: "staging" })).toMatch(/--deployment/);
    expect(deploymentRefusal({ VERCEL_ENV: "preview", DEPLOY_ENV: "staging" })).toMatch(
      /DEPLOY_ENV and VERCEL_ENV are set/,
    );
  });
});
