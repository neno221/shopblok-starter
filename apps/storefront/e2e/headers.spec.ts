import type { APIResponse } from "@playwright/test";
import { appEnv, appEnvOrBlank } from "./support/app-env";
import { catalogHandles } from "./support/catalog";
import { expect, test } from "./support/csp";

// M7 D137, D138, D140 (T106): the headers on each route type of a production build (`next start`),
// as e2e-smoke runs it. Each route answers with D137's headers; the shop's pages, the routes under
// `/next` and the DS with exactly one policy header (`Content-Security-Policy`, or the report-only
// one under `CSP_MODE=report-only`), never both, never two; `/admin` and Payload's `/api` with none
// yet (T107's admin policy); `withPayload`'s client hints on `/admin` only; no HSTS without
// `DEPLOY_ENV=production`; Medusa without `X-Powered-By`. Then `/next/csp-report`'s answers.

const POLICY_HEADERS = ["content-security-policy", "content-security-policy-report-only"];

/** The policy header this build sends, from the same `CSP_MODE` the build read. */
const expectedPolicy =
  appEnvOrBlank("storefront", "CSP_MODE") === "report-only"
    ? "content-security-policy-report-only"
    : "content-security-policy";

const D137: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
  "reporting-endpoints": 'csp-endpoint="/next/csp-report"',
};

/** Every value of every header, by lower-case name, so a header sent twice shows twice. */
function all(response: APIResponse): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const { name, value } of response.headersArray()) {
    const key = name.toLowerCase();
    out.set(key, [...(out.get(key) ?? []), value]);
  }
  return out;
}

let routes: { name: string; path: string; policy: boolean }[] = [];

test.beforeAll(async ({ request }) => {
  const [handle] = await catalogHandles();
  // A published CMS page at the top level, in English; the journal's index when there is none.
  const pages = await request.get(
    "/api/pages?where[_status][equals]=published&where[parent][exists]=false&locale=en&limit=1&depth=0",
  );
  const slug = pages.ok()
    ? ((await pages.json()) as { docs: { slug?: string }[] }).docs[0]?.slug
    : undefined;
  routes = [
    { name: "home", path: "/", policy: true },
    { name: "a market's home", path: "/us", policy: true },
    { name: "a product page", path: `/us/products/${handle}`, policy: true },
    { name: "a listing", path: "/us/store", policy: true },
    { name: "a CMS page", path: slug ? `/us/${slug}` : "/us/journal", policy: true },
    { name: "search", path: "/us/search?q=shirt", policy: true },
    { name: "a 404", path: "/us/no-such-page-t106", policy: true },
    { name: "the DS", path: "/design-system/en", policy: true },
    { name: "/next/status", path: "/next/status", policy: true },
    { name: "Payload's /api", path: "/api/pages?limit=1&depth=0", policy: false },
    { name: "/admin", path: "/admin", policy: false },
  ];
});

test("every route type has D137's headers and exactly one policy header, or none on Payload's", async ({
  request,
}) => {
  for (const route of routes) {
    const response = await request.get(route.path, { maxRedirects: 0 });
    const headers = all(response);
    for (const [name, value] of Object.entries(D137)) {
      expect(headers.get(name), `${route.name}: ${name}`).toEqual([value]);
    }
    const permissions = headers.get("permissions-policy") ?? [];
    expect(permissions, `${route.name}: Permissions-Policy`).toHaveLength(1);
    expect(permissions[0]).toContain("camera=()");
    expect(permissions[0]).toContain('payment=(self "https://js.stripe.com"');
    expect(headers.has("x-powered-by"), `${route.name}: X-Powered-By`).toBe(false);

    const policies = POLICY_HEADERS.flatMap((name) =>
      (headers.get(name) ?? []).map((value) => ({ name, value })),
    );
    if (!route.policy) {
      expect(policies, `${route.name}: no policy before T107`).toEqual([]);
      continue;
    }
    expect(
      policies.map((p) => p.name),
      `${route.name}: exactly one policy header`,
    ).toEqual([expectedPolicy]);
    const policy = policies[0]!.value;
    expect(policy, route.name).toContain("default-src 'self'");
    expect(policy, route.name).toContain("object-src 'none'");
    expect(policy, route.name).toContain("frame-ancestors 'self'");
    expect(policy, route.name).toContain("report-uri /next/csp-report");
    expect(policy, route.name).toContain("report-to csp-endpoint");
    // A production build: React's eval is for `next dev` only.
    expect(policy, route.name).not.toContain("'unsafe-eval'");
  }
});

test("the policy is the same string wherever it is sent (one table, one build)", async ({
  request,
}) => {
  const values = new Set<string>();
  for (const route of routes.filter((r) => r.policy)) {
    const response = await request.get(route.path, { maxRedirects: 0 });
    values.add(response.headers()[expectedPolicy] ?? "");
  }
  expect([...values]).toHaveLength(1);
});

test("withPayload's client hints are on /admin only", async ({ request }) => {
  for (const route of routes) {
    const headers = all(await request.get(route.path, { maxRedirects: 0 }));
    const vary = (headers.get("vary") ?? []).join(", ").toLowerCase();
    if (route.path === "/admin") {
      expect(headers.get("accept-ch"), "/admin: Accept-CH").toEqual([
        "Sec-CH-Prefers-Color-Scheme",
      ]);
      expect(headers.get("critical-ch"), "/admin: Critical-CH").toEqual([
        "Sec-CH-Prefers-Color-Scheme",
      ]);
      continue;
    }
    expect(headers.has("accept-ch"), `${route.name}: Accept-CH`).toBe(false);
    expect(headers.has("critical-ch"), `${route.name}: Critical-CH`).toBe(false);
    expect(vary, `${route.name}: Vary`).not.toContain("sec-ch-prefers-color-scheme");
  }
});

test("no HSTS without DEPLOY_ENV=production", async ({ request }) => {
  test.skip(
    appEnvOrBlank("storefront", "DEPLOY_ENV") === "production",
    "this build is the production deployment's",
  );
  for (const route of routes) {
    const headers = all(await request.get(route.path, { maxRedirects: 0 }));
    expect(headers.has("strict-transport-security"), route.name).toBe(false);
  }
});

test("Medusa's /store/products has nosniff and no X-Powered-By", async () => {
  const backend = appEnvOrBlank("storefront", "MEDUSA_BACKEND_URL") || "http://localhost:9000";
  const response = await fetch(`${backend}/store/products?limit=1`, {
    headers: {
      "x-publishable-api-key": appEnv("storefront", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"),
    },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("x-powered-by")).toBeNull();
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
});

const report = (documentUri: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    "csp-report": {
      "document-uri": documentUri,
      "effective-directive": "script-src-elem",
      "violated-directive": "script-src-elem",
      "blocked-uri": "https://example.com/x.js",
      "original-policy": "default-src 'self'",
      disposition: "enforce",
      "status-code": 200,
      ...extra,
    },
  });

test("/next/csp-report takes both formats and refuses what it should", async ({ request }) => {
  const url = "/next/csp-report";
  const stamp = Date.now().toString(36);
  const legacy = await request.post(url, {
    headers: { "content-type": "application/csp-report" },
    data: report(`http://localhost:8000/us?t106=${stamp}`),
  });
  expect(legacy.status()).toBe(204);
  const reportingApi = await request.post(url, {
    headers: { "content-type": "application/reports+json" },
    data: JSON.stringify([
      {
        type: "csp-violation",
        url: "http://localhost:8000/us",
        body: {
          documentURL: `http://localhost:8000/us/store?t106=${stamp}`,
          blockedURL: "inline",
          effectiveDirective: "script-src-elem",
          disposition: "enforce",
          statusCode: 200,
        },
      },
    ]),
  });
  expect(reportingApi.status()).toBe(204);
  const tooBig = await request.post(url, {
    headers: { "content-type": "application/csp-report" },
    data: report("http://localhost:8000/us", { "script-sample": "x".repeat(9 * 1024) }),
  });
  expect(tooBig.status(), "a 9 KB report").toBe(413);
  const wrongType = await request.post(url, {
    headers: { "content-type": "application/json" },
    data: report("http://localhost:8000/us"),
  });
  expect(wrongType.status()).toBe(415);
  const notAReport = await request.post(url, {
    headers: { "content-type": "application/csp-report" },
    data: "{}",
  });
  expect(notAReport.status()).toBe(400);
  // Answers with D137's headers and the policy, as every route under `/next` does.
  expect(all(legacy).get(expectedPolicy)).toHaveLength(1);
});

test("a script a page adds from a foreign host is blocked and fails the CSP fixture", async ({
  page,
}) => {
  // The fixture's own check (T106's mutation 2): the violation must be seen. `test.fail` turns the
  // fixture's failure at the end of the test into the expected outcome.
  test.fail(true, "the fixture fails this test on the violation it provokes");
  await page.goto("/us");
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.src = "https://example.com/x.js";
    document.head.append(script);
  });
  await page.waitForTimeout(500);
});
