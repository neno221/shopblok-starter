import { describe, expect, it } from "vitest";
import {
  describeIntegration,
  describeMissing,
  getIntegrationStatus,
  INTEGRATION_KEYS,
  type AppEnvs,
  type IntegrationId,
  type IntegrationStatus,
} from "./integrations.ts";

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
  it("lists the seven integrations of SPEC §10, in its order", () => {
    expect(getIntegrationStatus(none).map((s) => s.id)).toEqual([
      "stripe",
      "resend",
      "posthog",
      "sentry",
      "meilisearch",
      "redis",
      "r2",
    ]);
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
    });
  });

  it("after bootstrap: Redis is live, the third-party ones are on their fallbacks", () => {
    const list = getIntegrationStatus(bootstrapped);
    expect(byId(list, "redis").state).toBe("live");
    expect(byId(list, "redis").using).toBe("Redis");
    for (const id of ["stripe", "resend", "posthog", "sentry", "r2"] as const) {
      expect(byId(list, id).state).toBe("fallback");
    }
    expect(list.filter((s) => s.kind === "third-party").every((s) => s.state === "fallback")).toBe(
      true,
    );
  });

  it("keys that are set for a provider that is not built yet change nothing (Meilisearch in M0)", () => {
    const meilisearch = byId(getIntegrationStatus(bootstrapped), "meilisearch");
    expect(meilisearch.configured).toBe(true);
    expect(meilisearch.wired).toBe(false);
    expect(meilisearch.state).toBe("fallback");
    expect(meilisearch.using).toBe("search-postgres");
    expect(meilisearch.arrives).toBe("M6");
    expect(describeIntegration(meilisearch).why).toContain("arrives in M6");
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
    const r2 = byId(getIntegrationStatus({ backend: keys, storefront: {} }), "r2");
    expect(r2.half).toBe(true);
    expect(r2.parts.find((p) => p.app === "backend")?.configured).toBe(true);
    expect(r2.parts.find((p) => p.app === "storefront")?.configured).toBe(false);
    expect(describeMissing(r2)).toContain("(apps/storefront)");
    expect(describeMissing(r2)).not.toContain("apps/backend");
  });

  it("every key set in both apps is configured, and still on the fallback until the code exists", () => {
    const status = byId(getIntegrationStatus(stripe), "stripe");
    expect(status.configured).toBe(true);
    expect(status.half).toBe(false);
    expect(status.wired).toBe(false);
    expect(status.state).toBe("fallback");
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
    expect(sentry.parts.find((p) => p.app === "storefront")?.optionalMissing).toEqual([
      "SENTRY_AUTH_TOKEN",
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
    ]) {
      expect(INTEGRATION_KEYS).toContain(key);
    }
  });
});

describe("describeMissing", () => {
  it("does not say 'each app' about an integration that lives in one", () => {
    const meilisearch = byId(getIntegrationStatus(none), "meilisearch");
    expect(describeMissing(meilisearch)).toBe(
      "MEILISEARCH_HOST, MEILISEARCH_API_KEY (apps/backend)",
    );
  });
});
