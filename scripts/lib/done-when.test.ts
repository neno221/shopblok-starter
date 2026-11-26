import { describe, expect, it } from "vitest";
import { expectedLive } from "./done-when.ts";

const sinks = {
  SENTRY_DSN: "http://e2esink@127.0.0.1:8970/1",
  NEXT_PUBLIC_SENTRY_DSN: "http://e2esink@127.0.0.1:8970/1",
  POSTHOG_EVENTS_API_KEY: "phc_ShopblokE2eSinkStandIn",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_ShopblokE2eSinkStandIn",
};

describe("expectedLive (T103)", () => {
  it("with no secret: the stand-ins and the local ones are expected, the others are not live", () => {
    const result = expectedLive(sinks);
    expect(result.expected).toEqual(["posthog", "sentry", "meilisearch", "redis"]);
    expect(result.notLive.map((each) => each.id)).toEqual(["stripe", "resend", "r2"]);
    expect(result.problems).toEqual([]);
    expect(result.lines.find((line) => line.startsWith("stripe"))).toContain(
      "not live: checked on its fallback (not set: STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET (apps/backend); NEXT_PUBLIC_STRIPE_KEY (apps/storefront))",
    );
  });

  it("with every key: all seven are expected", () => {
    const result = expectedLive({
      ...sinks,
      STRIPE_API_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "ci-stand-in-webhook-secret",
      NEXT_PUBLIC_STRIPE_KEY: "pk_test_x",
      RESEND_API_KEY: "re_x",
      RESEND_FROM_EMAIL: "onboarding@resend.dev",
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "x",
      S3_SECRET_ACCESS_KEY: "x",
      S3_BUCKET: "shopblok-dev",
      S3_PRIVATE_BUCKET: "shopblok-dev-private",
      S3_PUBLIC_URL: "https://pub-x.r2.dev",
    });
    expect(result.expected).toEqual([
      "stripe",
      "resend",
      "posthog",
      "sentry",
      "meilisearch",
      "redis",
      "r2",
    ]);
    expect([result.notLive, result.problems]).toEqual([[], []]);
  });

  it("a half-set integration is a problem that names what is missing, never a value", () => {
    const result = expectedLive({ ...sinks, STRIPE_API_KEY: "sk_test_SENTINEL" });
    expect(result.problems).toEqual([
      expect.stringContaining(
        "Stripe has some of its keys and not all: STRIPE_WEBHOOK_SECRET (apps/backend); NEXT_PUBLIC_STRIPE_KEY (apps/storefront) missing",
      ),
    ]);
    expect(result.expected).not.toContain("stripe");
    expect(JSON.stringify(result)).not.toContain("SENTINEL");
  });
});
