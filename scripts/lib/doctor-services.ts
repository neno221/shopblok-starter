// What `pnpm run doctor` concludes from the machine (T14): the services in the compose stack and the
// two servers, as pure functions over what `checks.ts` and `http.ts` observed. `doctor.ts` does the
// looking; every decision that can be wrong lives here, with a test.
import {
  addressOf,
  dockerUnavailableWarning,
  hostOf,
  isLocalHost,
  type Finding,
  type Target,
} from "./checks.ts";
import { describeUnreachable, type HttpResult } from "./http.ts";
import type { IntegrationStatus } from "@shopblok/integrations";
import type { Check } from "./report.ts";

/** Postgres and Redis must be up for anything to work; the others are not used before M3 and M6. */
export function isRequired(target: Target, statuses: readonly IntegrationStatus[]): boolean {
  if (target.kind === "postgres" || target.kind === "redis") return true;
  if (target.kind === "meilisearch") {
    return statuses.find((status) => status.id === "meilisearch")?.state === "live";
  }
  return false;
}

/** A check id that stays the same between runs: `postgres`, or `postgres-payload` when there are two. */
export function checkIdOf(target: Target, all: readonly Target[]): string {
  if (target.kind !== "postgres") return target.kind;
  const two = all.filter((t) => t.kind === "postgres").length > 1;
  return two && target.databases?.[0] !== undefined
    ? `postgres-${target.databases[0]}`
    : "postgres";
}

/**
 * Whether the Postgres check for an app's database failed, so that the app is not started to read
 * it (Payload would connect to its database and could create it, D18; `medusa exec` would only fail
 * after booting).
 */
export function databaseFailed(
  findings: readonly Finding[],
  targets: readonly Target[],
  database: "medusa" | "payload",
): boolean {
  const target = targets.find((t) => t.databases?.includes(database));
  return findings.find((finding) => finding.target === target)?.level === "error";
}

export function serviceChecks(
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

/**
 * A server that should be running. Not running on this machine is a warning, because a fresh
 * `pnpm bootstrap` runs doctor before anything is started (a doctor that complained then would break
 * bootstrap); a server that answers with an error, or a remote one that does not answer, is an error.
 */
export function serverCheck(
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
    return { id, title, level: "warn", message: `not running at ${url}.`, fix: starts };
  }
  return {
    id,
    title,
    level: "error",
    message:
      result.kind === "refused"
        ? `nothing is listening at ${url}.`
        : `${url} ${describeUnreachable(result)}.`,
    // "Start it with pnpm dev" is for a server on this machine.
    fix: local ? starts : `Check that ${url} is the right address and that the server is up.`,
  };
}
