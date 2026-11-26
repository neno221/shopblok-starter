import { describe, expect, it } from "vitest";
import {
  integrationOfSpec,
  judgeSkips,
  NOT_SET,
  parseExpected,
  type Outcome,
} from "./integration-skips";

const passed = (file: string, title = "a check"): Outcome => ({
  file: `e2e/integrations/${file}`,
  title,
  status: "passed",
  skipReasons: [],
});
const skipped = (file: string, reason: string, title = "a check"): Outcome => ({
  file: `e2e/integrations/${file}`,
  title,
  status: "skipped",
  skipReasons: [reason],
});
const notSet = (name: string) => `${name}: ${NOT_SET}: STRIPE_API_KEY (apps/backend). Add them…`;

describe("integrationOfSpec", () => {
  it.each([
    ["stripe-checkout.spec.ts", "stripe"],
    ["e2e/integrations/stripe-saved.spec.ts", "stripe"],
    ["C:\\shop\\e2e\\integrations\\r2.spec.ts", "r2"],
    ["resend.spec.ts", "resend"],
    ["posthog.spec.ts", "posthog"],
    ["sentry.spec.ts", "sentry"],
    ["doctor.spec.ts", "general"],
    ["done-when.spec.ts", "general"],
    ["checkout.spec.ts", undefined],
    ["stripey.spec.ts", undefined],
  ])("%s → %s", (file, id) => {
    expect(integrationOfSpec(file)).toBe(id);
  });
});

describe("parseExpected", () => {
  it("reads the ids, and refuses one it does not know", () => {
    expect(parseExpected(undefined)).toBeUndefined();
    expect(parseExpected("")).toEqual([]);
    expect(parseExpected("stripe, posthog,")).toEqual(["stripe", "posthog"]);
    expect(() => parseExpected("stripe,paypal")).toThrow(/paypal/);
  });
});

describe("judgeSkips", () => {
  it("passes when the specs of the integrations with keys ran, and skips of the others are notices", () => {
    const verdict = judgeSkips(
      [
        passed("doctor.spec.ts"),
        passed("sentry.spec.ts"),
        skipped("stripe-checkout.spec.ts", notSet("Stripe")),
        skipped("r2.spec.ts", notSet("Cloudflare R2")),
      ],
      ["sentry", "meilisearch", "redis"],
    );
    expect(verdict.problems).toEqual([]);
    expect(verdict.notices).toHaveLength(2);
  });

  it("fails a test skipped for a missing key the job holds (a step that does not pass it on)", () => {
    const verdict = judgeSkips(
      [passed("stripe-checkout.spec.ts", "one"), skipped("stripe-saved.spec.ts", notSet("Stripe"))],
      ["stripe"],
    );
    expect(verdict.problems).toEqual([
      expect.stringContaining(
        "stripe-saved.spec.ts › a check was skipped although the job holds stripe's keys",
      ),
      "Every test of stripe-saved.spec.ts was skipped although the job holds stripe's keys.",
    ]);
  });

  it("fails a spec whose every test skipped itself some other way while the keys are held", () => {
    const verdict = judgeSkips([skipped("r2.spec.ts", "the bucket is not there")], ["r2"]);
    expect(verdict.problems).toEqual([
      "Every test of r2.spec.ts was skipped although the job holds r2's keys.",
    ]);
    expect(verdict.notices).toEqual(["r2.spec.ts › a check: skipped (the bucket is not there)"]);
  });

  it("keeps a skip of one test, for another reason, a notice (a check left for W8, an optional id)", () => {
    const verdict = judgeSkips(
      [
        passed("resend.spec.ts", "verification"),
        skipped("resend.spec.ts", "RESEND_NEWSLETTER_SEGMENT_ID is not set", "newsletter"),
      ],
      ["resend"],
    );
    expect(verdict.problems).toEqual([]);
    expect(verdict.notices).toEqual([
      "resend.spec.ts › newsletter: skipped (RESEND_NEWSLETTER_SEGMENT_ID is not set)",
    ]);
  });

  it("fails a third-party integration with keys and no spec in the run; local ones need none", () => {
    expect(judgeSkips([passed("doctor.spec.ts")], ["posthog", "redis"]).problems).toEqual([
      "The job holds posthog's keys, but no spec of e2e/integrations/ checked it.",
    ]);
  });

  it("fails a spec that is named after no integration", () => {
    expect(judgeSkips([passed("checkout.spec.ts")], []).problems).toEqual([
      expect.stringContaining("checkout.spec.ts is named after no integration"),
    ]);
  });
});
