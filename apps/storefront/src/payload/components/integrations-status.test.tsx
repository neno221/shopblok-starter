import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./integrations-status.css", () => ({}));

import { integrationRows, IntegrationsStatus } from "./integrations-status";

afterEach(() => vi.unstubAllEnvs());

describe("the integrations panel (D85)", () => {
  it("lists the eight integrations, whether their code is built, and the storefront's keys", () => {
    const rows = integrationRows({ NEXT_PUBLIC_STRIPE_KEY: "pk_test_123" });
    expect(rows.map((row) => row.id)).toEqual([
      "stripe",
      "resend",
      "posthog",
      "sentry",
      "meilisearch",
      "redis",
      "r2",
      "turnstile",
    ]);
    // T100: Stripe's code is built.
    expect(rows.find((row) => row.id === "stripe")).toMatchObject({
      wired: true,
      storefront: { state: "configured" },
    });
    // T95: every M6 integration's code is built, R2's last; M7's Turnstile in T108.
    expect(rows.filter((row) => !row.wired).map((row) => [row.id, row.arrives])).toEqual([]);
    expect(rows.find((row) => row.id === "r2")?.arrives).toBeUndefined();
    expect(rows.find((row) => row.id === "turnstile")?.storefront).toEqual({
      state: "missing",
      keys: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
    });
    expect(rows.find((row) => row.id === "redis")).toMatchObject({
      wired: true,
      storefront: { state: "none" },
    });
    expect(rows.find((row) => row.id === "posthog")?.storefront).toEqual({
      state: "missing",
      keys: ["NEXT_PUBLIC_POSTHOG_KEY"],
    });
  });

  it("shows key names and never a value", () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_KEY", "pk_live_do_not_show");
    vi.stubEnv("RESEND_API_KEY", "re_do_not_show");
    const html = renderToStaticMarkup(<IntegrationsStatus />);
    expect(html).toContain("Stripe");
    expect(html).toContain("RESEND_FROM_EMAIL");
    expect(html).not.toContain("do_not_show");
  });
});
