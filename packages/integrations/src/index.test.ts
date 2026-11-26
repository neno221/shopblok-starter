import { describe, expect, it } from "vitest";
import {
  describeIntegration,
  describeMissing,
  getIntegrationStatus,
  INTEGRATION_KEYS,
  type AppEnvs,
  type IntegrationId,
  type IntegrationStatus,
} from "./index";

const none: AppEnvs = { backend: {}, storefront: {} };

/** What `pnpm bootstrap` leaves in the two `.env` files (the examples, plus the secrets it fills). */
const bootstrapped: AppEnvs = {
  backend: {
    REDIS_URL: "redis://localhost:6380",
    MEILISEARCH_HOST: "http://localhost:7701",
    MEILISEARCH_API_KEY: "shopblok-local-dev-master-key",
    PAYLOAD_API_KEY: "a-key",
  },
  storefront: { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_abc" },
};

const byId = (list: IntegrationStatus[], id: IntegrationId): IntegrationStatus => {
  const found = list.find((status) => status.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

const stripe = {
  backend: { STRIPE_API_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" },
  storefront: { NEXT_PUBLIC_STRIPE_KEY: "pk_test_x" },
};

describe("getIntegrationStatus", () => {
  it("lists the seven integrations of SPEC §10, in its order, then M7's Turnstile", () => {
    expect(getIntegrationStatus(none).map((s) => s.id)).toEqual([
      "stripe",
      "resend",
      "posthog",
      "sentry",
      "meilisearch",
      "redis",
      "r2",
      "turnstile",
    ]);
  });

  // M7 T108 (D143): wired, so its two keys turn it on; one alone is half set and stays off.
  it("Turnstile is wired: its keys turn it on, and one alone is half set", () => {
    const keys = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET_KEY: "secret" };
    const off = byId(getIntegrationStatus(none), "turnstile");
    expect([off.wired, off.arrives, off.state, off.using]).toEqual([
      true,
      undefined,
      "fallback",
      "the rate limits alone",
    ]);
    const set = byId(getIntegrationStatus({ backend: {}, storefront: keys }), "turnstile");
    expect([set.configured, set.state, set.using]).toEqual([
      true,
      "live",
      "Turnstile and the rate limits",
    ]);
    expect(
      byId(
        getIntegrationStatus({ backend: {}, storefront: { TURNSTILE_SECRET_KEY: "secret" } }),
        "turnstile",
      ).half,
    ).toBe(true);
  });

  // M6's done-when (SPEC §17.1, T103): every integration's code is built, so each one turns on purely
  // through its keys. A `wired: false` (or an `arrives`) here would keep an integration on its
  // fallback with every key set, and `integrations-live`'s done-when spec fails on it too.
  it.each(
    getIntegrationStatus(none).map((status) => [status.id, status] as const),
  )("%s is wired, and says no milestone it arrives in (M6's done-when)", (_id, status) => {
    expect(status.wired).toBe(true);
    expect(status.arrives).toBeUndefined();
    expect("arrives" in status).toBe(false);
  });

  it("puts every integration on its fallback when nothing is set, and names the fallback", () => {
    const list = getIntegrationStatus(none);
    expect(list.every((s) => s.state === "fallback" && !s.configured && !s.half)).toBe(true);
    expect(Object.fromEntries(list.map((s) => [s.id, s.using]))).toEqual({
      stripe: "pp_system_default (manual payment)",
      resend: "notification-local (console) and Mailpit",
      posthog: "analytics-local (no client script)",
      sentry: "not initialised",
      meilisearch: "search-postgres",
      redis: "in-memory modules (development only)",
      r2: "local disk (development only; Vercel needs R2)",
      turnstile: "the rate limits alone",
    });
  });

  it("after bootstrap: Redis and Meilisearch are live, the third-party ones are on their fallbacks", () => {
    const list = getIntegrationStatus(bootstrapped);
    expect(byId(list, "redis").state).toBe("live");
    expect(byId(list, "redis").using).toBe("Redis");
    expect(byId(list, "meilisearch").state).toBe("live");
    expect(byId(list, "meilisearch").using).toBe("Meilisearch");
    for (const id of ["stripe", "resend", "posthog", "sentry", "r2"] as const) {
      expect(byId(list, id).state).toBe("fallback");
    }
    expect(list.filter((s) => s.kind === "third-party").every((s) => s.state === "fallback")).toBe(
      true,
    );
  });

  it("Meilisearch without its keys runs on search-postgres (T94)", () => {
    const meilisearch = byId(
      getIntegrationStatus({
        backend: { MEILISEARCH_HOST: "http://localhost:7701" },
        storefront: {},
      }),
      "meilisearch",
    );
    expect(meilisearch.wired).toBe(true);
    expect(meilisearch.configured).toBe(false);
    expect(meilisearch.state).toBe("fallback");
    expect(meilisearch.using).toBe("search-postgres");
    expect(meilisearch.arrives).toBeUndefined();
  });

  it("a blank or whitespace value is not set", () => {
    const list = getIntegrationStatus({
      backend: { REDIS_URL: "", STRIPE_API_KEY: "   ", STRIPE_WEBHOOK_SECRET: "\t" },
      storefront: {},
    });
    expect(byId(list, "redis").configured).toBe(false);
    expect(byId(list, "redis").state).toBe("fallback");
    expect(byId(list, "stripe").half).toBe(false);
  });

  it("a key in the other app does not count", () => {
    const list = getIntegrationStatus({
      backend: { NEXT_PUBLIC_STRIPE_KEY: "pk_test_x" },
      storefront: { STRIPE_API_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" },
    });
    const status = byId(list, "stripe");
    expect(status.parts.map((p) => [p.app, p.set])).toEqual([
      ["backend", []],
      ["storefront", []],
    ]);
    expect(status.half).toBe(false);
  });

  it("some keys and not all is half configured, and names what is missing in each app", () => {
    const list = getIntegrationStatus({
      backend: { STRIPE_API_KEY: "sk_test_x" },
      storefront: {},
    });
    const status = byId(list, "stripe");
    expect(status.half).toBe(true);
    expect(status.configured).toBe(false);
    expect(status.state).toBe("fallback");
    expect(describeMissing(status)).toBe(
      "STRIPE_WEBHOOK_SECRET (apps/backend); NEXT_PUBLIC_STRIPE_KEY (apps/storefront)",
    );
  });

  it("one app complete and the other empty is half configured (R2 on the backend only)", () => {
    const keys = {
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "bucket",
      S3_PUBLIC_URL: "https://media.example.com",
    };
    const r2 = byId(
      getIntegrationStatus({
        backend: { ...keys, S3_PRIVATE_BUCKET: "bucket-private" },
        storefront: {},
      }),
      "r2",
    );
    expect(r2.half).toBe(true);
    expect(r2.parts.find((p) => p.app === "backend")?.configured).toBe(true);
    expect(r2.parts.find((p) => p.app === "storefront")?.configured).toBe(false);
    expect(describeMissing(r2)).toContain("(apps/storefront)");
    expect(describeMissing(r2)).not.toContain("apps/backend");
  });

  it("both R2 parts also need the private bucket (M6 D127; the storefront's since M7 D148, T111)", () => {
    const keys = {
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "bucket",
      S3_PUBLIC_URL: "https://media.example.com",
    };
    const r2 = byId(getIntegrationStatus({ backend: keys, storefront: keys }), "r2");
    expect(r2.configured).toBe(false);
    expect(describeMissing(r2)).toBe("S3_PRIVATE_BUCKET (each app)");
    const storefrontOnly = byId(
      getIntegrationStatus({
        backend: { ...keys, S3_PRIVATE_BUCKET: "private" },
        storefront: keys,
      }),
      "r2",
    );
    expect(storefrontOnly.half).toBe(true);
    expect(describeMissing(storefrontOnly)).toBe("S3_PRIVATE_BUCKET (apps/storefront)");
    expect(r2.parts.every((p) => p.optionalMissing.join() === "S3_REGION")).toBe(true);
  });

  it("Stripe is live with every key in both apps (T100)", () => {
    const status = byId(getIntegrationStatus(stripe), "stripe");
    expect(status.configured).toBe(true);
    expect(status.half).toBe(false);
    expect([status.wired, status.state, status.arrives]).toEqual([true, "live", undefined]);
  });

  it("R2 is live with every key in both apps, the private bucket among them (T95, T111)", () => {
    const keys = {
      S3_ENDPOINT: "https://x.r2.cloudflarestorage.com",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "bucket",
      S3_PUBLIC_URL: "https://media.example.com",
    };
    const status = byId(
      getIntegrationStatus({
        backend: { ...keys, S3_PRIVATE_BUCKET: "private" },
        storefront: { ...keys, S3_PRIVATE_BUCKET: "private" },
      }),
      "r2",
    );
    expect(status.configured).toBe(true);
    expect(status.half).toBe(false);
    expect([status.wired, status.state, status.arrives]).toEqual([true, "live", undefined]);
  });

  it("Resend is live with its keys in both apps (T98), and its segment is optional", () => {
    const keys = { RESEND_API_KEY: "re_x", RESEND_FROM_EMAIL: "onboarding@resend.dev" };
    const resend = byId(getIntegrationStatus({ backend: keys, storefront: keys }), "resend");
    expect(resend.wired).toBe(true);
    expect(resend.state).toBe("live");
    expect(resend.using).toBe("Resend");
    expect(resend.arrives).toBeUndefined();
    const half = byId(getIntegrationStatus({ backend: keys, storefront: {} }), "resend");
    expect(half.state).toBe("fallback");
    expect(half.half).toBe(true);
  });

  it("PostHog is live with its two keys (T97), and both hosts are optional (the EU's)", () => {
    const posthog = byId(
      getIntegrationStatus({
        backend: { POSTHOG_EVENTS_API_KEY: "phc_x" },
        storefront: { NEXT_PUBLIC_POSTHOG_KEY: "phc_x" },
      }),
      "posthog",
    );
    expect([posthog.wired, posthog.state, posthog.using, posthog.arrives]).toEqual([
      true,
      "live",
      "PostHog",
      undefined,
    ]);
    expect(posthog.parts.map((part) => part.optionalMissing)).toEqual([
      ["POSTHOG_HOST"],
      ["NEXT_PUBLIC_POSTHOG_HOST"],
    ]);
    const half = byId(
      getIntegrationStatus({ backend: {}, storefront: { NEXT_PUBLIC_POSTHOG_KEY: "phc_x" } }),
      "posthog",
    );
    expect([half.state, half.half, describeMissing(half)]).toEqual([
      "fallback",
      true,
      "POSTHOG_EVENTS_API_KEY (apps/backend)",
    ]);
  });

  it("the Sentry auth token is optional: the DSNs turn it on, and the token's absence is named", () => {
    const sentry = byId(
      getIntegrationStatus({
        backend: { SENTRY_DSN: "https://k@o.ingest.sentry.io/1" },
        storefront: { NEXT_PUBLIC_SENTRY_DSN: "https://k@o.ingest.sentry.io/2" },
      }),
      "sentry",
    );
    expect(sentry.configured).toBe(true);
    // T96: wired, so live with both DSNs.
    expect([sentry.wired, sentry.state, sentry.arrives]).toEqual([true, "live", undefined]);
    expect(sentry.parts.find((p) => p.app === "storefront")?.optionalMissing).toEqual([
      "SENTRY_ENVIRONMENT",
      "SENTRY_TRACES_SAMPLE_RATE",
      "SENTRY_RELEASE",
      "SENTRY_AUTH_TOKEN",
      "SENTRY_ORG",
      "SENTRY_PROJECT",
    ]);
  });

  it("names the same missing keys once when both apps lack them", () => {
    const resend = byId(getIntegrationStatus(none), "resend");
    expect(describeMissing(resend)).toBe("RESEND_API_KEY, RESEND_FROM_EMAIL (each app)");
    expect(describeIntegration(resend)).toEqual({
      using: "notification-local (console) and Mailpit",
      why: "not set: RESEND_API_KEY, RESEND_FROM_EMAIL (each app)",
    });
  });

  it("never holds a value, only names", () => {
    const secret = "sk_live_SENTINEL_4f9c";
    const list = getIntegrationStatus({
      backend: { STRIPE_API_KEY: secret, REDIS_URL: `redis://:${secret}@localhost:6380` },
      storefront: { NEXT_PUBLIC_STRIPE_KEY: secret },
    });
    expect(JSON.stringify(list)).not.toContain(secret);
    expect(JSON.stringify(list)).not.toContain("SENTINEL");
  });
});

describe("getIntegrationStatus with an app (doctor --app, M7 D135)", () => {
  it("counts only that app's parts: the backend's Stripe keys alone are live for the backend", () => {
    const backendOnly = { backend: stripe.backend, storefront: {} };
    const whole = byId(getIntegrationStatus(backendOnly), "stripe");
    expect([whole.state, whole.half]).toEqual(["fallback", true]);
    const own = byId(getIntegrationStatus(backendOnly, { app: "backend" }), "stripe");
    expect([own.state, own.half, own.parts.map((part) => part.app)]).toEqual([
      "live",
      false,
      ["backend"],
    ]);
  });

  it("leaves out an integration with no part in that app", () => {
    const backend = getIntegrationStatus(none, { app: "backend" }).map((s) => s.id);
    const storefront = getIntegrationStatus(none, { app: "storefront" }).map((s) => s.id);
    expect(backend).toContain("redis");
    expect(storefront).not.toContain("redis");
    expect(storefront).not.toContain("meilisearch");
    expect(storefront).toContain("stripe");
  });

  it("still says half when that app has some of its own keys and not all", () => {
    const half = { backend: { STRIPE_API_KEY: "sk_test_x" }, storefront: {} };
    expect(byId(getIntegrationStatus(half, { app: "backend" }), "stripe").half).toBe(true);
  });
});

describe("INTEGRATION_KEYS", () => {
  it("is every key the table looks at, once", () => {
    expect(new Set(INTEGRATION_KEYS).size).toBe(INTEGRATION_KEYS.length);
    for (const key of [
      "STRIPE_API_KEY",
      "NEXT_PUBLIC_STRIPE_KEY",
      "RESEND_FROM_EMAIL",
      "POSTHOG_HOST",
      "SENTRY_AUTH_TOKEN",
      "MEILISEARCH_API_KEY",
      "REDIS_URL",
      "S3_PUBLIC_URL",
      // M6's names (D115, T93).
      "S3_PRIVATE_BUCKET",
      "S3_REGION",
      "RESEND_NEWSLETTER_SEGMENT_ID",
      "NEXT_PUBLIC_POSTHOG_HOST",
      "SENTRY_ENVIRONMENT",
      "SENTRY_TRACES_SAMPLE_RATE",
      "SENTRY_ORG",
      "SENTRY_PROJECT",
      // M7's (D143, T105).
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "TURNSTILE_SECRET_KEY",
    ]) {
      expect(INTEGRATION_KEYS).toContain(key);
    }
  });
});

describe("describeMissing", () => {
  it("says R2's keys once, the private bucket among them (both apps since T111)", () => {
    const r2 = getIntegrationStatus({ backend: {}, storefront: {} }).find((s) => s.id === "r2")!;
    expect(describeMissing(r2)).toBe(
      "S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_URL, S3_PRIVATE_BUCKET (each app)",
    );
  });

  it("does not say 'each app' about an integration that lives in one", () => {
    const meilisearch = byId(getIntegrationStatus(none), "meilisearch");
    expect(describeMissing(meilisearch)).toBe(
      "MEILISEARCH_HOST, MEILISEARCH_API_KEY (apps/backend)",
    );
  });
});
