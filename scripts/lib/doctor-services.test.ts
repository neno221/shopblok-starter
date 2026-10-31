import { describe, expect, it } from "vitest";
import { judge, targetsFrom, type Finding, type Observation, type Target } from "./checks.ts";
import {
  checkIdOf,
  isRequired,
  databaseFailed,
  serverCheck,
  serviceChecks,
} from "./doctor-services.ts";
import type { HttpResult } from "./http.ts";
import { getIntegrationStatus, type AppEnvs } from "@shopblok/integrations";

const targets = targetsFrom({
  DATABASE_URL: "postgres://u:p@localhost:15432/medusa",
  PAYLOAD_DATABASE_URL: "postgres://u:p@localhost:15432/payload",
  REDIS_URL: "redis://localhost:6380",
  MEILISEARCH_HOST: "http://localhost:7701",
});
const targetOf = (kind: Target["kind"]) => targets.find((t) => t.kind === kind) as Target;

const noKeys: AppEnvs = { backend: {}, storefront: {} };
const meilisearchLive: AppEnvs = {
  backend: {
    MEILISEARCH_HOST: "http://localhost:7701",
    MEILISEARCH_API_KEY: "k",
  },
  storefront: {},
};
const statuses = getIntegrationStatus(noKeys);

/** What `judge` says about a service: this project's container, unless `over` says otherwise. */
const finding = (target: Target, over: Partial<Observation> = {}): Finding =>
  judge({
    target,
    reachable: true,
    speaksProtocol: true,
    compose: { status: "published", ports: [target.port] },
    ...over,
  });
const down = { reachable: false };
const noDocker: Partial<Observation> = {
  compose: { status: "docker-unavailable", reason: "Cannot connect to the Docker daemon" },
};

// The compose stack's two databases on different servers, as `targetsFrom` makes them.
const [medusaDb, payloadDb] = targetsFrom({
  DATABASE_URL: "postgres://u:p@localhost:15432/medusa",
  PAYLOAD_DATABASE_URL: "postgres://u:p@localhost:5433/payload",
}).filter((t) => t.kind === "postgres") as [Target, Target];

describe("isRequired", () => {
  it("makes Postgres and Redis required, and Mailpit not", () => {
    expect(isRequired(targetOf("postgres"), statuses)).toBe(true);
    expect(isRequired(targetOf("redis"), statuses)).toBe(true);
    expect(isRequired(targetOf("mailpit-smtp"), statuses)).toBe(false);
    expect(isRequired(targetOf("mailpit-ui"), statuses)).toBe(false);
  });

  it("makes Meilisearch required only once its code is live (M6), not before", () => {
    expect(isRequired(targetOf("meilisearch"), statuses)).toBe(false);
    // Keys alone change nothing in M0: `wired` is false for it.
    expect(isRequired(targetOf("meilisearch"), getIntegrationStatus(meilisearchLive))).toBe(false);
  });
});

describe("checkIdOf", () => {
  it("is the kind of the service", () => {
    expect(checkIdOf(targetOf("redis"), targets)).toBe("redis");
    expect(checkIdOf(targetOf("mailpit-ui"), targets)).toBe("mailpit-ui");
  });

  it("is plain `postgres` for one server, and tells the two databases apart for two", () => {
    expect(checkIdOf(targetOf("postgres"), targets)).toBe("postgres");
    expect(checkIdOf(medusaDb, [medusaDb, payloadDb])).toBe("postgres-medusa");
    expect(checkIdOf(payloadDb, [medusaDb, payloadDb])).toBe("postgres-payload");
  });
});

describe("databaseFailed", () => {
  const postgres = targetOf("postgres");

  it("is true when the Postgres that holds the database failed", () => {
    for (const database of ["medusa", "payload"] as const) {
      expect(databaseFailed([finding(postgres, down)], targets, database)).toBe(true);
      expect(databaseFailed([finding(postgres)], targets, database)).toBe(false);
    }
  });

  it("looks at the database's own server when there are two", () => {
    const two = [medusaDb, payloadDb];
    expect(databaseFailed([finding(medusaDb, down), finding(payloadDb)], two, "payload")).toBe(
      false,
    );
    expect(databaseFailed([finding(medusaDb, down), finding(payloadDb)], two, "medusa")).toBe(true);
    expect(databaseFailed([finding(medusaDb), finding(payloadDb, down)], two, "payload")).toBe(
      true,
    );
    expect(databaseFailed([finding(medusaDb), finding(payloadDb, down)], two, "medusa")).toBe(
      false,
    );
  });

  it("is false when there is no such database target to fail", () => {
    expect(databaseFailed([], [targetOf("redis")], "medusa")).toBe(false);
  });
});

describe("serviceChecks", () => {
  it("keeps an error for a required service, with how to start the stack", () => {
    const [check] = serviceChecks([finding(targetOf("redis"), down)], targets, statuses);
    expect(check).toMatchObject({ id: "redis", title: "Redis", level: "error" });
    expect(check?.message).toContain("Redis is not reachable at localhost:6380");
    expect(check?.message).toContain("pnpm infra:up");
  });

  it("turns an error for a service that is not needed yet into a warning", () => {
    const checks = serviceChecks(
      [
        finding(targetOf("meilisearch"), down),
        finding(targetOf("mailpit-smtp"), down),
        finding(targetOf("postgres"), down),
      ],
      targets,
      statuses,
    );
    expect(checks.map((c) => [c.id, c.level])).toEqual([
      ["meilisearch", "warn"],
      ["mailpit-smtp", "warn"],
      ["postgres", "error"],
    ]);
  });

  it("an ok finding drops the label from the sentence the table already has", () => {
    const [check] = serviceChecks([finding(targetOf("redis"))], targets, statuses);
    expect(check).toMatchObject({
      level: "ok",
      message: "localhost:6380 is this project's redis container",
    });
  });

  it("one Docker warning instead of one per service, and the services themselves ok", () => {
    const checks = serviceChecks(
      [finding(targetOf("postgres"), noDocker), finding(targetOf("redis"), noDocker)],
      targets,
      statuses,
    );
    expect(checks.map((c) => [c.id, c.level])).toEqual([
      ["postgres", "ok"],
      ["redis", "ok"],
      ["docker", "warn"],
    ]);
    expect(checks[0]?.message).toContain("its owner is not checked: Docker is not available");
    expect(checks[2]?.message).toContain("Cannot connect to the Docker daemon");
    expect(checks[2]?.fix).toContain("Start Docker");
  });

  it("carries no Docker warning when Docker was fine", () => {
    const checks = serviceChecks([finding(targetOf("redis"))], targets, statuses);
    expect(checks.some((c) => c.id === "docker")).toBe(false);
  });
});

describe("serverCheck", () => {
  const starts = "Start it with `pnpm dev`.";
  const local = "http://localhost:9000";
  const remote = "https://shop.example.com";
  const answer = (status: number): HttpResult => ({
    kind: "response",
    status,
    text: "",
  });
  const check = (url: string, result: HttpResult) =>
    serverCheck("medusa", "Medusa backend", url, result, starts);

  it("is ok for any answer below 400, a redirect included", () => {
    expect(check(local, answer(200))).toMatchObject({
      level: "ok",
      message: "answers at http://localhost:9000 (HTTP 200)",
    });
    expect(check(local, answer(308)).level).toBe("ok");
  });

  it("is an error for an answer of 400 or more, with the status and where to look", () => {
    const result = check(local, answer(500));
    expect(result).toMatchObject({
      level: "error",
      message: "http://localhost:9000 answers HTTP 500.",
    });
    expect(result.fix).toContain("Look at the server's log");
    expect(check(local, answer(400)).level).toBe("error");
  });

  it("is only a warning when a server on this machine is not running (bootstrap runs doctor first)", () => {
    expect(check(local, { kind: "refused" })).toEqual({
      id: "medusa",
      title: "Medusa backend",
      level: "warn",
      message: "not running at http://localhost:9000.",
      fix: starts,
    });
    for (const host of ["http://127.0.0.1:9000", "http://[::1]:9000"]) {
      expect(check(host, { kind: "refused" }).level).toBe("warn");
    }
  });

  it("is an error when a remote server refuses, and does not tell the person to start it here", () => {
    const result = check(remote, { kind: "refused" });
    expect(result).toMatchObject({
      level: "error",
      message: "nothing is listening at https://shop.example.com.",
    });
    expect(result.fix).toContain("right address");
    expect(result.fix).not.toContain("pnpm dev");
  });

  it("is an error when a server that is there does not answer, local or remote", () => {
    const hung: HttpResult = {
      kind: "unreachable",
      reason: "no answer within 5 s",
    };
    expect(check(local, hung)).toMatchObject({
      level: "error",
      message: "http://localhost:9000 does not answer (no answer within 5 s).",
      fix: starts,
    });
    expect(check(remote, hung).fix).toContain("right address");
  });

  it("treats a URL it cannot read as not local", () => {
    expect(check("not a url", { kind: "refused" }).level).toBe("error");
  });
});
