// M6's done-when (T103): in CI's `integrations-live` job, a spec of `e2e/integrations/` must not be
// skipped while the job holds its integration's keys. `skipWithoutKeys` skips a spec when doctor,
// in the specs' own process, finds a key missing; the job knows independently which keys it holds
// (`E2E_EXPECT_LIVE`, written from GitHub's secrets by `scripts/done-when.ts`). So a key that a step
// forgot to pass on, or a spec that skips itself some other way, fails the job instead of turning a
// live check into a quiet skip. Pure: the reporter (`integration-skips-reporter.ts`) feeds it the
// tests' outcomes, and the unit test feeds it every case.
import { getIntegrationStatus, type IntegrationId } from "@shopblok/integrations";

/** The words of `skipWithoutKeys`'s notice that say a key is missing (`integration-keys.ts`). */
export const NOT_SET = "not checked, because these keys are not set";

/** Specs about every integration, or none in particular: doctor's table and the done-when itself. */
export const GENERAL_SPECS: readonly string[] = ["doctor", "done-when"];

const STATUSES = getIntegrationStatus({ backend: {}, storefront: {} });
const IDS: readonly IntegrationId[] = STATUSES.map((status) => status.id);
const THIRD_PARTY: readonly IntegrationId[] = STATUSES.filter(
  (status) => status.kind === "third-party",
).map((status) => status.id);

/**
 * The integration a spec file checks, from its name: `stripe-saved.spec.ts` is Stripe's,
 * `r2.spec.ts` R2's. `general` for `GENERAL_SPECS`; `undefined` for a name that follows neither rule.
 */
export function integrationOfSpec(file: string): IntegrationId | "general" | undefined {
  const name = file
    .split(/[\\/]/)
    .pop()!
    .replace(/\.spec\.ts$/, "");
  if (GENERAL_SPECS.includes(name)) return "general";
  const prefix = name.split("-")[0] as IntegrationId;
  return IDS.includes(prefix) ? prefix : undefined;
}

/** `E2E_EXPECT_LIVE`'s ids: `stripe,posthog`. Unknown ids are an error, not ignored. */
export function parseExpected(value: string | undefined): IntegrationId[] | undefined {
  if (value === undefined) return undefined;
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
  const unknown = ids.filter((id) => !(IDS as string[]).includes(id));
  if (unknown.length > 0)
    throw new Error(`E2E_EXPECT_LIVE names no integration ${unknown.join(", ")}`);
  return ids as IntegrationId[];
}

export type Outcome = {
  /** The spec's path (any separator); only its file name counts. */
  file: string;
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  /** The descriptions of the test's `skip` annotations. */
  skipReasons: readonly string[];
};

export type Verdict = { problems: string[]; notices: string[] };

const fileName = (file: string) => file.split(/[\\/]/).pop()!;

/**
 * What the run did with the keys it holds. A problem fails the job:
 * - a spec named after no integration (the rule above can't tell what it checks);
 * - a test skipped for a missing key of an integration the job holds the keys for;
 * - a spec of such an integration none of whose tests ran;
 * - a third-party integration the job holds the keys for with no spec in the run at all.
 * Any other skip (a check left for W8, an optional variable) is a notice.
 */
export function judgeSkips(
  outcomes: readonly Outcome[],
  expected: readonly IntegrationId[],
): Verdict {
  const problems: string[] = [];
  const notices: string[] = [];
  const files = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    const name = fileName(outcome.file);
    files.set(name, [...(files.get(name) ?? []), outcome]);
  }
  const seen = new Set<IntegrationId>();
  for (const [name, tests] of files) {
    const id = integrationOfSpec(name);
    if (id === undefined) {
      problems.push(
        `${name} is named after no integration: call it <integration>[-<what>].spec.ts (${IDS.join(", ")}), or add it to GENERAL_SPECS.`,
      );
      continue;
    }
    if (id === "general") continue;
    seen.add(id);
    const held = expected.includes(id);
    // The other skips, one notice per reason: `r2.spec.ts: 5 tests skipped (…)`.
    const quiet = new Map<string, number>();
    for (const test of tests.filter((each) => each.status === "skipped")) {
      const reason = test.skipReasons.join("; ") || "no reason given";
      if (held && test.skipReasons.some((each) => each.includes(NOT_SET))) {
        problems.push(
          `${name} › ${test.title} was skipped although the job holds ${id}'s keys: ${reason} (a step does not pass them on).`,
        );
      } else {
        quiet.set(reason, (quiet.get(reason) ?? 0) + 1);
      }
    }
    for (const [reason, count] of quiet) {
      notices.push(`${name}: ${count} test${count === 1 ? "" : "s"} skipped (${reason})`);
    }
    if (held && tests.every((each) => each.status === "skipped")) {
      problems.push(`Every test of ${name} was skipped although the job holds ${id}'s keys.`);
    }
  }
  for (const id of expected) {
    if (THIRD_PARTY.includes(id) && !seen.has(id)) {
      problems.push(`The job holds ${id}'s keys, but no spec of e2e/integrations/ checked it.`);
    }
  }
  return { problems, notices };
}
