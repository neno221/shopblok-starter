// M6's done-when in CI (T103): which integrations `integrations-live` must find live, from the keys
// the job holds. Pure: the step's environment comes in (GitHub's secrets and variables, the stand-ins
// for Sentry and PostHog when their secrets are not set, Stripe's stand-in webhook secret), and the
// result is ids and names only, never a value. `scripts/done-when.ts` writes it to `E2E_EXPECT_LIVE`,
// which the done-when spec and the skip reporter hold the run to.
import {
  describeMissing,
  getIntegrationStatus,
  type EnvLike,
  type IntegrationId,
} from "@shopblok/integrations";

export type Expected = {
  /** The integrations the run must find live: the third-party ones whose keys are all held, and the local ones. */
  expected: IntegrationId[];
  /** The third-party ones with none of their keys, which the run checks on their fallback. */
  notLive: { id: IntegrationId; missing: string }[];
  /** A third-party integration with some of its keys and not all: a mistake that fails the step. */
  problems: string[];
  /** What a person reads in the job's log. */
  lines: string[];
};

/**
 * The job passes one environment to both apps, so both apps' parts are read from it. The local
 * integrations (Meilisearch, Redis) are expected whatever it holds: `pnpm bootstrap` writes their
 * keys into the `.env` files, which doctor and the apps read under the job's variables.
 */
export function expectedLive(env: EnvLike): Expected {
  const statuses = getIntegrationStatus({ backend: env, storefront: env });
  const result: Expected = { expected: [], notLive: [], problems: [], lines: [] };
  for (const status of statuses) {
    const label = status.id.padEnd(12);
    if (status.kind === "local") {
      result.expected.push(status.id);
      result.lines.push(`${label} expected live (local: bootstrap writes its keys)`);
    } else if (status.configured && !status.wired) {
      // Named before its code (M7's Turnstile until T108): its keys change nothing yet.
      result.notLive.push({
        id: status.id,
        missing: `its code arrives in ${status.arrives ?? "a later task"}`,
      });
      result.lines.push(
        `${label} not live: its keys are held, its code arrives in ${status.arrives ?? "a later task"}`,
      );
    } else if (status.configured) {
      result.expected.push(status.id);
      result.lines.push(`${label} expected live (the job holds its keys)`);
    } else if (status.half) {
      const missing = describeMissing(status);
      result.problems.push(
        `${status.name} has some of its keys and not all: ${missing} missing. Add the missing secrets or variables, or remove the others (M6 §4a, G10).`,
      );
      result.lines.push(`${label} half set: ${missing} missing`);
    } else {
      const missing = describeMissing(status);
      result.notLive.push({ id: status.id, missing });
      result.lines.push(`${label} not live: checked on its fallback (not set: ${missing})`);
    }
  }
  return result;
}
