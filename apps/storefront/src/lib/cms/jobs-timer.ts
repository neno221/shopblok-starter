import type { RawEnv } from "../env";
import { siteOrigin } from "../site-origin";

/** How often the development timer calls the jobs endpoint, as Medusa's worker does on a deployment. */
export const JOBS_INTERVAL_MS = 60_000;

export type JobsTimerDeps = {
  env: RawEnv;
  fetch: typeof fetch;
  setInterval: (run: () => void, ms: number) => unknown;
  log: (message: string) => void;
};

/**
 * Starts the one-minute call to `/api/payload-jobs/run` with `CRON_SECRET` (D74), in development
 * only, so a scheduled publish runs inside a Next request and its `revalidateTag` works (Payload's
 * own `autoRun` would publish from a timer outside any request, where `revalidateTag` throws).
 * A deployment has Medusa's worker instead (M7 D148, 1: `apps/backend/src/jobs/payload-jobs-tick.ts`,
 * every minute with the same secret; bootstrap leaves the backend's blank in development, so only
 * this timer calls there, and CI's `e2e-smoke`, which sets both, has the two call side by side
 * while its `next dev` step runs, which Payload's queue tolerates); without a secret there is
 * nothing to send. Returns whether it started.
 */
export function startJobsTimer({ env, fetch, setInterval, log }: JobsTimerDeps): boolean {
  const secret = env.CRON_SECRET;
  if (env.NODE_ENV !== "development" || !secret) return false;
  const url = new URL("/api/payload-jobs/run", siteOrigin(env.NEXT_PUBLIC_BASE_URL));
  let failing = false;
  setInterval(() => {
    fetch(url, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        failing = false;
      })
      .catch((error: unknown) => {
        // Once per outage, not every minute.
        if (!failing) log(`jobs: ${url.pathname} failed (${String(error)}); retrying every minute`);
        failing = true;
      });
  }, JOBS_INTERVAL_MS);
  return true;
}
