import { describe, expect, it } from "vitest";
import { START_STACK, targetsFrom, type Finding, type Target } from "./checks.ts";
import {
  checkIdOf,
  isRequired,
  payloadDatabaseFailed,
  serverCheck,
  serviceChecks,
} from "./doctor-services.ts";
import type { HttpResult } from "./http.ts";
import { getIntegrationStatus, type AppEnvs } from "./integrations.ts";

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

const finding = (
  target: Target,
  level: Finding["level"],
  extra: Partial<Finding> = {},
): Finding => ({
  target,
  level,
  message: `${target.label} at localhost:${target.port} is this project's ${target.service} container`,
  ...extra,
});

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
  const medusaDb = {
    ...targetOf("postgres"),
    label: "Postgres (medusa database)",
  };
  const payloadDb = {
    ...targetOf("postgres"),
    label: "Postgres (payload database)",
    port: 5433,
  };

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

describe("payloadDatabaseFailed", () => {
  const postgres = targetOf("postgres");

  it("is true when the Postgres that holds the payload database failed", () => {
    expect(payloadDatabaseFailed([finding(postgres, "error")], targets)).toBe(true);
    expect(payloadDatabaseFailed([finding(postgres, "ok")], targets)).toBe(false);
  });

  it("looks at the payload database's own server when there are two", () => {
    const medusaDb = { ...postgres, label: "Postgres (medusa database)" };
    const payloadDb = {
      ...postgres,
      label: "Postgres (payload database)",
      port: 5433,
    };
    const two = [medusaDb, payloadDb];
    expect(payloadDatabaseFailed([finding(medusaDb, "error"), finding(payloadDb, "ok")], two)).toBe(
      false,
    );
    expect(payloadDatabaseFailed([finding(medusaDb, "ok"), finding(payloadDb, "error")], two)).toBe(
      true,
    );
  });

  it("is false when there is no payload database target to fail", () => {
    expect(payloadDatabaseFailed([], [targetOf("redis")])).toBe(false);
  });
});

describe("serviceChecks", () => {
  it("keeps an error for a required service", () => {
    const [check] = serviceChecks(
      [
        finding(targetOf("redis"), "error", {
          message: "Redis is not reachable at localhost:6380.",
        }),
      ],
      targets,
      statuses,
    );
    expect(check).toMatchObject({
      id: "redis",
      title: "Redis",
      level: "error",
      message: "Redis is not reachable at localhost:6380.",
    });
  });

  it("turns an error for a service that is not needed yet into a warning", () => {
    const checks = serviceChecks(
      [
        finding(targetOf("meilisearch"), "error"),
        finding(targetOf("mailpit-smtp"), "error"),
        finding(targetOf("postgres"), "error"),
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
    const [check] = serviceChecks([finding(targetOf("redis"), "ok")], targets, statuses);
    expect(check).toMatchObject({
      level: "ok",
      message: "localhost:6380 is this project's redis container",
    });
  });

  it("one Docker warning instead of one per service, and the services themselves ok", () => {
    const unchecked = (target: Target) =>
      finding(target, "warn", {
        dockerReason: "Cannot connect to the Docker daemon",
      });
    const checks = serviceChecks(
      [unchecked(targetOf("postgres")), unchecked(targetOf("redis"))],
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
    const checks = serviceChecks([finding(targetOf("redis"), "ok")], targets, statuses);
    expect(checks.some((c) => c.id === "docker")).toBe(false);
  });

  it("says how to start the stack when a required service is down", () => {
    const [check] = serviceChecks(
      [
        finding(targetOf("postgres"), "error", {
          message: `not reachable. ${START_STACK}`,
        }),
      ],
      targets,
      statuses,
    );
    expect(check?.message).toContain("pnpm infra:up");
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
