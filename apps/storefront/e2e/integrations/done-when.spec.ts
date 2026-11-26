import type { IntegrationId, IntegrationStatus } from "@shopblok/integrations";
import { doctorOnline, doctorReport, missingKeys } from "../support/integration-keys";
import { parseExpected } from "../support/integration-skips";
import { SINK_KEY, startSink as startPosthogSink } from "../support/posthog-sink";
import { addToCart } from "../support/purchase";
import { SINK_DSN, startSink as startSentrySink } from "../support/sentry-sink";
import { expect, test } from "../support/third-party";

// M6's done-when (SPEC §17.1, D114, T103): each integration turns on purely through its keys, and
// every `wired` flag is true. One commit passes both of CI's runs:
// - `e2e-smoke` (`E2E_DONE_WHEN=keyless`): no key is set, the five third-party integrations are on
//   their fallback, and the shop sends nothing to a third party (this file's `test` is the keyless
//   check's, `support/third-party.ts`: a request to Stripe, Resend, Sentry, PostHog or R2 fails it);
// - `integrations-live` (the default): every integration whose keys the job holds is live in doctor,
//   and `doctor --online --strict` passes for them. The job says which keys it holds in
//   `E2E_EXPECT_LIVE`, from GitHub's secrets (`scripts/done-when.ts`); the skip reporter
//   (`support/integration-skips-reporter.ts`) fails the run when another spec skipped one of them.
// Without `E2E_EXPECT_LIVE` (a run on a PC) it is held to the integrations doctor finds configured.

const keyless = process.env["E2E_DONE_WHEN"] === "keyless";
test.describe.configure({ mode: "serial" });

/** The integrations the run must find live: the job's list, or doctor's configured ones on a PC. */
function expectedLive(statuses: readonly IntegrationStatus[]): IntegrationId[] {
  return (
    parseExpected(process.env["E2E_EXPECT_LIVE"]) ??
    statuses.filter((status) => status.configured).map((status) => status.id)
  );
}

test("every integration's code is wired, and none waits for a later milestone", () => {
  const unwired = doctorReport()
    .integrations.filter((status) => !status.wired || status.arrives !== undefined)
    .map((status) => `${status.id} (arrives: ${status.arrives ?? "not said"})`);
  expect(unwired, "wired: false in @shopblok/integrations").toEqual([]);
});

test.describe("keyless (e2e-smoke)", () => {
  test.skip(
    !keyless,
    "integrations-live has keys: this is e2e-smoke's half (E2E_DONE_WHEN=keyless)",
  );

  test("the five third-party integrations are on their fallback, with none of their keys set", () => {
    const report = doctorReport();
    const thirdParty = report.integrations.filter((status) => status.kind === "third-party");
    expect(thirdParty.map((status) => status.id)).toEqual([
      "stripe",
      "resend",
      "posthog",
      "sentry",
      "r2",
    ]);
    for (const status of thirdParty) {
      expect([status.id, status.state, status.parts.flatMap((part) => part.set)]).toEqual([
        status.id,
        "fallback",
        [],
      ]);
    }
    expect(report.ok, "doctor's verdict").toBe(true);
  });

  test("the shop sends nothing to a third party, from the home page to the checkout", async ({
    page,
  }) => {
    await page.goto("/");
    await addToCart(page);
    await page.goto("/checkout/contact");
    await expect(page.locator("main")).toBeVisible();
  });

  test("doctor --online --strict passes for the two local integrations", async () => {
    const report = await doctorOnline(["--strict", "--only=meilisearch,redis"]);
    const failed = report.checks.filter((check) => check.level !== "ok");
    expect(failed.map((check) => `${check.title}: ${check.message}`)).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

test.describe("with the keys (integrations-live)", () => {
  test.skip(keyless, "e2e-smoke holds no keys: this is integrations-live's half");

  test("each integration whose keys the job holds is live, and each of the others is on its fallback", () => {
    const report = doctorReport();
    const expected = expectedLive(report.integrations);
    const table = report.integrations.map((status) => {
      const why =
        status.state === "live" ? "live" : `not live: ${missingKeys(status).join(", ") || "?"}`;
      return `${status.id.padEnd(12)} ${expected.includes(status.id) ? "expected" : "        "} ${why}`;
    });
    console.log(`The done-when (doctor --json):\n${table.join("\n")}`);
    const notLive = report.integrations.filter((status) => status.state !== "live");
    test.info().annotations.push({
      type: "not live",
      description:
        notLive.length === 0
          ? "none: all seven are live"
          : notLive.map((status) => status.id).join(", "),
    });

    expect(
      report.integrations
        .filter((status) => expected.includes(status.id) && status.state !== "live")
        .map((status) => `${status.id}: ${missingKeys(status).join(", ") || "keys set, not live"}`),
      "the job holds these integrations' keys, but doctor finds them not live",
    ).toEqual([]);
    // A live third-party integration the job did not expect would mean a key from somewhere else.
    expect(
      report.integrations
        .filter((status) => status.state === "live" && !expected.includes(status.id))
        .map((status) => status.id),
    ).toEqual([]);
    expect(report.integrations.filter((status) => status.half).map((status) => status.id)).toEqual(
      [],
    );
  });

  test("doctor --online --strict passes for them", async () => {
    const report = doctorReport();
    const expected = expectedLive(report.integrations);
    // CI's stand-ins for Sentry and PostHog (no secret) answer only while a spec runs them.
    const env = (name: string) => process.env[name]?.trim() ?? "";
    const sinks = await Promise.all([
      env("SENTRY_DSN") === SINK_DSN ? startSentrySink() : undefined,
      env("POSTHOG_EVENTS_API_KEY") === SINK_KEY ? startPosthogSink() : undefined,
    ]);
    try {
      const online = await doctorOnline(["--strict", `--only=${expected.join(",")}`]);
      const byHand = online.checks.filter(
        (check) => check.byHand === true && check.level === "warn",
      );
      for (const check of byHand) {
        test.info().annotations.push({
          type: "check by hand",
          description: `${check.title}: ${check.message}`,
        });
      }
      const failed = online.checks.filter(
        (check) => check.level === "error" || (check.level === "warn" && check.byHand !== true),
      );
      expect(failed.map((check) => `${check.title}: ${check.message}`)).toEqual([]);
      expect(online.ok, "doctor --online --strict's verdict").toBe(true);
      // Every integration it was asked about has a check of its own in the report.
      const covered = new Set(online.checks.map((check) => check.integration));
      expect(expected.filter((id) => !covered.has(id))).toEqual([]);
    } finally {
      await Promise.all(sinks.map((sink) => sink?.close()));
    }
  });
});
