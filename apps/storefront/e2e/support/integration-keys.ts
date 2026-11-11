// What the live checks know about the keys (M6 D114, T93): `pnpm run doctor --json`, run once per
// worker from the repo root. Doctor reads each app's variables from the shell over its `.env` file,
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

/** Doctor's report, as JSON. Its exit code is not the point here: an error is in the report. */
export function doctorReport(): DoctorReport {
  if (cached !== undefined) return cached;
  const run = spawnSync("pnpm", ["--silent", "run", "doctor", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  try {
    cached = JSON.parse(run.stdout) as DoctorReport;
  } catch {
    throw new Error(
      `pnpm run doctor --json printed no JSON (exit ${run.status ?? "none"}): ${run.stderr.slice(-400)}`,
    );
  }
  return cached;
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
