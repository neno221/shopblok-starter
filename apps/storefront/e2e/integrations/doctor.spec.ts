import { expect, test } from "@playwright/test";
import { doctorReport, missingKeys } from "../support/integration-keys";

// M6 D114 (T93): the first spec of the `integrations` project, which CI's `integrations-live` job runs
// on a stack started with the test keys from GitHub's secrets. It runs with or without keys: it
// prints which integrations it found keys for, and holds doctor to the rule that turns them on (D114:
// env only). An integration with all its keys and its code (`wired`) is `live`; one with its keys
// and no code yet is still on its fallback, and says which milestone brings the code; one without
// all its keys is on its fallback. Doctor's verdict is `ok` (both servers answer, no error such as a
// live Stripe key outside production, D115).
test("doctor names the integrations whose keys are set, and each is live only with its keys and its code", () => {
  const report = doctorReport();
  const lines = report.integrations.map((status) => {
    const missing = missingKeys(status);
    const why =
      status.state === "live"
        ? "live"
        : status.configured
          ? `keys set; its code arrives in ${status.arrives ?? "a later task"}`
          : `no keys: ${missing.join(", ")}`;
    return `${status.id.padEnd(12)} ${status.state.padEnd(9)} ${why}`;
  });
  console.log(`Integrations (pnpm run doctor --json):\n${lines.join("\n")}`);
  const withKeys = report.integrations.filter((status) => status.configured).map((s) => s.id);
  test.info().annotations.push({
    type: "keys found",
    description: withKeys.length === 0 ? "none" : withKeys.join(", "),
  });

  for (const status of report.integrations) {
    expect(status.state, status.id).toBe(status.configured && status.wired ? "live" : "fallback");
  }
  expect(report.checks.find((check) => check.id === "stripe-live-key")).toBeUndefined();
  const errors = report.checks.filter((check) => check.level === "error");
  expect(errors.map((check) => `${check.title}: ${check.message}`)).toEqual([]);
  expect(report.ok).toBe(true);
});
