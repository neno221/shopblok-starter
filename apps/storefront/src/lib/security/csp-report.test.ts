import { describe, expect, it } from "vitest";
import {
  CSP_REPORT_BATCH_MAX_ENTRIES,
  ForwardBudget,
  RecentViolations,
  capFor,
  logLine,
  parseCspReport,
  sentrySecurityUrl,
  stripUrl,
  violationKey,
} from "./csp-report";
import { LEGACY, REPORTING_API } from "./csp-report.fixtures";

describe("stripUrl", () => {
  it("drops the query string and the fragment", () => {
    expect(stripUrl("https://a.example.com/p?token=abc#f")).toBe("https://a.example.com/p");
    expect(stripUrl("https://a.example.com/p#f")).toBe("https://a.example.com/p");
    expect(stripUrl("/us/account?token=abc")).toBe("/us/account");
  });

  it("replaces the order transfer link's id and token, in every market (PR 148's review)", () => {
    expect(stripUrl("https://shop.example.com/us/order/order_1/transfer/s3cret?x=1")).toBe(
      "https://shop.example.com/us/order/[id]/transfer/[token]",
    );
    expect(stripUrl("https://shop.example.com/order/order_1/transfer/s3cret/")).toBe(
      "https://shop.example.com/order/[id]/transfer/[token]/",
    );
    expect(stripUrl("/ch/fr/order/order_1/transfer/s3cret")).toBe(
      "/ch/fr/order/[id]/transfer/[token]",
    );
    // Only the transfer link is redacted; another order path keeps its id.
    expect(stripUrl("https://shop.example.com/us/order/order_1/confirmed")).toBe(
      "https://shop.example.com/us/order/order_1/confirmed",
    );
  });

  it("keeps the keywords browsers send in place of a URL", () => {
    for (const keyword of ["inline", "eval", "self", "data", "blob", "wasm-eval", ""]) {
      expect(stripUrl(keyword)).toBe(keyword);
    }
  });
});

describe("parseCspReport", () => {
  it("reads report-uri's format, with every URL stripped", () => {
    const [violation, ...rest] = parseCspReport("application/csp-report", JSON.stringify(LEGACY))!;
    expect(rest).toEqual([]);
    expect(violation).toEqual({
      "document-uri": "https://shop.example.com/us/account/reset",
      referrer: "https://mail.example.com/inbox",
      "blocked-uri": "https://evil.example.com/x.js",
      "effective-directive": "script-src-elem",
      "violated-directive": "script-src-elem",
      "original-policy": "default-src 'self'; report-uri /next/csp-report",
      disposition: "enforce",
      "status-code": 200,
      "source-file": "https://shop.example.com/_next/static/chunks/a.js",
      "line-number": 12,
      "column-number": 7,
    });
    expect(JSON.stringify(violation)).not.toMatch(/token|abc|session|s3cret|id=42|v=1/);
  });

  it("reads the Reporting API's format and leaves out the other report types", () => {
    const violations = parseCspReport("application/reports+json", JSON.stringify(REPORTING_API))!;
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      "document-uri": "https://shop.example.com/us",
      "blocked-uri": "inline",
      "effective-directive": "script-src-elem",
      disposition: "report",
      "source-file": "https://shop.example.com/us",
      "script-sample": "alert(1)",
    });
    expect(JSON.stringify(violations)).not.toContain("code=123");
  });

  it("answers undefined for a body that is not a report", () => {
    expect(parseCspReport("application/csp-report", "not json")).toBeUndefined();
    expect(parseCspReport("application/csp-report", "[]")).toBeUndefined();
    expect(parseCspReport("application/csp-report", '{"csp-report": {}}')).toBeUndefined();
    expect(parseCspReport("application/reports+json", "{}")).toBeUndefined();
    expect(parseCspReport("application/reports+json", "[]")).toEqual([]);
  });
});

describe("RecentViolations (D140: a duplicate within a minute is dropped)", () => {
  const violation = parseCspReport("application/csp-report", JSON.stringify(LEGACY))![0]!;
  const key = violationKey(violation);

  it("admits a violation once a minute", () => {
    const recent = new RecentViolations();
    expect(recent.admit(key, 0)).toBe(true);
    expect(recent.admit(key, 59_999)).toBe(false);
    expect(recent.admit(key, 60_000)).toBe(true);
    expect(recent.admit(key, 60_001)).toBe(false);
  });

  it("tells violations apart by page, blocked URL and directive, not by query string", () => {
    const recent = new RecentViolations();
    expect(recent.admit(key, 0)).toBe(true);
    const other = { ...violation, "blocked-uri": "https://other.example.com/y.js" };
    expect(recent.admit(violationKey(other), 1)).toBe(true);
    const sameButQuery = parseCspReport(
      "application/csp-report",
      JSON.stringify({
        "csp-report": {
          ...LEGACY["csp-report"],
          "document-uri": "https://shop.example.com/us/account/reset?token=zzz",
        },
      }),
    )![0]!;
    expect(recent.admit(violationKey(sameButQuery), 2)).toBe(false);
  });

  it("keeps at most its limit of keys", () => {
    const recent = new RecentViolations(60_000, 2);
    expect(recent.admit("a", 0)).toBe(true);
    expect(recent.admit("b", 1)).toBe(true);
    expect(recent.admit("c", 2)).toBe(true);
    expect(recent.admit("a", 3)).toBe(true);
    expect(recent.admit("c", 4)).toBe(false);
  });
});

describe("sentrySecurityUrl", () => {
  it("is the DSN project's security endpoint with the key in the query", () => {
    expect(sentrySecurityUrl("https://abc123@o1.ingest.de.sentry.io/4507")).toBe(
      "https://o1.ingest.de.sentry.io/api/4507/security/?sentry_key=abc123",
    );
  });

  it("keeps a self-hosted path prefix and the port, and adds the environment and release", () => {
    expect(
      sentrySecurityUrl("http://e2esink@127.0.0.1:8970/sentry/1", {
        environment: "staging",
        release: "abc",
      }),
    ).toBe(
      "http://127.0.0.1:8970/sentry/api/1/security/?sentry_key=e2esink&sentry_environment=staging&sentry_release=abc",
    );
  });

  it("is undefined without a usable DSN", () => {
    expect(sentrySecurityUrl(undefined)).toBeUndefined();
    expect(sentrySecurityUrl("")).toBeUndefined();
    expect(sentrySecurityUrl("not a dsn")).toBeUndefined();
    expect(sentrySecurityUrl("https://o1.ingest.sentry.io/1")).toBeUndefined();
    expect(sentrySecurityUrl("https://key@o1.ingest.sentry.io/")).toBeUndefined();
  });
});

describe("logLine", () => {
  it("says what was blocked where, in one line without the query", () => {
    const violation = parseCspReport("application/csp-report", JSON.stringify(LEGACY))![0]!;
    expect(logLine(violation)).toBe(
      "csp-report: enforce script-src-elem blocked https://evil.example.com/x.js on https://shop.example.com/us/account/reset",
    );
  });
});

describe("the batch's limits (PR 148's review, item 2)", () => {
  it("caps a batch at 64 KB and one report at 8 KB", () => {
    expect(capFor("application/reports+json")).toBe(64 * 1024);
    expect(capFor("application/csp-report")).toBe(8 * 1024);
  });

  it("reads at most 20 entries of a batch", () => {
    const batch = Array.from({ length: 30 }, (_, n) => ({
      ...REPORTING_API[0],
      body: { ...REPORTING_API[0]!.body, blockedURL: `https://evil.example.com/${n}.js` },
    }));
    expect(parseCspReport("application/reports+json", JSON.stringify(batch))).toHaveLength(
      CSP_REPORT_BATCH_MAX_ENTRIES,
    );
  });
});

describe("ForwardBudget", () => {
  it("allows the budget per window, refuses past it, and says so once", () => {
    const budget = new ForwardBudget(2, 60_000);
    expect(budget.take(0)).toEqual({ ok: true, firstRefusal: false });
    expect(budget.take(1)).toEqual({ ok: true, firstRefusal: false });
    expect(budget.take(2)).toEqual({ ok: false, firstRefusal: true });
    expect(budget.take(3)).toEqual({ ok: false, firstRefusal: false });
    expect(budget.take(60_000)).toEqual({ ok: true, firstRefusal: false });
  });
});
