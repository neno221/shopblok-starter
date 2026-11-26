import { describe, expect, it } from "vitest";
import { getIntegrationStatus } from "@shopblok/integrations";
import {
  effectiveLevel,
  exitCodeOf,
  integrationOf,
  scopeChecks,
  renderJson,
  renderText,
  summarize,
  type Check,
  type Report,
} from "./report.ts";

const integrations = getIntegrationStatus({
  backend: { REDIS_URL: "redis://localhost:6380" },
  storefront: {},
});

const ok: Check = { id: "a", title: "Postgres", level: "ok", message: "answers." };
const warn: Check = {
  id: "b",
  title: "Email verification",
  level: "warn",
  message: "No Resend key.",
  fix: "Set RESEND_API_KEY.",
};
const error: Check = {
  id: "c",
  title: "Redis",
  level: "error",
  message: "Redis is not reachable at localhost:6380.",
  details: ["one", "two"],
};

const report = (...checks: Check[]): Report => ({ integrations, checks });
const plain = { strict: false, online: false };
const strict = { strict: true, online: false };

describe("exit code", () => {
  it("0 for ok and for warnings alone", () => {
    expect(exitCodeOf(report(ok), plain)).toBe(0);
    expect(exitCodeOf(report(ok, warn), plain)).toBe(0);
  });

  it("1 for an error", () => {
    expect(exitCodeOf(report(ok, warn, error), plain)).toBe(1);
    expect(exitCodeOf(report(error), plain)).toBe(1);
  });

  it("--strict makes a warning fail", () => {
    expect(exitCodeOf(report(ok, warn), strict)).toBe(1);
    expect(exitCodeOf(report(ok), strict)).toBe(0);
  });
});

describe("summarize and effectiveLevel", () => {
  it("counts the levels, and a warning as an error under --strict", () => {
    expect(summarize([ok, warn, warn, error], false)).toEqual({ ok: 1, warn: 2, error: 1 });
    expect(summarize([ok, warn, warn, error], true)).toEqual({ ok: 1, warn: 0, error: 3 });
    expect(effectiveLevel(ok, true)).toBe("ok");
  });

  it("leaves a warning the keys cannot clear (byHand) a warning under --strict (T103)", () => {
    const byHand: Check = { ...warn, id: "r2-cors", byHand: true };
    expect(effectiveLevel(byHand, true)).toBe("warn");
    expect(summarize([ok, byHand, warn], true)).toEqual({ ok: 1, warn: 1, error: 1 });
    expect(exitCodeOf(report(ok, byHand), strict)).toBe(0);
    expect(renderText(report(byHand), strict)).toContain(
      "warning these keys cannot clear: check it by hand",
    );
    // A byHand error is still an error.
    expect(exitCodeOf(report({ ...byHand, level: "error" }), strict)).toBe(1);
  });
});

describe("integrationOf and --only (T103)", () => {
  it.each([
    ["stripe-key", "stripe"],
    ["stripe-webhook", "stripe"],
    ["integration-stripe", "stripe"],
    ["integration-r2", "r2"],
    ["resend", "resend"],
    ["resend-domain-backend-storefront", "resend"],
    ["email-verification", "resend"],
    ["posthog-flags", "posthog"],
    ["sentry-envelope", "sentry"],
    ["search-locales", "meilisearch"],
    ["search-index", "meilisearch"],
    ["meilisearch", "meilisearch"],
    ["redis", "redis"],
    ["redis-production", "redis"],
    ["r2-cors-private", "r2"],
    ["vercel-storage", "r2"],
    ["postgres", undefined],
    ["postgres-medusa", undefined],
    ["medusa", undefined],
    ["markets", undefined],
    ["payload-auth", undefined],
    ["secrets", undefined],
    ["stripey", undefined],
  ])("%s is %s's", (id, integration) => {
    expect(integrationOf(id)).toBe(integration);
  });

  it("keeps only the listed integrations' checks, and judges the exit code on them alone", () => {
    const stripeWarn: Check = { ...warn, id: "stripe-domains" };
    const resendWarn: Check = { ...warn, id: "email-verification" };
    const general: Check = { ...error, id: "medusa" };
    const redisOk: Check = { ...ok, id: "redis" };
    const all = report(ok, stripeWarn, resendWarn, general, redisOk);
    expect(scopeChecks(all.checks, ["stripe"]).map((check) => check.id)).toEqual([
      "stripe-domains",
    ]);
    expect(scopeChecks(all.checks, undefined)).toHaveLength(5);
    expect(exitCodeOf(all, { ...strict, only: ["redis"] })).toBe(0);
    expect(exitCodeOf(all, { ...strict, only: ["stripe"] })).toBe(1);
    expect(exitCodeOf(all, { ...plain, only: ["stripe", "resend"] })).toBe(0);
    const json = JSON.parse(renderJson(all, { ...strict, only: ["stripe"] })) as {
      ok: boolean;
      only: string[];
      checks: { id: string; integration?: string }[];
      integrations: unknown[];
    };
    expect([json.ok, json.only, json.checks]).toEqual([
      false,
      ["stripe"],
      [expect.objectContaining({ id: "stripe-domains", integration: "stripe" })],
    ]);
    expect(json.integrations).toHaveLength(7);
    expect(renderText(all, { ...plain, only: ["stripe"] })).toContain("Checks (--only stripe)");
  });

  it("fails an integration of --only that no check is about, instead of judging nothing", () => {
    const all = report({ ...ok, id: "redis" });
    expect(scopeChecks(all.checks, ["redis", "posthog"]).map((check) => check.id)).toEqual([
      "redis",
      "only-posthog",
    ]);
    expect(exitCodeOf(all, { ...plain, only: ["posthog"] })).toBe(1);
    expect(exitCodeOf(all, { ...plain, only: ["redis"] })).toBe(0);
    expect(renderText(all, { ...plain, only: ["posthog"] })).toContain(
      "Doctor made no check about posthog",
    );
  });
});

describe("renderText", () => {
  it("lists the integrations with their state and what runs", () => {
    const text = renderText(report(ok), plain);
    expect(text).toMatch(/Stripe\s+fallback\s+pp_system_default \(manual payment\)/);
    expect(text).toMatch(/Redis\s+live\s+Redis/);
    expect(text).toContain("not set: STRIPE_API_KEY");
  });

  it("shows an ok check on one line, a problem with its message, details and fix", () => {
    const text = renderText(report(ok, warn, error), plain);
    expect(text).toContain("  ✓ Postgres: answers.");
    expect(text).toContain(
      "  ! Email verification\n      No Resend key.\n      → Set RESEND_API_KEY.",
    );
    expect(text).toContain(
      "  ✗ Redis\n      Redis is not reachable at localhost:6380.\n      - one\n      - two",
    );
    expect(text).toContain("1 check ok, 1 warning, 1 error.");
  });

  it("--strict shows a warning as an error and says why", () => {
    const text = renderText(report(warn), strict);
    expect(text).toContain("✗ Email verification (warning, fails under --strict)");
    expect(text).toContain("0 checks ok, 0 warnings, 1 error (--strict).");
  });
});

describe("renderJson", () => {
  it("has the verdict, the counts, every integration and every check", () => {
    const body = JSON.parse(renderJson(report(ok, warn), { strict: false, online: true })) as {
      ok: boolean;
      online: boolean;
      summary: { ok: number; warn: number; error: number };
      integrations: { id: string; state: string }[];
      checks: { id: string; level: string }[];
    };
    expect(body.ok).toBe(true);
    expect(body.online).toBe(true);
    expect(body.summary).toEqual({ ok: 1, warn: 1, error: 0 });
    expect(body.integrations.map((i) => i.id)).toHaveLength(7);
    expect(body.checks.map((c) => [c.id, c.level])).toEqual([
      ["a", "ok"],
      ["b", "warn"],
    ]);
  });

  it("says ok: false when the exit code is 1", () => {
    expect(JSON.parse(renderJson(report(error), plain)).ok).toBe(false);
    expect(JSON.parse(renderJson(report(warn), strict)).ok).toBe(false);
  });

  it("hides a key and a connection string's password in a message, in the text and in the JSON", () => {
    const leaky: Check = {
      id: "x",
      title: "Leak",
      level: "warn",
      message:
        "failed for postgres://postgres:hunter2@localhost:15432/payload with pk_0123456789abcdef0123",
      details: ['{"apiKey":"abcdef123456"}'],
      fix: "see redis://:hunter2@host",
    };
    for (const out of [renderText(report(leaky), plain), renderJson(report(leaky), plain)]) {
      expect(out).not.toContain("hunter2");
      expect(out).not.toContain("0123456789abcdef");
      expect(out).not.toContain("abcdef123456");
    }
    expect(renderText(report(leaky), plain)).toContain(
      "postgres://postgres:…@localhost:15432/payload",
    );
  });
});
