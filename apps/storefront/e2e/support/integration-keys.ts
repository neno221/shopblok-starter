// What the live checks know about the keys (M6 D114, T93): `doctor --json`, run once per worker
// from the repo root. Doctor reads each app's variables from the shell over its `.env` file,
// so the same answer holds in CI's `integrations-live` job (the keys exported from GitHub's secrets)
// and on a PC (the keys in the `.env` files). Its JSON holds names and states only, never a value.
//
// A spec under `e2e/integrations/` calls `skipWithoutKeys(test, "stripe")` first: without the
// integration's keys the test is skipped with a notice that names the missing secrets, so the job is
// green on a fork or before a key is added, and says what it did not check.
import { spawnSync } from "node:child_process";
import path from "node:path";
import type { TestType } from "@playwright/test";
import type { IntegrationId, IntegrationStatus } from "@shopblok/integrations";

export type DoctorCheck = {
  id: string;
  title: string;
  level: "ok" | "warn" | "error";
  message: string;
};
export type DoctorReport = {
  ok: boolean;
  integrations: IntegrationStatus[];
  checks: DoctorCheck[];
};

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
let cached: DoctorReport | undefined;

/**
 * Doctor's report, as JSON. Its exit code is not the point here: an error is in the report. Doctor is
 * started as `pnpm run doctor` starts it (`node scripts/doctor.ts`), with this process's own Node:
 * `spawnSync("pnpm")` finds no `pnpm` on Windows, where it is `pnpm.cmd` (PR 134 review, item 3).
 */
export function doctorReport(): DoctorReport {
  if (cached !== undefined) return cached;
  cached = runDoctor(["--json"]);
  return cached;
}

/**
 * Doctor's report with `--online` (T96: Sentry's DSN check), run each time it is asked for: the
 * services it calls may have changed since.
 */
export function doctorOnline(): DoctorReport {
  return runDoctor(["--json", "--online"]);
}

function runDoctor(args: readonly string[]): DoctorReport {
  const run = spawnSync(process.execPath, [path.join("scripts", "doctor.ts"), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const failed = (why: string) =>
    new Error(
      `doctor ${args.join(" ")} ${why} (exit ${run.status ?? "none"}): ${(run.stderr ?? "").slice(-400)}`,
    );
  if (run.error !== undefined) throw failed(`did not run: ${run.error.message}`);
  if (!run.stdout?.trim()) throw failed("printed nothing");
  let parsed: unknown;
  try {
    parsed = JSON.parse(run.stdout);
  } catch {
    throw failed("printed no JSON");
  }
  if (!isReport(parsed)) throw failed("printed JSON without an integrations list");
  return parsed;
}

function isReport(value: unknown): value is DoctorReport {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { integrations?: unknown }).integrations) &&
    Array.isArray((value as { checks?: unknown }).checks)
  );
}

/** The integration's status out of doctor's report. */
export function integration(id: IntegrationId): IntegrationStatus {
  const found = doctorReport().integrations.find((status) => status.id === id);
  if (found === undefined) throw new Error(`doctor's report has no integration "${id}"`);
  return found;
}

/** The missing keys of an integration, each with its app: `STRIPE_API_KEY (apps/backend)`. */
export function missingKeys(status: IntegrationStatus): string[] {
  return status.parts.flatMap((part) => part.missing.map((key) => `${key} (apps/${part.app})`));
}

/**
 * Skips the calling spec's tests when `id`'s keys are not all set, with a notice naming the secrets
 * that are missing (GitHub: repository → Settings → Secrets and variables → Actions; M6 §4a, G10).
 * Call it at the top of a spec file or a `describe`.
 */
export function skipWithoutKeys(test: TestType<object, object>, id: IntegrationId): void {
  test.beforeEach(() => {
    const status = integration(id);
    const missing = missingKeys(status);
    test.skip(
      missing.length > 0,
      `${status.name}: not checked, because these keys are not set: ${missing.join(", ")}. Add them as GitHub secrets (M6 §4a, G10).`,
    );
  });
}
