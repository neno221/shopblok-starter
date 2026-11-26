import { describe, expect, it } from "vitest";
import {
  RecentViolations,
  logLine,
  parseCspReport,
  sentrySecurityUrl,
  stripUrl,
  violationKey,
} from "./csp-report";

export const LEGACY = {
  "csp-report": {
    "document-uri": "https://shop.example.com/us/account/reset?token=abc#top",
    referrer: "https://mail.example.com/inbox?id=42",
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "original-policy": "default-src 'self'; report-uri /next/csp-report",
    disposition: "enforce",
    "blocked-uri": "https://evil.example.com/x.js?session=s3cret",
    "line-number": 12,
    "column-number": 7,
    "source-file": "https://shop.example.com/_next/static/chunks/a.js?v=1",
    "status-code": 200,
    "script-sample": "",
  },
};

export const REPORTING_API = [
  {
    type: "csp-violation",
    age: 10,
    url: "https://shop.example.com/us?code=123",
    user_agent: "Mozilla/5.0",
    body: {
      documentURL: "https://shop.example.com/us?code=123",
      referrer: "",
      blockedURL: "inline",
      effectiveDirective: "script-src-elem",
      originalPolicy: "default-src 'self'",
      sourceFile: "https://shop.example.com/us?code=123",
      sample: "alert(1)",
      disposition: "report",
      statusCode: 200,
      lineNumber: 3,
      columnNumber: 1,
    },
  },
  { type: "deprecation", url: "https://shop.example.com/", body: { id: "x" } },
];

describe("stripUrl", () => {
  it("drops the query string and the fragment", () => {
    expect(stripUrl("https://a.example.com/p?token=abc#f")).toBe("https://a.example.com/p");
    expect(stripUrl("https://a.example.com/p#f")).toBe("https://a.example.com/p");
    expect(stripUrl("/us/account?token=abc")).toBe("/us/account");
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
