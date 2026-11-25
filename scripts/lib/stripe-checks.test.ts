import { describe, expect, it } from "vitest";
import type { HttpResult } from "./http.ts";
import {
  domainPlan,
  normalizeDomain,
  siteDomains,
  stripeDomainsCheck,
  stripeKeyCheck,
  stripeMode,
  stripeModesCheck,
  stripeRegionsCheck,
  stripeWebhookCheck,
  WEBHOOK_EVENTS,
} from "./stripe-checks.ts";

const json = (status: number, body: unknown): HttpResult => ({
  kind: "response",
  status,
  text: JSON.stringify(body),
});

describe("the keys (T100)", () => {
  it("knows a key's mode by its prefix", () => {
    expect(stripeMode("sk_test_abc")).toBe("test");
    expect(stripeMode(" rk_live_abc")).toBe("live");
    expect(stripeMode("pk_test_abc")).toBe("test");
    expect(stripeMode("whsec_abc")).toBeUndefined();
    expect(stripeMode(undefined)).toBeUndefined();
  });

  it("refuses a secret and a publishable key of different modes, and names no key", () => {
    expect(stripeModesCheck("sk_test_a", "pk_test_b")).toBeUndefined();
    expect(stripeModesCheck("sk_test_a", undefined)).toBeUndefined();
    const check = stripeModesCheck("sk_live_secretvalue", "pk_test_b");
    expect(check?.level).toBe("error");
    expect(JSON.stringify(check)).not.toContain("secretvalue");
  });

  it("reads Stripe's answer to the account request", () => {
    expect(stripeKeyCheck(json(200, { country: "cy" })).level).toBe("ok");
    expect(stripeKeyCheck(json(200, { country: "cy" })).message).toContain("CY");
    expect(stripeKeyCheck(json(401, {})).level).toBe("error");
    expect(stripeKeyCheck({ kind: "unreachable", reason: "timeout" }).level).toBe("warn");
  });
});

describe("the regions (D117)", () => {
  const regions = [
    { name: "Europe", providers: ["pp_stripe_stripe", "pp_system_default"] },
    { name: "United States", providers: ["pp_system_default"] },
  ];

  it("wants Stripe on every region while its keys are set", () => {
    const check = stripeRegionsCheck(regions, true);
    expect(check.level).toBe("error");
    expect(check.details).toEqual(["United States"]);
    expect(stripeRegionsCheck([regions[0]!], true).level).toBe("ok");
  });

  it("wants it on none without them (the two-way sync)", () => {
    expect(stripeRegionsCheck(regions, false).details).toEqual(["Europe"]);
    expect(stripeRegionsCheck([regions[1]!], false).level).toBe("ok");
  });

  it("says a region it could not read, without failing", () => {
    expect(stripeRegionsCheck([{ name: "Europe", providers: undefined }], true).level).toBe("warn");
  });
});

describe("the webhook endpoint (production)", () => {
  const url = "https://api.example.com/hooks/payment/stripe_stripe";
  const endpoint = (extra: Record<string, unknown>) =>
    json(200, { data: [{ url, status: "enabled", enabled_events: [...WEBHOOK_EVENTS], ...extra }] });

  it("passes an enabled endpoint at the backend with the four events, or all events", () => {
    expect(stripeWebhookCheck(endpoint({}), "https://api.example.com/").level).toBe("ok");
    expect(stripeWebhookCheck(endpoint({ enabled_events: ["*"] }), "https://api.example.com").level).toBe("ok");
  });

  it("fails a missing, disabled or short endpoint", () => {
    expect(stripeWebhookCheck(json(200, { data: [] }), "https://api.example.com").level).toBe("error");
    expect(stripeWebhookCheck(endpoint({ status: "disabled" }), "https://api.example.com").level).toBe("error");
    expect(
      stripeWebhookCheck(endpoint({ enabled_events: [WEBHOOK_EVENTS[0]] }), "https://api.example.com").level,
    ).toBe("error");
    expect(stripeWebhookCheck(endpoint({}), "https://other.example.com").level).toBe("error");
  });
});

describe("the payment method domains", () => {
  it("takes the storefront's host and the open countries' own domains, each once", () => {
    expect(
      siteDomains("https://Shop.example.com/", {
        countries: [
          { enabled: true, domain: "shop.example.de" },
          { enabled: true, domain: "https://SHOP.example.com" },
          { enabled: false, domain: "closed.example.fr" },
          { enabled: true, domain: null },
        ],
      }),
    ).toEqual(["shop.example.com", "shop.example.de"]);
  });

  it("leaves out what Stripe cannot register", () => {
    expect(siteDomains("http://localhost:8000", undefined)).toEqual([]);
    expect(siteDomains("http://127.0.0.1:8000", undefined)).toEqual([]);
    expect(normalizeDomain("shop.example.com.")).toBe("shop.example.com");
  });

  it("plans what to register and what to enable", () => {
    const plan = domainPlan(
      ["a.example.com", "b.example.com", "c.example.com"],
      [
        { id: "pmd_1", domain: "a.example.com", enabled: true },
        { id: "pmd_2", domain: "b.example.com", enabled: false },
      ],
    );
    expect(plan).toEqual({
      ready: ["a.example.com"],
      enable: [{ id: "pmd_2", domain: "b.example.com", enabled: false }],
      add: ["c.example.com"],
    });
  });

  it("fails while a domain is missing or disabled", () => {
    const answer = json(200, {
      data: [{ id: "pmd_1", domain_name: "a.example.com", enabled: true }],
    });
    expect(stripeDomainsCheck(["a.example.com"], answer).level).toBe("ok");
    const check = stripeDomainsCheck(["a.example.com", "b.example.com"], answer);
    expect(check.level).toBe("error");
    expect(check.details).toEqual(["b.example.com: not registered"]);
    expect(stripeDomainsCheck([], answer).level).toBe("warn");
  });
});
